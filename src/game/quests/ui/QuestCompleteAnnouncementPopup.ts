// src/ui/menus/QuestCompletionAnnouncementPopup.ts
//----------------------------------------------------------------------------------------------------------------------
//  QuestCompletionAnnouncementPopup
//  • Visually congruent with AbilityUnlockAnnouncementPopupMenu, but driven by Quest metadata.
//  • PRELOADING → (icon fetch) ⟶ ENTERING → CORRECTING → DISPLAYING → EXITING → CLOSED.
//----------------------------------------------------------------------------------------------------------------------

import { CanvasManager }              from '@/core/CanvasManager';
import { drawMinimalistWindow }       from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }                  from '@/ui/primitives/UILabel';
import { getUniformScaleFactor }      from '@/config/view';
import { DEFAULT_CONFIG }             from '@/config/ui';

import { GlobalEventBus }             from '@/core/EventBus';
import { QuestRegistry }              from '@/game/quests/registry/QuestRegistry';
import { resolveQuestIconSprite }     from '@/game/quests/cache/QuestIconCache';

import { ShipBlueprintRegistry }      from '@/game/ship/ShipBlueprintRegistry';   //  ← NEW
import { getAbility }                 from '@/game/player/registry/AbilityRegistry'; // ← NEW

import { audioManager }               from '@/audio/Audio';

import type {
  QuestReward,
  CoreReward,
  ShipUnlockReward,
  AbilityUnlockReward,
} from '@/game/quests/interfaces/QuestReward';                                     // ← NEW

/* ──────────────────────────────────────────────────────────────────────────
 *  Temporal configuration (seconds)                                             (Δt supplied in ms)
 * ──────────────────────────────────────────────────────────────────────── */
const ENTER_DURATION      = 0.36;
const CORRECT_DURATION    = 0.18;
const DISPLAY_DURATION    = 2.0;
const EXIT_DURATION       = 0.36;

/* ──────────────────────────────────────────────────────────────────────────
 *  Helpers
 * ──────────────────────────────────────────────────────────────────────── */
const lerp    = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/* ──────────────────────────────────────────────────────────────────────────
 *  Finite-state enumeration
 * ──────────────────────────────────────────────────────────────────────── */
enum PopupPhase {
  PRELOADING,
  ENTERING,
  CORRECTING,
  DISPLAYING,
  EXITING,
  CLOSED,
}

export class QuestCompletionAnnouncementPopup {
  /* ───────────────────────────────────────────
   *  Dependencies & drawing context
   * ───────────────────────────────────────── */
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx           = this.canvasManager.getContext('overlay');

  /* ───────────────────────────────────────────
   *  State
   * ───────────────────────────────────────── */
  private phase: PopupPhase      = PopupPhase.CLOSED;
  private phaseElapsed           = 0;                // ms within current phase

  private questId:   string | null         = null;
  private questName  = '';
  private questIcon: HTMLImageElement | HTMLCanvasElement | null = null;

  /* ★ NEW: Reward caption (computed once on open) */
  private rewardLabel = '';

  /* ───────────────────────────────────────────
   *  Layout (px * scale) – recomputed on open / resize
   * ───────────────────────────────────────── */
  private windowW = 260;
  private windowH = 260;
  private windowX = 0;
  private windowY = 0;

  /* ───────────────────────────────────────────
   *  Event binding
   * ───────────────────────────────────────── */
  private readonly boundOpen = (p: { questId: string }) => this.openMenu(p.questId);

  constructor() {
    GlobalEventBus.on('quests:announcement:open', this.boundOpen);
  }

  /* ───────────────────────────────────────────
   *  Public API
   * ───────────────────────────────────────── */
  openMenu(questId: string): void {
    const quest = QuestRegistry[questId];
    if (!quest) {
      console.warn(`[QuestCompletionPopup] Unknown quest id: ${questId}`);
      return;
    }

    this.questId     = questId;
    this.questName   = quest.name;
    this.questIcon   = null;                 // reset while loading
    this.rewardLabel = this.buildRewardLabel(quest.rewards);   // ★ NEW

    this.phase        = PopupPhase.PRELOADING;
    this.phaseElapsed = 0;
    this.resize();

    // Fire-and-forget async load
    void this.preloadIcon(quest.icon);

    audioManager.play('assets/sounds/sfx/ui/quest_complete.wav', 'sfx', { maxSimultaneous: 4 });
  }

  isOpen(): boolean { return this.phase !== PopupPhase.CLOSED; }

  destroy(): void {
    GlobalEventBus.off('quests:announcement:open', this.boundOpen);
  }

  /* ───────────────────────────────────────────
   *  Frame lifecycle
   * ───────────────────────────────────────── */
  update(dt: number): void {
    if (this.phase === PopupPhase.CLOSED) return;

    // PRELOADING is tick-silent until icon arrives
    if (this.phase === PopupPhase.PRELOADING) return;

    this.phaseElapsed += dt;

    switch (this.phase) {
      case PopupPhase.ENTERING:
        if (this.phaseElapsed >= ENTER_DURATION) {
          this.transitionTo(PopupPhase.CORRECTING);
        }
        break;

      case PopupPhase.CORRECTING:
        if (this.phaseElapsed >= CORRECT_DURATION) {
          this.transitionTo(PopupPhase.DISPLAYING);
        }
        break;

      case PopupPhase.DISPLAYING:
        if (this.phaseElapsed >= DISPLAY_DURATION) {
          this.transitionTo(PopupPhase.EXITING);
        }
        break;

      case PopupPhase.EXITING:
        if (this.phaseElapsed >= EXIT_DURATION) {
          this.transitionTo(PopupPhase.CLOSED);
        }
        break;
    }
  }

  render(): void {
    if (
      this.phase === PopupPhase.CLOSED ||
      this.phase === PopupPhase.PRELOADING ||
      !this.questIcon
    ) {
      return;
    }

    /* ----- positional interpolation (sliding) ----- */
    const offscreenStart  = -(this.windowY + this.windowH); // above viewport
    const overshootDelta  = 20 * getUniformScaleFactor();   // px (>0 means lower than rest)
    const restY           = 0;

    let dy = 0;
    switch (this.phase) {
      case PopupPhase.ENTERING: {
        const t = clamp01(this.phaseElapsed / ENTER_DURATION);
        dy = lerp(offscreenStart, overshootDelta, easeOutQuad(t));
        break;
      }
      case PopupPhase.CORRECTING: {
        const t = clamp01(this.phaseElapsed / CORRECT_DURATION);
        dy = lerp(overshootDelta, restY, 1 - easeOutQuad(1 - t));
        break;
      }
      case PopupPhase.EXITING: {
        const t = clamp01(this.phaseElapsed / EXIT_DURATION);
        dy = lerp(restY, offscreenStart, easeOutQuad(t));
        break;
      }
      // DISPLAYING → dy = 0
    }

    const x      = this.windowX;
    const y      = this.windowY + dy;
    const scale  = getUniformScaleFactor();
    const ctx    = this.ctx;

    /* ----- Window ----- */
    drawMinimalistWindow(
      ctx,
      x, y,
      this.windowW, this.windowH,
      { ...DEFAULT_CONFIG.window.options, alpha: 0.7 },
    );

    /* ----- “Quest Completed!” label ----- */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y - 28 * scale,
      'Quest Completed!',
      { font: `${18 * scale}px monospace`, align: 'center', glow: true },
    );

    /* ----- Quest name ----- */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      y + 36 * scale,
      this.questName,
      { font: `${16 * scale}px monospace`, align: 'center', glow: false },
    );

    /* ----- Quest icon ----- */
    const iconSize = 128 * scale;
    const iconX    = x + (this.windowW - iconSize) / 2;
    const iconY    = y + (this.windowH - iconSize) / 2 + 18 * scale;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.questIcon, iconX, iconY, iconSize, iconSize);
    ctx.restore();

    /* ★ NEW: Reward caption */
    drawLabel(
      ctx,
      x + this.windowW / 2,
      iconY + iconSize + 20 * scale,
      this.rewardLabel,
      { font: `${14 * scale}px monospace`, align: 'center', glow: false },
    );
  }

  /* ───────────────────────────────────────────
   *  Helpers
   * ───────────────────────────────────────── */

  /** ★ NEW: Derives the caption from the first reward in the array. */
  private buildRewardLabel(rewards: QuestReward[]): string {
    if (rewards.length === 0) return '';

    const reward = rewards[0];
    switch (reward.kind) {
      case 'core': {
        const { amount } = reward as CoreReward;
        return `${amount} Cores Awarded`;
      }
      case 'shipUnlock': {
        const { shipId } = reward as ShipUnlockReward;
        const ship = ShipBlueprintRegistry.getByKey(shipId);
        return `${ship?.name ?? 'Ship'} Unlocked`;
      }
      case 'abilityUnlock': {
        const { abilityId } = reward as AbilityUnlockReward;
        const ability = getAbility(abilityId);
        return `${ability?.name ?? 'Ability'} Unlocked`;
      }
      /* istanbul ignore next */
      default:
        return '';
    }
  }

  private transitionTo(next: PopupPhase): void {
    this.phase        = next;
    this.phaseElapsed = 0;

    // Garbage-collect heavy refs when closing
    if (next === PopupPhase.CLOSED) {
      this.questIcon   = null;
      this.questId     = null;
      this.questName   = '';
      this.rewardLabel = '';
    }
  }

  private async preloadIcon(iconKey: string): Promise<void> {
    try {
      this.questIcon = await resolveQuestIconSprite(iconKey as any);
    } catch (err) {
      console.error(err);
      // Magenta fallback canvas, same style as AbilityIconCache
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, 128, 128);
      this.questIcon = c;
    }

    // Once the icon is ready, begin the animation.
    if (this.phase === PopupPhase.PRELOADING) {
      this.transitionTo(PopupPhase.ENTERING);
    }
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW   = this.canvasManager.getCanvas('overlay').width;
    const vpH   = this.canvasManager.getCanvas('overlay').height;

    this.windowW = 260 * scale;
    this.windowH = 260 * scale;
    this.windowX = 20  * scale;
    this.windowY = (vpH - this.windowH) / 2;
  }
}
