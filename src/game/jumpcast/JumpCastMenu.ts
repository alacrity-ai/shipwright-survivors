// src/game/jumpcast/JumpCastMenu.ts
/*  ⭑  Fast-Travel overlay powered by the JumpCast Network  ⭑  */

import { DEFAULT_CONFIG } from '@/config/ui';

import { CanvasManager } from '@/core/CanvasManager';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { isMouseOverRect } from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor } from '@/config/view';

import { getWorldWidth, getWorldHeight } from '@/config/world';

import type { NavPoint } from '@/core/input/interfaces/NavMap';
import { GamepadMenuInteractionManager } from '@/core/input/GamepadMenuInteractionManager';
import { audioManager } from '@/audio/Audio';

import { getDiscoveredPlanetsInMission } from '@/game/missions/MissionRegistry';
import { missionLoader } from '@/game/missions/MissionLoader';

import { GlobalEventBus } from '@/core/EventBus';
import { GlobalMenuReporter } from '@/core/GlobalMenuReporter';
import { pauseRuntime, resumeRuntime } from '@/core/interfaces/events/RuntimeReporter';

import type { InputManager } from '@/core/InputManager';
import type { PlanetSystem } from '@/game/planets/PlanetSystem';
import type { JumpCastTransitionController } from './JumpCastTransitionController';

const PLANET_ICON_MIN_PX = 12;

// Animation constants
const SLIDE_DURATION = 0.3; // seconds
const SLIDE_EASE_POWER = 3; // for easeOut cubic

enum MenuState {
  CLOSED = 'closed',
  SLIDING_IN = 'sliding_in',
  OPEN = 'open'
}

type PlanetT = ReturnType<PlanetSystem['getPlanets']>[number];

export class JumpCastMenu {
  // ────────────────────────── dependencies ──────────────────────────
  private readonly input: InputManager;
  private readonly planets: PlanetSystem;
  private readonly transition: JumpCastTransitionController;
  private readonly nav: GamepadMenuInteractionManager;

  private readonly canvasMgr = CanvasManager.getInstance();
  private readonly ctx       = this.canvasMgr.getContext('ui');

  // ────────────────────────── state ──────────────────────────
  private state: MenuState = MenuState.CLOSED;
  private slideTimer = 0;
  private hoveredPlanet: { x: number; y: number } | null = null;

  // Planets
  private discoveredPlanets: Set<string> = new Set();

  // Window geometry (scaled in resize)
  private windowX = 0;
  private windowY = 0;
  private windowW = 640;
  private windowH = 480;
  private finalWindowY = 0; // Target Y position when fully slid in

  // World geometry (fixed)
  private readonly worldW = getWorldWidth();
  private readonly worldH = getWorldHeight();

  // Cancel button
  private readonly cancelBtn: UIButton;

  constructor(
    inputManager: InputManager,
    planetSystem: PlanetSystem,
    transitionController: JumpCastTransitionController,
  ) {
    this.input      = inputManager;
    this.planets    = planetSystem;
    this.transition = transitionController;
    this.nav        = new GamepadMenuInteractionManager(this.input);

    this.cancelBtn = {
      x: 0, y: 0, width: 200, height: 48,
      label: 'Cancel',
      isHovered: false,
      wasHovered: false,
      // onClick: () => this.closeMenu(),
      onClick: () => {
        this.closeMenu();
      },
      style: { textFont: `${13 * getUniformScaleFactor()}px monospace` },
      ...DEFAULT_CONFIG.button.style,
    };

    GlobalEventBus.on('jumpcast:menu:open', () => this.openMenu());
  }

  // ────────────────────────── public api ──────────────────────────
  openMenu(): void {
    if (this.state !== MenuState.CLOSED) return;

    /* 1. ─────────── cache discovery state ─────────── */
    try {
      const missionId   = missionLoader.getMission().id;
      const discovered  = getDiscoveredPlanetsInMission(missionId);

      // normalise to lowercase for robust matching
      this.discoveredPlanets = new Set(discovered.map(n => n.toLowerCase()));
    } catch (err) {
      console.warn('[JumpCastMenu] Unable to resolve mission / discovered planets:', err);
      this.discoveredPlanets.clear();
    }

    /* 2. ─────────── normal menu‑startup logic ─────────── */
    pauseRuntime();

    this.state         = MenuState.SLIDING_IN;
    this.slideTimer    = 0;
    this.hoveredPlanet = null;
    this.resize();

    // Start window just above the viewport so it can slide down
    this.windowY = -this.windowH - 50;

    GlobalMenuReporter.getInstance().setMenuOpen('jumpCastMenu');
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
  }

  isOpen(): boolean { 
    return this.state === MenuState.OPEN || this.state === MenuState.SLIDING_IN; 
  }

  closeMenu(): void {
    if (this.state === MenuState.CLOSED) return;

    resumeRuntime();
    this.state = MenuState.CLOSED;
    this.slideTimer = 0;
    this.hoveredPlanet = null;
    this.nav.clearNavMap();

    GlobalMenuReporter.getInstance().setMenuClosed('jumpCastMenu');
  }

  destroy(): void {
    GlobalEventBus.off('jumpcast:menu:open', () => this.openMenu());
  }

  // ────────────────────────── frame loop ──────────────────────────
  update(dt: number): void {
    if (this.state === MenuState.CLOSED) return;

    // Handle slide-in animation
    if (this.state === MenuState.SLIDING_IN) {
      this.slideTimer += dt;
      
      if (this.slideTimer >= SLIDE_DURATION) {
        // Animation complete
        this.state = MenuState.OPEN;
        this.slideTimer = 0;
        this.windowY = this.finalWindowY;
        this.computeNavMap(); // Only compute nav map when fully open
      } else {
        // Ease-out cubic interpolation
        const progress = this.slideTimer / SLIDE_DURATION;
        const eased = 1 - Math.pow(1 - progress, SLIDE_EASE_POWER);
        
        // Interpolate from starting position to final position
        const startY = -this.windowH - 50;
        this.windowY = startY + (this.finalWindowY - startY) * eased;
      }
      
      // Don't process input during slide-in
      return;
    }

    /* Only process input when fully open */
    const mouse   = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();

    this.nav.update();

    // ── Hover logic ──
    const { x: mx, y: my } = mouse ?? { x: -1, y: -1 };
    this.hoveredPlanet = this.hitTestPlanet(mx, my);

    // ── Cancel button ──
    const cancelRect = { x: this.cancelBtn.x, y: this.cancelBtn.y,
                        width: this.cancelBtn.width, height: this.cancelBtn.height };
    this.cancelBtn.isHovered = isMouseOverRect(mx, my, cancelRect, 1.0);
    if (clicked && this.cancelBtn.isHovered) this.cancelBtn.onClick();

    // ── Planet selection ──
    if (clicked) {
      const planet = this.planetAtPos(mx, my);          // ← returns Planet | null
      if (planet && this.discoveredPlanets.has(planet.getName().toLowerCase())) {
        const pos = planet.getPosition();
        const accepted = this.transition.initiateJump({ x: pos.x, y: pos.y });
        if (accepted) this.closeMenu();
      } else {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 4 });
      }
    }

    if (this.input.wasActionJustPressed('cancel') || this.input.wasKeyJustPressed('Escape')) {
      this.closeMenu();
    }
  }

  /** Returns the planet instance whose icon is under (mx,my) or null */
  private planetAtPos(mx: number, my: number): PlanetT | null {
    const hit = this.hitTestPlanet(mx, my);
    if (!hit) return null;

    return this.planets.getPlanets().find(p => {
      const pos = p.getPosition();
      return Math.abs(pos.x - hit.x) < 1 && Math.abs(pos.y - hit.y) < 1;
    }) ?? null;
  }

  render(): void {
    if (this.state === MenuState.CLOSED) return;

    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    // Always draw the window (even during slide-in)
    drawMinimalistWindow(
      ctx, this.windowX, this.windowY, this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.9 },
    );

    // Only draw content when fully open
    if (this.state === MenuState.OPEN) {
      // ─ Title
      drawLabel(
        ctx,
        this.windowX + this.windowW / 2,
        this.windowY - 32 * scale,
        'JumpCast Network',
        { font: `${18 * scale}px monospace`, align: 'center', glow: true },
      );

      // ─ Planet icons
      this.drawPlanets(ctx, p => this.worldToMenuSpace(p));

      // ─ Cancel button
      drawButton(ctx, this.cancelBtn, 1.0, 13 * scale);
    }
  }

  // ────────────────────────── layout helpers ──────────────────────────
  private resize(): void {
    const s            = getUniformScaleFactor();
    const vpW          = this.canvasMgr.getCanvas('ui').width;
    const vpH          = this.canvasMgr.getCanvas('ui').height;

    this.windowW = 420 * s;
    this.windowH = 420 * s;
    this.windowX = (vpW - this.windowW) / 2;
    this.finalWindowY = (vpH - this.windowH) / 2 - 30 * s;

    // Cancel button at bottom-center
    this.cancelBtn.width  = 140 * s;
    this.cancelBtn.height = 48  * s;
    this.cancelBtn.x = this.windowX + (this.windowW - this.cancelBtn.width) / 2;
    this.cancelBtn.y = this.finalWindowY + this.windowH - this.cancelBtn.height + 64 * s;
  }

  private computeNavMap(): void {
    const navItems: NavPoint[] = [];
    
    // Add planets to nav map
    const planets = this.planets.getPlanets();
    planets.forEach((planet) => {
      const pos = planet.getPosition();
      const screenPos = this.worldToMenuSpace(pos);
      
      // Convert world position to grid coordinates
      // World center (0,0) should map to grid center (2,2)
      const gridX = Math.round(((pos.x + this.worldW * 0.5) / this.worldW) * 5);
      const gridY = Math.round(((pos.y + this.worldH * 0.5) / this.worldH) * 5);
      
      // Clamp to valid grid range [0,5]
      const clampedGridX = Math.max(0, Math.min(5, gridX));
      const clampedGridY = Math.max(0, Math.min(5, gridY));
      
      navItems.push({
        gridX: clampedGridX,
        gridY: clampedGridY,
        screenX: screenPos.x,
        screenY: screenPos.y,
        isEnabled: true,
      });
    });

    this.nav.clearNavMap();
    if (navItems.length > 0) {
      this.nav.setNavMap(navItems);
    }
  }

  // == Rendering
  private drawPlanets(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number },
  ): void {
    const windowInnerW = this.windowW - 40 * getUniformScaleFactor();
    const g            = getUniformScaleFactor();

    for (const planet of this.planets.getPlanets()) {
      const name   = planet.getName().toLowerCase();
      const pos    = planet.getPosition();
      const screen = project(pos);

      /* radius scaling identical to prior implementation */
      const base      = 256;
      const pxRadius0 = base * planet.getScale();
      let   pxRadius  = Math.max(
        PLANET_ICON_MIN_PX,
        (pxRadius0 / this.worldW) * windowInnerW * 1.5,
      );

      const isHovered = this.hoveredPlanet &&
        Math.abs(this.hoveredPlanet.x - pos.x) < 1 &&
        Math.abs(this.hoveredPlanet.y - pos.y) < 1;

      if (isHovered) pxRadius *= 1.25;

      /* ───────────── visual style by discovery state ───────────── */
      const discovered = this.discoveredPlanets.has(name);
      const baseColor  = discovered ? '#55ff55'   // bright‑green
                                    : '#0088cc';  // default blue

      ctx.save();
      ctx.translate(screen.x, screen.y);

      ctx.fillStyle   = isHovered ? '#00ffff' : baseColor;
      ctx.shadowColor = isHovered ? '#00ffff' : baseColor;
      ctx.shadowBlur  = isHovered ? 12 * g     : 6 * g;

      ctx.beginPath();
      ctx.arc(0, 0, pxRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }


  /** Convert world → menu pixel space (keeps square aspect). */
  private worldToMenuSpace({ x, y }: { x: number; y: number }): { x: number; y: number } {
    const padding   = 20 * getUniformScaleFactor();
    const innerSize = this.windowW - 2 * padding;          // square usable region

    // ─── shift by +½ world size so (0,0) → 0.5 ───
    const nx = (x + this.worldW * 0.5) / this.worldW;      // 0‥1
    const ny = (y + this.worldH * 0.5) / this.worldH;      // 0‥1

    return {
      x: this.windowX + padding + nx * innerSize,
      y: this.windowY + padding + ny * innerSize,
    };
  }

  /** Returns the planet the mouse is hovering, or null. */
  private hitTestPlanet(mx: number, my: number): { x: number; y: number } | null {
    const s           = getUniformScaleFactor();
    const padding     = 20 * s;
    const innerSize   = this.windowW - 2 * padding;
    const mousePt     = { x: mx, y: my };

    /** Extra slack around each icon, expressed as a multiple of its on-screen radius. */
    const RADIUS_EXPANSION = 1.5; // tweak to taste

    for (const planet of this.planets.getPlanets()) {
      // ─── project to menu space ───
      const worldPos = planet.getPosition();
      const screen   = this.worldToMenuSpace(worldPos);

      // pixel radius identical to drawPlanets()
      const basePx   = 256 * planet.getScale(); // world radius @1:1
      const pxRadius = Math.max(
        PLANET_ICON_MIN_PX,
        (basePx / this.worldW) * innerSize,
      );

      const dx = mousePt.x - screen.x;
      const dy = mousePt.y - screen.y;

      if (dx * dx + dy * dy <= (pxRadius * RADIUS_EXPANSION) ** 2) {
        return worldPos;
      }
    }
    return null;
  }
}