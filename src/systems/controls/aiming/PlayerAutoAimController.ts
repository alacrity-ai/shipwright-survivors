// src/systems/controls/aiming/PlayerAutoAimController.ts
import { findNearestTarget } from '@/systems/ai/helpers/ShipUtils';
import { predictInterceptPositionAnalytical, type Vec2 } from '@/systems/ai/helpers/VectorUtils';
import { getDistance } from '@/shared/vectorUtils';
import type { AimProvider } from './AimProvider';
import type { Ship } from '@/game/ship/Ship';
import type { InputManager } from '@/core/InputManager';
import { InputDeviceTracker } from '@/core/input/InputDeviceTracker';

export class PlayerAutoAimController implements AimProvider {
  private readonly range         = 2_800; // px
  private readonly leadSeconds   = 0.5;   // s
  private readonly TARGET_STICKY = 0.25;  // s minimum lock persistence
  private readonly RESCAN_PERIOD = 0.5;   // s between reprioritisation scans
  private readonly SWITCH_MARGIN = 32;    // px hysteresis for switching

  private target: Ship | null = null;
  private timeSinceLock   = 0; // s
  private rescanCountdown = this.RESCAN_PERIOD;

  constructor(private readonly input: InputManager) {}

  /* ------------------------------------------------------------------ */
  public tick(dt: number, self: Ship): void {
    const stick = this.input.getGamepadAimVector();

    // Manual override: right stick engaged clears auto-target
    if (stick.x || stick.y) {
      this.clearTarget();
      InputDeviceTracker.getInstance().updateDevice('gamepad');
      return;
    }

    this.timeSinceLock   += dt;
    this.rescanCountdown -= dt;

    // Immediate drop and reacquire if the current target is dead
    if (this.target && this.target.isDestroyed()) {
      this.clearTarget();
      this.acquireTarget(self);
      return;
    }

    // Reacquire immediately if target is invalid (out of range or invulnerable)
    if (!this.isTargetValid(self)) {
      this.clearTarget();
      this.acquireTarget(self);
      return;
    }

    // Periodic reprioritisation (look for a closer/better target)
    if (this.rescanCountdown <= 0) {
      this.rescanCountdown = this.RESCAN_PERIOD;
      this.considerBetterTarget(self);
    }
  }

  /* ── external contract ─────────────────────────────────────────── */
  /** Indicates whether a live, in-range, non-invulnerable target is tracked. */
  public isLocked(): boolean {
    return this.target !== null && !this.target.isDestroyed();
  }

  /* ------------------------------------------------------------------ */
  public getAimPoint(self: Ship): Vec2 {
    if (!this.target) {
      this.acquireTarget(self);
    }

    if (this.target) {
      const selfTransform = self.getTransform();
      const targetTransform = this.target.getTransform();

      // Predict intercept point based on velocity and projectile speed
      return predictInterceptPositionAnalytical(
        selfTransform.position,
        targetTransform.position,
        this.target.getVelocity(),
        1400
      );
    }

    // Fallback: aim forward along ship's nose
    const { position: p, rotation: r } = self.getTransform();
    return {
      x: p.x + Math.cos(r - Math.PI / 2) * 400,
      y: p.y + Math.sin(r - Math.PI / 2) * 400,
    };
  }

  /* --------------------------- helpers ------------------------------ */
  private acquireTarget(self: Ship): void {
    this.target = findNearestTarget(self, this.range);
    this.timeSinceLock = 0;
  }

  private considerBetterTarget(self: Ship): void {
    if (!this.target) {
      this.acquireTarget(self);
      return;
    }

    const candidate = findNearestTarget(self, this.range);
    if (!candidate || candidate === this.target) return;

    const originPos = self.getTransform().position;
    const dCur = getDistance(originPos, this.target.getTransform().position);
    const dNew = getDistance(originPos, candidate.getTransform().position);

    if (dNew + this.SWITCH_MARGIN < dCur) {
      this.target = candidate;
      this.timeSinceLock = 0;
    }
  }

  /**
   * Validates the current target:
   * - Must exist
   * - Must not be destroyed
   * - Must not be invulnerable
   * - Must be within `range` of the player ship
   */
  private isTargetValid(self: Ship): boolean {
    if (!this.target) return false;
    if (this.target.isDestroyed()) return false;
    if (this.target.getAffixes()?.invulnerable) return false;

    const selfPos = self.getTransform().position;
    const targetPos = this.target.getTransform().position;
    return getDistance(selfPos, targetPos) <= this.range;
  }

  private clearTarget(): void {
    this.target = null;
    this.timeSinceLock   = 0;
    this.rescanCountdown = this.RESCAN_PERIOD;
  }
}
