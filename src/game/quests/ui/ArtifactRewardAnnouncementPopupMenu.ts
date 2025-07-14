// src/ui/menus/ArtifactRewardAnnouncementPopupMenu.ts
// ────────────────────────────────────────────────────────────────────────────
//  ArtifactRewardAnnouncementPopupMenu
//  • PRELOADING → (slot-canvas render) ⟶ ENTERING → CORRECTING → DISPLAYING
//    → EXITING → CLOSED.
//
//  Visually congruent with the other reward pop-ups, but the artefact sprite
//  is rendered through drawArtifactSlot so it automatically picks up tier
//  colouring and hover/selection styling.
// ────────────────────────────────────────────────────────────────────────────

import { CanvasManager }            from '@/core/CanvasManager';
import { drawMinimalistWindow }     from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }                from '@/ui/primitives/UILabel';
import { getUniformScaleFactor }    from '@/config/view';
import { DEFAULT_CONFIG }           from '@/config/ui';

import { GlobalEventBus }           from '@/core/EventBus';
import { getArtifactById }          from '@/game/ship/artifacts/registry/ArtifactRegistry';
import { drawArtifactSlot }         from '@/game/ship/artifacts/ui/ArtifactSlotRenderer';

import { audioManager }             from '@/audio/Audio';

/* ─────────── Temporal constants (seconds) – Δt supplied in ms ─────────── */
const ENTER_DURATION      = 0.36;
const CORRECT_DURATION    = 0.18;
const DISPLAY_DURATION    = 2.0;
const EXIT_DURATION       = 0.36;

/* ─────────── Helper lambdas ─────────── */
const lerp    = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

/* ─────────── Finite-state machine ─────────── */
enum PopupPhase { PRELOADING, ENTERING, CORRECTING, DISPLAYING, EXITING, CLOSED }

export class ArtifactRewardAnnouncementPopupMenu {
  /* ——— Dependencies ——— */
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx           = this.canvasManager.getContext('dialogue');

  /* ——— State ——— */
  private phase: PopupPhase   = PopupPhase.CLOSED;
  private phaseElapsed        = 0;                   // ms within current phase

  private artifactId: string | null          = null;
  private artifactName                       = '';
  private artifactRarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' = 'common';
  /** Pre-rendered artefact slot canvas (128×128 logical, larger backing store). */
  private slotCanvas: HTMLCanvasElement | null = null;

  /* ——— Layout (scaled; recomputed on open / resize) ——— */
  private windowW = 260;
  private windowH = 260;
  private windowX = 0;
  private windowY = 0;

  /* ——— Event binding ——— */
  private readonly boundOpen = (p: { artifactId: string }) => this.openMenu(p.artifactId);

  constructor() {
    GlobalEventBus.on('quests:announcement:artifact', this.boundOpen);
  }

  /* ————————— Public API ————————— */
  openMenu(id: string): void {
    const def = getArtifactById(id);
    if (!def) {
      console.warn(`[ArtifactPopup] Unknown artifact id: ${id}`);
      return;
    }

    this.artifactId     = id;
    this.artifactName   = def.name;
    this.artifactRarity = def.rarity;
    this.slotCanvas     = null;                // rendered async
    this.phase          = PopupPhase.PRELOADING;
    this.phaseElapsed   = 0;
    this.resize();

    void this.preloadSlot(def.icon);

    audioManager.play('assets/sounds/sfx/ui/gamblewin_02.wav', 'sfx', { maxSimultaneous: 4 });
  }

  isOpen(): boolean { return this.phase !== PopupPhase.CLOSED; }

  destroy(): void {
    GlobalEventBus.off('quests:announcement:artifact', this.boundOpen);
  }

  /* ————————— Frame lifecycle ————————— */
  update(dt: number): void {
    if (this.phase === PopupPhase.CLOSED) return;
    if (this.phase === PopupPhase.PRELOADING)   return;   // dormant until slot ready

    this.phaseElapsed += dt;

    switch (this.phase) {
      case PopupPhase.ENTERING:
        if (this.phaseElapsed >= ENTER_DURATION)   this.transitionTo(PopupPhase.CORRECTING);
        break;
      case PopupPhase.CORRECTING:
        if (this.phaseElapsed >= CORRECT_DURATION) this.transitionTo(PopupPhase.DISPLAYING);
        break;
      case PopupPhase.DISPLAYING:
        if (this.phaseElapsed >= DISPLAY_DURATION) this.transitionTo(PopupPhase.EXITING);
        break;
      case PopupPhase.EXITING:
        if (this.phaseElapsed >= EXIT_DURATION)    this.transitionTo(PopupPhase.CLOSED);
        break;
    }
  }

  render(): void {
    if (
      this.phase === PopupPhase.CLOSED ||
      this.phase === PopupPhase.PRELOADING ||
      !this.slotCanvas
    ) return;

    /* —— Slide interpolation —— */
    const offscreen = -(this.windowY + this.windowH);
    const overshoot = 20 * getUniformScaleFactor();
    const rest      = 0;

    let dy = 0;
    switch (this.phase) {
      case PopupPhase.ENTERING:
        dy = lerp(offscreen, overshoot, easeOut(clamp01(this.phaseElapsed / ENTER_DURATION)));
        break;
      case PopupPhase.CORRECTING:
        dy = lerp(overshoot, rest, 1 - easeOut(1 - clamp01(this.phaseElapsed / CORRECT_DURATION)));
        break;
      case PopupPhase.EXITING:
        dy = lerp(rest, offscreen, easeOut(clamp01(this.phaseElapsed / EXIT_DURATION)));
        break;
      // DISPLAYING → dy = 0
    }

    const x     = this.windowX;
    const y     = this.windowY + dy;
    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    /* —— Window —— */
    drawMinimalistWindow(
      ctx, x, y,
      this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    /* —— Header —— */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y - 28 * scale,
      'Artifact Acquired!',
      { font: `${18 * scale}px monospace`, align: 'center', glow: true },
    );

    /* —— Artifact name —— */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y + 36 * scale,
      this.artifactName,
      { font: `${16 * scale}px monospace`, align: 'center', glow: false },
    );

    /* —— Slot canvas —— */
    const iconSize = 128 * scale;
    const iconX    = x + (this.windowW - iconSize) / 2;
    const iconY    = y + (this.windowH - iconSize) / 2 + 18 * scale;

    ctx.drawImage(this.slotCanvas, iconX, iconY, iconSize, iconSize);
  }

  /* ————————— Helpers ————————— */

  /** Pre-renders a slot canvas (256×256 backing store) using drawArtifactSlot. */
  private async preloadSlot(iconKey: string): Promise<void> {
    const offscreen = document.createElement('canvas');
    offscreen.width = offscreen.height = 256;        // generous for down-scaling
    const offCtx    = offscreen.getContext('2d')!;

    await drawArtifactSlot({
      ctx: offCtx,
      x:   0,
      y:   0,
      size: 256,
      rarity: this.artifactRarity,
      iconKey,
      isHovered: false,
      isSelected: true,     // brighter border, matches other pop-ups' style
      isEmpty: false,
    });

    this.slotCanvas = offscreen;
    if (this.phase === PopupPhase.PRELOADING) this.transitionTo(PopupPhase.ENTERING);
  }

  private transitionTo(next: PopupPhase): void {
    this.phase        = next;
    this.phaseElapsed = 0;

    if (next === PopupPhase.CLOSED) {
      this.slotCanvas     = null;
      this.artifactId     = null;
      this.artifactName   = '';
    }
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vp    = this.canvasManager.getCanvas('overlay');
    this.windowW = 260 * scale;
    this.windowH = 260 * scale;
    this.windowX = 20  * scale;
    this.windowY = (vp.height - this.windowH) / 2;
  }
}
