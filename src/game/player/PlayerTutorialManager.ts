// src/game/player/PlayerTutorialManager.ts

import { createMoveCoachMark } from "@/rendering/coachmarks/helpers/createMoveCoachMark";
import { createAfterBurnerCoachMark } from "@/rendering/coachmarks/helpers/createAfterBurnerCoachMark";
import { createFirePrimaryCoachMark } from "@/rendering/coachmarks/helpers/createFirePrimaryCoachMark";
import { createPlaceBlockCoachMark } from "@/rendering/coachmarks/helpers/createPlaceBlockCoachMark";
import { createAttachAllBlocksCoachMark } from "@/rendering/coachmarks/helpers/createAttachAllBlocksCoachMark";
import { PlayerResources } from "@/game/player/PlayerResources";

import { flags } from "@/game/player/PlayerFlagManager";

import type { InputManager } from "@/core/InputManager";
import type { CoachMarkManager } from "@/rendering/coachmarks/CoachMarkManager";

/**
 * Linear onboarding (core):
 *   1) Move (WASD/left-stick)
 *   2) Afterburner (action 'afterburner')
 *   3) Fire (action 'firePrimary')
 *
 * Optional, opportunistic post-core hints (one-shot each, order-aware):
 *   4) PlaceBlock (action 'placeBlockButton') — shown after core IF player has ≥1 block.
 *   5) AttachAllBlocks (action 'placeAllBlocksButton') — shown after core IF player has >10 blocks.
 *
 * Notes:
 * - `completed` gates only the core (Move/Afterburner/Fire). Optional hints use their own completion flags.
 * - After finishing Fire, we prefer showing AttachAllBlocks first if count>10, else PlaceBlock if count>0.
 * - While at phase Done, we watch inventory and will trigger whichever optional hint is eligible and not yet completed.
 * - Phase arming is per-control to avoid interference from unrelated inputs.
 */
export class PlayerTutorialManager {
  private static instance: PlayerTutorialManager;

  private input: InputManager;
  private coachmarkManager: CoachMarkManager;

  /** Tutorial finite-state machine */
  private enumPhase = {
    Idle: 0,
    Move: 1,
    Afterburner: 2,
    Fire: 3,
    PlaceBlock: 4,
    AttachAllBlocks: 5,
    Done: 6,
  } as const;

  private phase: number = this.enumPhase.Idle;
  private shownForPhase: boolean = false;
  private completed: boolean = false;          // core steps done
  private placeCompleted: boolean = false;     // optional "place one" hint done
  private attachAllCompleted: boolean = false; // optional "attach all" hint done

  // Rising-edge gating per phase for its *relevant* control only.
  private armed: boolean = false;

  // Coachmark placement
  private static readonly CM_X = 200;
  private static readonly CM_Y = 320;

  private constructor(input: InputManager, coachmarkManager: CoachMarkManager) {
    this.input = input;
    this.coachmarkManager = coachmarkManager;
  }

  public static getInstance(input: InputManager, coachmarkManager: CoachMarkManager): PlayerTutorialManager {
    if (!PlayerTutorialManager.instance) {
      PlayerTutorialManager.instance = new PlayerTutorialManager(input, coachmarkManager);
    } else {
      PlayerTutorialManager.instance.input = input;
      PlayerTutorialManager.instance.coachmarkManager = coachmarkManager;
    }
    return PlayerTutorialManager.instance;
  }

  /** Entry point — begins the core flow unless already completed. Safe to call multiple times. */
  public startIfNeeded(): void {
    const completedFlag = 'tutorials.completed';
    if (flags.has(completedFlag)) return;
    if (this.completed) return; // core already done; optional hints will be handled from update()
    if (this.phase === this.enumPhase.Idle) {
      this.phase = this.enumPhase.Move;
      this.shownForPhase = false;
      this.armed = false;
      this.safeClearCoachmarks();
    }
  }

  /** Per-frame pump. Call from your main update loop. */
  public update(): void {
    if (this.phase === this.enumPhase.Idle) return;

    // Opportunistic transitions while "Done": prefer AttachAll (>10) over Place (>=1), if not yet completed.
    if (this.phase === this.enumPhase.Done) {
      const res = PlayerResources.getInstance();
      const count = res?.getBlockCount?.() ?? 0;

      if (!this.attachAllCompleted && count > 10) {
        this.phase = this.enumPhase.AttachAllBlocks;
        this.shownForPhase = false;
        this.armed = false;
      } else if (!this.placeCompleted && count > 0) {
        this.phase = this.enumPhase.PlaceBlock;
        this.shownForPhase = false;
        this.armed = false;
      }
    }

    // Render the coachmark for current phase once.
    if (!this.shownForPhase) {
      this.renderCoachmarkForPhase(this.phase);
      this.shownForPhase = true;
      // Require a clean "release" of the relevant control before accepting completion.
      this.armed = false;
      return;
    }

    // Phase-specific arming.
    if (!this.armed) {
      switch (this.phase) {
        case this.enumPhase.Move:
          if (!this.anyMovementNow()) this.armed = true;
          break;
        case this.enumPhase.Afterburner:
          if (!this.isAfterburnerDown()) this.armed = true;
          break;
        case this.enumPhase.Fire:
          if (!this.isFireDown()) this.armed = true;
          break;
        case this.enumPhase.PlaceBlock:
          if (!this.isBlockAttachDown()) this.armed = true;
          break;
        case this.enumPhase.AttachAllBlocks:
          if (!this.isAttachAllBlocksDown()) this.armed = true;
          break;
        default:
          this.armed = true;
          break;
      }
      if (!this.armed) return;
    }

    // Completion checks — unrelated inputs are ignored.
    switch (this.phase) {
      case this.enumPhase.Move:
        if (this.anyMovementNow()) this.advance();
        break;
      case this.enumPhase.Afterburner:
        if (this.isAfterburnerDown()) this.advance();
        break;
      case this.enumPhase.Fire:
        if (this.isFireDown()) this.advance();
        break;
      case this.enumPhase.PlaceBlock:
        if (this.isBlockAttachDown()) this.advance();
        break;
      case this.enumPhase.AttachAllBlocks:
        if (this.isAttachAllBlocksDown()) this.advance();
        break;
      default:
        break;
    }
  }

  /** Resets (QA/dev). */
  public reset(): void {
    this.phase = this.enumPhase.Idle;
    this.shownForPhase = false;
    this.completed = false;
    this.placeCompleted = false;
    this.attachAllCompleted = false;
    this.armed = false;
    this.safeClearCoachmarks();
  }

  /** Hard-complete the tutorial (core + optionals). */
  public markAllComplete(): void {
    this.safeClearCoachmarks();
    this.phase = this.enumPhase.Done;
    this.completed = true;
    this.placeCompleted = true;
    this.attachAllCompleted = true;
    flags.set('tutorials.completed');
  }

  public isComplete(): boolean {
    // “Complete” refers to the core steps; optional hints are independent.
    return this.completed;
  }

  // ──────────────────────────────────────────────────────────
  // Persistence
  // ──────────────────────────────────────────────────────────

  public toJSON(): string {
    return JSON.stringify({
      phase: this.phase,
      completed: this.completed,
      placeCompleted: this.placeCompleted,
      attachAllCompleted: this.attachAllCompleted,
    });
  }

  public fromJSON(json: string): void {
    try {
      const data = JSON.parse(json);
      if (typeof data?.phase === "number") this.phase = data.phase;
      if (typeof data?.completed === "boolean") this.completed = data.completed;
      if (typeof data?.placeCompleted === "boolean") this.placeCompleted = data.placeCompleted;
      if (typeof data?.attachAllCompleted === "boolean") this.attachAllCompleted = data.attachAllCompleted;

      // If resuming mid-core sequence, ensure a clean prompt draw.
      if (this.phase >= this.enumPhase.Move && this.phase < this.enumPhase.Done && !this.completed) {
        this.safeClearCoachmarks();
        this.shownForPhase = false;
        this.armed = false;
      }
    } catch (err) {
      console.warn("[PlayerTutorialManager] Failed to parse tutorial state:", err);
      this.reset();
    }
  }

  // ──────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────

  private renderCoachmarkForPhase(p: number): void {
    const x = PlayerTutorialManager.CM_X;
    const y = PlayerTutorialManager.CM_Y;

    this.safeClearCoachmarks();

    switch (p) {
      case this.enumPhase.Move:
        createMoveCoachMark(this.coachmarkManager, x, y);
        break;
      case this.enumPhase.Afterburner:
        createAfterBurnerCoachMark(this.coachmarkManager, x, y);
        break;
      case this.enumPhase.Fire:
        createFirePrimaryCoachMark(this.coachmarkManager, x, y);
        break;
      case this.enumPhase.PlaceBlock:
        createPlaceBlockCoachMark(this.coachmarkManager, x, y);
        break;
      case this.enumPhase.AttachAllBlocks:
        createAttachAllBlocksCoachMark(this.coachmarkManager, x, y);
        break;
      default:
        break;
    }
  }

  private advance(): void {
    this.safeClearCoachmarks();

    if (this.phase === this.enumPhase.Move) {
      this.phase = this.enumPhase.Afterburner;
      this.shownForPhase = false;
      this.armed = false;
      return;
    }

    if (this.phase === this.enumPhase.Afterburner) {
      this.phase = this.enumPhase.Fire;
      this.shownForPhase = false;
      this.armed = false;
      return;
    }

    if (this.phase === this.enumPhase.Fire) {
      // Core complete; decide immediate optional next step, if any.
      this.completed = true;
      const res = PlayerResources.getInstance();
      const count = res?.getBlockCount?.() ?? 0;

      if (!this.attachAllCompleted && count > 10) {
        this.phase = this.enumPhase.AttachAllBlocks;
      } else if (!this.placeCompleted && count > 0) {
        this.phase = this.enumPhase.PlaceBlock;
      } else {
        this.phase = this.enumPhase.Done;
      }

      this.shownForPhase = false;
      this.armed = false;
      return;
    }

    if (this.phase === this.enumPhase.PlaceBlock) {
      this.placeCompleted = true;
      // After placing one, if we already also have >10, we may still show bulk attach later (from Done)
      this.phase = this.enumPhase.Done;
      this.shownForPhase = false;
      this.armed = false;
      return;
    }

    if (this.phase === this.enumPhase.AttachAllBlocks) {
      this.attachAllCompleted = true;
      // After bulk attach, we’re Done; (PlaceBlock may become irrelevant since queue likely shrank)
      this.phase = this.enumPhase.Done;
      this.shownForPhase = false;
      this.armed = false;
      flags.set('tutorials.completed');
      return;
    }
  }

  /** Movement: WASD or left stick. */
  private anyMovementNow(): boolean {
    const kb =
      this.input.isKeyPressed?.("KeyW") ||
      this.input.isKeyPressed?.("KeyA") ||
      this.input.isKeyPressed?.("KeyS") ||
      this.input.isKeyPressed?.("KeyD");

    const gp =
      (this.input as any).isLeftStickMoved?.() ||
      (this.input as any).isLeftStickmoved?.();

    return !!(kb || gp);
  }

  private isAfterburnerDown(): boolean {
    return !!this.input.isActionPressed?.("afterburner");
  }

  private isFireDown(): boolean {
    return !!this.input.isActionPressed?.("firePrimary");
  }

  private isBlockAttachDown(): boolean {
    return !!this.input.isActionPressed?.("placeBlockButton");
  }

  private isAttachAllBlocksDown(): boolean {
    return !!this.input.isActionPressed?.("placeAllBlocksButton");
  }

  /** Clear current coachmark(s) defensively. */
  private safeClearCoachmarks(): void {
    try {
      (this.coachmarkManager as any).clear?.();
      (this.coachmarkManager as any).clearAll?.();
      (this.coachmarkManager as any).reset?.();
    } catch (err) {
      console.warn("[PlayerTutorialManager] Failed to clear coachmarks:", err);
    }
  }

  public destroy(): void {
    this.phase = this.enumPhase.Idle;
    this.shownForPhase = false;
    this.completed = false;
    this.placeCompleted = false;
    this.attachAllCompleted = false;
    this.armed = false;

    this.safeClearCoachmarks();

    PlayerTutorialManager.instance = undefined as any;
  }
}
