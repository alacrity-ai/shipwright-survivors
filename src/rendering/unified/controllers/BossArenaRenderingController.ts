import { GlobalEventBus } from '@/core/EventBus';
import { BossArenaPass } from '@/rendering/unified/passes/fx/BossArenaPass';

import { shakeCamera } from '@/core/interfaces/events/CameraReporter';
import { audioManager } from '@/audio/Audio';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';

import { disablePlanets } from '@/core/interfaces/events/PlanetMenusReporter';
import { applyBossCinematicEffect } from '@/core/interfaces/events/PostProcessingEffectReporter';

import { CanvasManager } from '@/core/CanvasManager';

export interface BossArenaOptions {
  /** World-space center of the arena (usually matches the boss spawn point). */
  center: [number, number];

  /** Outer radius of the arena in world units. */
  radius: number;

  /** Initial visual state: 0 = idle, 1 = forming, 2 = pulsing. */
  initialState?: number;

  /** Duration (in seconds) for the forming animation to fully complete. */
  formingDuration?: number;
}

const RENDERING_RADIUS_ADJUSTMENT_MULTIPLIER = 0.545;

/**
 * Controls the boss fight arena: manages state transitions (idle, forming, pulsing),
 * tracks timing for forming animation, and delegates draw calls to BossArenaPass.
 *
 * The arena is now created/reset dynamically via the `'bossArena:spawn'` event.
 */
export class BossArenaRenderingController {
  private readonly renderer: BossArenaPass;

  private center: [number, number] = [0, 0];
  private radius: number = 0;

  private state: number = 0; // 0 = idle, 1 = forming, 2 = pulsing
  private time: number = 0;  // Global time since arena creation (seconds)

  private formingDuration: number = 3.0;
  private formingElapsed: number = 0;

  constructor() {
    const gl = CanvasManager.getInstance().getWebGL2Context('unifiedgl2');
    this.renderer = new BossArenaPass(gl);

    // Subscribe to event bus for dynamic spawning/resetting
    GlobalEventBus.on('bossArena:spawn', this.handleSpawnArena);
  }

  // === Event Handler ===

  private handleSpawnArena = (opts: BossArenaOptions): void => {
    this.center = opts.center;
    this.radius = opts.radius * RENDERING_RADIUS_ADJUSTMENT_MULTIPLIER;
    this.state = opts.initialState ?? 0;
    this.formingDuration = opts.formingDuration ?? 3.0;

    this.time = 0;
    this.formingElapsed = 0;

    if (this.state === 1) {
      // Kick off the forming sequence immediately
      this.startForming();
    }
  };

  /**
   * Advances the arena state by delta time.
   * Handles automatic transitions from forming -> pulsing when complete.
   */
  update(dt: number): void {
    this.time += dt;

    if (this.state === 1) {
      this.formingElapsed += dt;
      if (this.formingElapsed >= this.formingDuration) {
        this.state = 2; // Transition to pulsing

        // Shake / Sound Effect / Giant Light flash in center
        shakeCamera(10, 1, 10);
        audioManager.play('assets/sounds/sfx/explosions/explosion_02.wav', 'sfx');
        createLightFlash(this.center[0], this.center[1], 2600, 2.0, 0.5, '#ff3211');

        // Change shader for boss mode
        applyBossCinematicEffect();

        // Disable planets
        disablePlanets();
      }
    }
  }

  /**
   * Renders the boss arena (only if radius > 0).
   */
  render(): void {
    if (this.radius <= 0) return;

    const formProgress =
      this.state === 1
        ? Math.min(this.formingElapsed / this.formingDuration, 1.0)
        : 1.0;

    this.renderer.render(
      this.state,
      this.time,
      formProgress,
      this.center,
      this.radius
    );
  }

  /** Resets and starts the forming animation sequence manually. */
  startForming(): void {
    this.state = 1;
    this.formingElapsed = 0;

    // Play sound effect
    audioManager.play('assets/sounds/sfx/magic/teleport_01.wav', 'sfx');
  }

  /** Immediately switches to pulsing state (skipping forming). */
  startPulsing(): void {
    this.state = 2;
    this.formingElapsed = this.formingDuration;
  }

  /** Updates arena center and/or radius dynamically (for phase changes). */
  setArena(center: [number, number], radius: number): void {
    this.center = center;
    this.radius = radius;
  }

  /** Cleans up GPU resources and unsubscribes from events. */
  destroy(): void {
    GlobalEventBus.off('bossArena:spawn', this.handleSpawnArena);
    this.renderer.destroy();
  }
}
