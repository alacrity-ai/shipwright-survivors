// src/game/jumpcast/JumpCastTransitionController.ts

import type { InputManager } from "@/core/InputManager";
import type { ShipConstructionAnimatorService } from "@/game/ship/systems/ShipConstructionAnimatorService";
import { ShipRegistry } from "@/game/ship/ShipRegistry";
import { FadeManager } from "@/rendering/FadeManager";
import { purgeNonPlayerShips } from "@/systems/culling/purgeNonPlayerShips";

import { GlobalEventBus } from "@/core/EventBus";

type JumpTarget = { x: number; y: number; rot?: number };

enum JumpState {
  Idle            = "idle",
  Deconstructing  = "deconstructing",
  FadeOut         = "fade-out",
  Transferring    = "transferring",
  FadeIn          = "fade-in",
  Reconstructing  = "reconstructing",
  Cooldown        = "cooldown",
}

export class JumpCastTransitionController {
  private readonly input: InputManager;
  private readonly animator: ShipConstructionAnimatorService;
  private readonly fade = FadeManager.getInstance();

  private state: JumpState = JumpState.Idle;
  private stateTimer = 0;                    // ms remaining in current phase
  private readonly cooldownMs = 100;      // global CD after a successful jump
  private target: JumpTarget | null = null;

  private isJumpEnabled = true;

  private handleDisableJump = () => {
    this.isJumpEnabled = false;
  };

  private handleEnableJump = () => {
    this.isJumpEnabled = true;
  };

  private handleInitiateJump = (payload: { x: number; y: number }) => {
    this.initiateJump(payload);
  };

  constructor(
    inputManager: InputManager,
    constructionAnimator: ShipConstructionAnimatorService,
  ) {
    this.input    = inputManager;
    this.animator = constructionAnimator;

    GlobalEventBus.on('planet:interaction:options:disable-jump', this.handleDisableJump);
    GlobalEventBus.on('planet:interaction:options:enable-jump', this.handleEnableJump);
    GlobalEventBus.on('jumpcast:initiate-jump', this.handleInitiateJump);
  }

  /**
   * Initiates a jump-cast if the controller is idle or cooling down.
   * @returns true if the jump is accepted, false otherwise.
   */
  initiateJump(target: JumpTarget): boolean {
    if (this.state !== JumpState.Idle || !this.isJumpEnabled) return false;

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return false;

    this.input.disableAllActions();
    this.target = target;

    // Begin deconstruction animation
    this.animator.animateShipDeconstruction(playerShip);
    this.state      = JumpState.Deconstructing;
    this.stateTimer = 500; // match deconstruction anim length (ms)

    return true;
  }

  /**
   * Advance state machine; must be invoked from the main update loop.
   * @param dt delta-time in seconds
   */
  update(dt: number): void {
    // Update fade in parallel with any phase
    this.fade.update();

    if (this.state === JumpState.Idle) return;

    const ms = dt * 1000;
    this.stateTimer = Math.max(this.stateTimer - ms, 0);

    switch (this.state) {
      // === Deconstructing
      case JumpState.Deconstructing: {
        const playerShip = ShipRegistry.getInstance().getPlayerShip();
        if (!playerShip) break;

        // Wait until the service reports completion
        const stillBusy = this.animator.isShipDeconstructing(playerShip);
        if (!stillBusy) {
          // Begin screen fade once the last block vanishes
          this.fade.startFade(() => {
            // Fade-out complete → perform spatial transfer
            this.teleportShip();
            this.state = JumpState.Transferring;
          }, 500 /* fade duration ms */);

          this.state = JumpState.FadeOut;
        }
        break;
      }

      case JumpState.FadeOut:
        // nothing; onComplete inside startFade() will switch state
        break;

      case JumpState.Transferring:
        // Immediately begin fade-in; hold black screen for 0ms
        this.fade.fadeFromBlackAfterDelay(0, 800);
        this.state      = JumpState.FadeIn;
        // Purge all non player ships so they will respawn around player
        purgeNonPlayerShips();
        break;

      case JumpState.FadeIn:
        if (!this.fade.isFadeInProgress()) {
          this.beginReconstruction();
        }
        break;

      case JumpState.Reconstructing:
        if (this.stateTimer === 0) {
          this.input.enableAllActions();

          // Set this to the new homepoint for the ship
          const playerShip = ShipRegistry.getInstance().getPlayerShip();
          if (playerShip && this.target) {
            playerShip.setHomeCoordinates(this.target.x, this.target.y);
          }

          this.state      = JumpState.Cooldown;
          this.stateTimer = this.cooldownMs;
        }
        break;

      case JumpState.Cooldown:
        if (this.stateTimer === 0) {
          this.state = JumpState.Idle;
        }
        break;
    }
  }

  /**
   * Render overlay elements (currently only the fade manager).
   * Invoke from the main render step.
   */
  render(): void {
    this.fade.render();
  }

  /**
   * Returns the remaining global jump cooldown in milliseconds.
   */
  getRemainingCooldown(): number {
    return this.state === JumpState.Cooldown ? this.stateTimer : 0;
  }

  private teleportShip(): void {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip || !this.target) return;

    const { x, y, rot = 0 } = this.target;

    playerShip.setTransform({
      position: { x, y },
      velocity: { x: 0, y: 0 },      // halt linear motion
      rotation: rot,
      angularVelocity: 0,            // halt spin
    });

    // TODO: snap camera, play SFX/VFX, etc.
  }

  private beginReconstruction(): void {
    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return;

    this.animator.animateShipConstruction(playerShip);
    this.state      = JumpState.Reconstructing;
    this.stateTimer = 500; // duration of construction anim (ms)
  }

  public destroy(): void {
    GlobalEventBus.off('jumpcast:initiate-jump', this.handleInitiateJump);
    GlobalEventBus.off('planet:interaction:options:disable-jump', this.handleDisableJump);
    GlobalEventBus.off('planet:interaction:options:enable-jump', this.handleEnableJump);
  }
}
