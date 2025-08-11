// src/game/passives/ui/PassiveTreeUIController.ts

import { CanvasManager } from '@/core/CanvasManager';
import type { InputManager } from '@/core/InputManager';
import { MouseWheelTracker } from '@/core/input/MouseWheelTracker';
import { getUniformScaleFactor } from '@/config/view';

import { PassiveTreeUIRenderer } from './PassiveTreeUIRenderer';
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';
import { PassiveTreeTooltipRenderer } from '@/game/passives/ui/PassiveTreeTooltipRenderer';
import { PassiveTreeBreakdownWindow } from '@/game/passives/ui/PassiveTreeBreakdownWindow';
import type { PassiveTree } from '@/game/passives/interfaces/PassiveTree';

import {
  buildAdjacency,
  computeReachableUnlocked,
  isUnlockEligibleByConnectivity,
  type Adjacency
} from '@/game/passives/runtime/passiveTreeConnectivity';

import { audioManager } from '@/audio/Audio';

import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { DEFAULT_CONFIG } from '@/config/ui';

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 1.10; // multiplicative
const GRID_SPACING = 64; // keep consistent with renderer

export class PassiveTreeUIController {
  private readonly cm: CanvasManager;
  private readonly input: InputManager;

  private readonly renderer: PassiveTreeUIRenderer;
  private readonly tooltipRenderer = new PassiveTreeTooltipRenderer();
  private readonly breakdownWindow: PassiveTreeBreakdownWindow;

  // Camera (world-space top-left + scalar zoom)
  private camX = 0;
  private camY = 0;
  private zoom = 1.0;

  // Dragging state
  private dragging = false;
  private dragStartMouseX = 0;
  private dragStartMouseY = 0;
  private dragStartCamX = 0;
  private dragStartCamY = 0;

  // Hover state
  private hoveredNodeId: string | null = null;

  // Data source
  private tree: PassiveTree | null = null;

  // Wheel
  private wheelTracker: MouseWheelTracker | null = null;

  // Connectivity caches
  private adjacency: Adjacency | null = null;
  private reachableUnlocked: Set<string> = new Set();
  private unlockedCountSnapshot = -1;

  // ⬇️ NEW: layout constants for the cores overlay (logical units; scaled at render)
  private readonly CORE_PAD_X = 12;
  private readonly CORE_PAD_Y = 8;
  private readonly CORE_MIN_W = 148;
  private readonly CORE_H     = 32;
  private readonly CORE_MARGIN_L = 12;  // from left screen edge
  private readonly CORE_MARGIN_B = 12;  // from bottom screen edge

  constructor(canvasManager: CanvasManager, inputManager: InputManager) {
    this.cm = canvasManager;
    this.input = inputManager;
    this.renderer = new PassiveTreeUIRenderer();
    this.breakdownWindow = new PassiveTreeBreakdownWindow(this.input);
  }

  public async initialize(): Promise<void> {
    const tree = PlayerGlobalPassiveManager.getInstance().getPassiveTree();
    if (!tree) {
      console.warn('[PassiveTreeUIController] No passive tree loaded.');
      return;
    }
    this.tree = tree;

    // Build adjacency once; deserializer has canonicalized connectedTo
    this.adjacency = buildAdjacency(tree);
    this.refreshReachability(); // seed cache

    // Set up wheel tracking scoped to the overlay canvas (prevents page scroll)
    const overlayCtx = this.cm.getContext('overlay');
    const scopeCanvas = overlayCtx.canvas;

    if (this.wheelTracker) this.wheelTracker.destroy();
    this.wheelTracker = new MouseWheelTracker(window, {
      pixelsPerTick: 100,
      preventDefault: true,
      scopeElement: scopeCanvas
    });
    this.wheelTracker.reset();

    // Center on root (or first node) at initial zoom
    const root = tree.squares.find(sq => sq.node.id === 'root-node') ?? tree.squares[0];
    if (root) {
      const wx = root.x * GRID_SPACING;
      const wy = root.y * GRID_SPACING;
      const { width, height } = overlayCtx.canvas;
      this.camX = wx - (width / this.zoom) * 0.5;
      this.camY = wy - (height / this.zoom) * 0.5;
    }
  }

  public destroy(): void {
    if (this.wheelTracker) {
      this.wheelTracker.destroy();
      this.wheelTracker = null;
    }
  }

  public isHoveringInteractive(): boolean {
    return !!this.hoveredNodeId || this.breakdownWindow.isCollapseButtonHovered;
  }

  public update(dtSeconds: number): void {
    if (!this.tree) return;

    const mouse = this.input.getMousePosition();

    // === RMB drag to pan ===
    const rmbDown = this.input.isMouseRightPressed();
    if (!this.dragging && rmbDown) {
      this.dragging = true;
      this.dragStartMouseX = mouse.x;
      this.dragStartMouseY = mouse.y;
      this.dragStartCamX = this.camX;
      this.dragStartCamY = this.camY;
    } else if (this.dragging && !rmbDown) {
      this.dragging = false;
    }

    if (this.dragging) {
      const dxScreen = mouse.x - this.dragStartMouseX;
      const dyScreen = mouse.y - this.dragStartMouseY;
      this.camX = this.dragStartCamX - dxScreen / this.zoom;
      this.camY = this.dragStartCamY - dyScreen / this.zoom;
    }

    // === Scroll wheel zoom (zoom-at-cursor anchoring) ===
    if (this.wheelTracker) {
      const signedTicks = this.wheelTracker.drainSignedTicks(); // + = zoom in, - = zoom out
      if (signedTicks !== 0) {
        const worldBefore = this.screenToWorld(mouse.x, mouse.y);

        const next = this.clamp(
          this.zoom * Math.pow(ZOOM_STEP, signedTicks),
          MIN_ZOOM,
          MAX_ZOOM
        );
        this.zoom = next;

        const worldAfter = this.screenToWorld(mouse.x, mouse.y);
        this.camX += worldBefore.x - worldAfter.x;
        this.camY += worldBefore.y - worldAfter.y;
      }
    }

    // === Hover detection in world space ===
    const world = this.screenToWorld(mouse.x, mouse.y);
    this.hoveredNodeId = this.renderer.getNodeAtWorld(this.tree, world.x, world.y);

    // Keep reachability in sync with unlock events
    this.refreshReachability();

    // === Left click to unlock (connectivity + affordability) ===
    if (this.input.wasLeftClicked() && this.hoveredNodeId) {
      const mgr = PlayerGlobalPassiveManager.getInstance();
      const meta = PlayerMetaCurrencyManager.getInstance();
      const sq = this.tree.squares.find(s => s.node.id === this.hoveredNodeId)!;
      const id = sq.node.id;

      const already = mgr.isNodeUnlocked(id);
      const affordable = meta.canAfford(sq.node.cost);
      const connectivityOk =
        this.adjacency
          ? isUnlockEligibleByConnectivity(id, this.adjacency, this.reachableUnlocked)
          : false;

      if (already || !affordable || !connectivityOk) {
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
      } else {
        const ok = mgr.unlockNode(id);
        if (ok) {
          audioManager.play('assets/sounds/sfx/magic/levelup.wav', 'sfx', { maxSimultaneous: 8 });
          this.unlockedCountSnapshot = -1; // force refresh
        } else {
          audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 8 });
        }
      }
    }
  }

  public render(): void {
    if (!this.tree) return;
    const ctx = this.cm.getContext('overlay');
    const canvas = ctx.canvas;

    // Ensure reachability is fresh before painting
    this.refreshReachability();

    this.renderer.render({
      ctx,
      tree: this.tree,
      camX: this.camX,
      camY: this.camY,
      zoom: this.zoom,
      canvasW: canvas.width,
      canvasH: canvas.height,
      hoveredNodeId: this.hoveredNodeId,
      isUnlocked: (id) => PlayerGlobalPassiveManager.getInstance().isNodeUnlocked(id),
      canUnlock: (id) => {
        if (!this.adjacency) return false;
        const mgr = PlayerGlobalPassiveManager.getInstance();
        if (mgr.isNodeUnlocked(id)) return false;

        const node = this.tree!.squares.find(s => s.node.id === id)!.node;
        const affordable = PlayerMetaCurrencyManager.getInstance().canAfford(node.cost);
        const connectivityOk = isUnlockEligibleByConnectivity(id, this.adjacency, this.reachableUnlocked);
        return affordable && connectivityOk;
      }
    });

    // Breakdown window
    this.breakdownWindow.render(ctx);

    // Tooltip at mouse (if any)
    if (this.hoveredNodeId) {
      const sq = this.tree!.squares.find(s => s.node.id === this.hoveredNodeId)!;
      const mgr = PlayerGlobalPassiveManager.getInstance();
      const meta = PlayerMetaCurrencyManager.getInstance();
      const unlocked = mgr.isNodeUnlocked(sq.node.id);
      const affordable = meta.canAfford(sq.node.cost);
      const connectivityOk = this.adjacency
        ? isUnlockEligibleByConnectivity(sq.node.id, this.adjacency, this.reachableUnlocked)
        : false;

      this.tooltipRenderer.renderTooltip(
        {
          node: sq.node,
          playerCores: meta.getMetaCurrency(),
          unlocked, affordable, connectivityOk,
        },
        this.input.getMousePosition().x,
        this.input.getMousePosition().y,
        getUniformScaleFactor() * 0.75
      );
    }

    // ⬇️ NEW: Bottom-left "Cores" overlay (simple, GC-neutral, scale-aware)
    this.renderCoresOverlay(ctx);
  }

  // === Coordinate transforms ===
  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx / this.zoom + this.camX,
      y: sy / this.zoom + this.camY
    };
    }

  private clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
  }

  // === Connectivity cache maintenance ===
  private refreshReachability(): void {
    if (!this.tree || !this.adjacency) return;

    const mgr = PlayerGlobalPassiveManager.getInstance();

    // Count unlocked — if unchanged, skip recompute
    let unlockedCount = 0;
    for (const sq of this.tree.squares) {
      if (mgr.isNodeUnlocked(sq.node.id)) unlockedCount++;
    }
    if (unlockedCount === this.unlockedCountSnapshot) return;

    this.unlockedCountSnapshot = unlockedCount;

    const unlockedSet = new Set<string>();
    for (const sq of this.tree.squares) {
      if (mgr.isNodeUnlocked(sq.node.id)) unlockedSet.add(sq.node.id);
    }

    this.reachableUnlocked = computeReachableUnlocked('root-node', this.adjacency, unlockedSet);
  }

  // ⬇️ NEW: dedicated painter for the cores overlay
  private renderCoresOverlay(ctx: CanvasRenderingContext2D): void {
    const ui = getUniformScaleFactor();
    const canvas = ctx.canvas;

    const cores = PlayerMetaCurrencyManager.getInstance().getMetaCurrency();
    const label = `Cores: ${cores}`;

    // Measure text with scaled font to size the window adaptively (bounded by CORE_MIN_W)
    const fontPx = Math.round(12 * ui);
    ctx.save();
    ctx.font = `${fontPx}px monospace`;
    const textW = Math.ceil(ctx.measureText(label).width);
    ctx.restore();

    const padX = Math.round(this.CORE_PAD_X * ui);
    const padY = Math.round(this.CORE_PAD_Y * ui);
    const winH  = Math.round(this.CORE_H * ui);
    const winW  = Math.max(Math.round(this.CORE_MIN_W * ui), textW + padX * 2);

    const x = Math.round(this.CORE_MARGIN_L * ui);
    const y = canvas.height - winH - Math.round(this.CORE_MARGIN_B * ui);

    // Subtle chrome, consistent with other minimalist windows
    drawMinimalistWindow(ctx, x, y, winW, winH, {
      alpha: 0.6,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius * ui,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
      // (optional) fillColor to distinguish; omit to inherit default
    });

    // Centered vertically, left-aligned text
    const textX = x + padX;
    const textY = y + Math.round((winH - fontPx) / 2);
    drawLabel(ctx, textX, textY, label, {
      font: `${12}px monospace`, // drawLabel handles scaling via `ui`
      color: DEFAULT_CONFIG.general.textColor,
      align: 'left',
      glow: true
    }, ui);
  }
}
