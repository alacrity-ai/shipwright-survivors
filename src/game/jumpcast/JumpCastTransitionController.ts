// src/game/jumpcast/JumpCastTransitionController.ts

import type { InputManager } from "@/core/InputManager";
import type { ShipConstructionAnimatorService } from "@/game/ship/systems/ShipConstructionAnimatorService";
import type { ParticleManager } from "@/systems/fx/ParticleManager";
import type { Ship } from "@/game/ship/Ship";

import { ShipRegistry } from "@/game/ship/ShipRegistry";
import { FadeManager } from "@/rendering/FadeManager";
import { purgeNonPlayerShips } from "@/systems/culling/purgeNonPlayerShips";
import { audioManager } from "@/audio/Audio";
import { JumpCastProgressPopup } from "@/game/jumpcast/JumpCastProgressPopup";

import { shakeCamera } from "@/core/interfaces/events/CameraReporter";
import { createLightFlash } from "@/lighting/helpers/createLightFlash";

import { GlobalEventBus } from "@/core/EventBus";

type JumpTarget = { x: number; y: number; rot?: number };

enum JumpState {
  Preparing       = "preparing",
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
  private readonly particleManager: ParticleManager;
  private readonly fade = FadeManager.getInstance();
  private readonly progressPopup: JumpCastProgressPopup;

  private playerShip: Ship | null = null;

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
    particleManager: ParticleManager,
  ) {
    this.input    = inputManager;
    this.animator = constructionAnimator;
    this.progressPopup = new JumpCastProgressPopup(this.input);
    this.particleManager = particleManager;

    this.playerShip = ShipRegistry.getInstance().getPlayerShip();

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
    this.playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!this.playerShip) return false;

    this.playerShip.setJumping(true);
    this.target = target;

    // NEW – open progress UI
    this.progressPopup.openMenu();
    this.state      = JumpState.Preparing;

    createLightFlash(this.playerShip.getTransform().position.x, this.playerShip.getTransform().position.y, 1200, 1.0, 0.4, '#ffffff');
    audioManager.play('assets/sounds/sfx/ship/computing_00.wav', 'sfx', { maxSimultaneous: 4 });
    shakeCamera(10, 1, 10);

    // no timer yet – popup governs pacing
    return true;
  }

  /**
   * Advance state machine; must be invoked from the main update loop.
   * @param dt delta-time in seconds
   */
  update(dt: number): void {
    if (!this.playerShip) return;

    this.fade.update();
    this.progressPopup.update(dt);

    if (this.state === JumpState.Idle) return;

    const ms = dt * 1000;
    this.stateTimer = Math.max(this.stateTimer - ms, 0);

    switch (this.state) {

      case JumpState.Preparing: {
        this.particleManager.emitBurst(this.playerShip.getTransform().position, 1, {
          colors: ['#00FFFF', '#39AAAA', '#FFFFFF'],
          randomDirection: true,
          speedRange: [400, 800],
          sizeRange: [1.0, 2.0],
          lifeRange: [0.5, 1.0],
          fadeOut: true,
          light: true,
          lightRadiusScalar: 32,
          lightIntensity: 0.2,
        });

        if (this.progressPopup.timerComplete()) {
          // Transition to deconstruction sequence
          if (this.playerShip) {
            this.playerShip.setNoClip(true);
            this.input.disableAllActions();
            this.animator.animateShipDeconstruction(this.playerShip);
          }
          this.state      = JumpState.Deconstructing;
          this.playerShip.turnOffAllBlockLights();
          this.stateTimer = 500;
          this.progressPopup.closeMenu();          // close gracefully
        } else if (!this.progressPopup.isOpen()) { // user canceled
          audioManager.play('assets/sounds/sfx/ship/energy-shield-reverse_00.wav', 'sfx', { maxSimultaneous: 4 });
          this.abortJump();
        }
        break;
      }

      // === Deconstructing
      case JumpState.Deconstructing: {
        // Wait until the service reports completion
        const stillBusy = this.animator.isShipDeconstructing(this.playerShip);
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
          if (this.playerShip && this.target) {
            this.playerShip.setHomeCoordinates(this.target.x, this.target.y);
          }

          this.state      = JumpState.Cooldown;
          this.stateTimer = this.cooldownMs;
        }
        break;

      case JumpState.Cooldown:
        if (this.stateTimer === 0) {
          this.state = JumpState.Idle;
          this.playerShip?.setNoClip(false);
          this.playerShip?.setJumping(false);
        }
        break;
    }
  }

  /**
   * Render overlay elements (currently only the fade manager).
   * Invoke from the main render step.
   */
  render(): void {
    // this.fade.render();
    this.progressPopup.render();
  }

  /**
   * Returns the remaining global jump cooldown in milliseconds.
   */
  getRemainingCooldown(): number {
    return this.state === JumpState.Cooldown ? this.stateTimer : 0;
  }

  private teleportShip(): void {
    if (!this.playerShip || !this.target) return;

    const { x, y, rot = 0 } = this.target;

    this.playerShip.setTransform({
      position: { x, y },
      velocity: { x: 0, y: 0 },      // halt linear motion
      rotation: rot,
      angularVelocity: 0,            // halt spin
    });

    // TODO: snap camera, play SFX/VFX, etc.
  }

  private beginReconstruction(): void {
    if (!this.playerShip) return;

    this.animator.animateShipConstruction(this.playerShip);
    this.state      = JumpState.Reconstructing;
    this.stateTimer = 500; // duration of construction anim (ms)
  }

  private abortJump(): void {
    this.input.enableAllActions();
    this.state      = JumpState.Idle;
    this.stateTimer = 0;
    this.target     = null;
    this.playerShip?.setJumping(false);
  }

  public destroy(): void {
    GlobalEventBus.off('jumpcast:initiate-jump', this.handleInitiateJump);
    GlobalEventBus.off('planet:interaction:options:disable-jump', this.handleDisableJump);
    GlobalEventBus.off('planet:interaction:options:enable-jump', this.handleEnableJump);
  }
}
