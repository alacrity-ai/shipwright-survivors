// src/systems/controls/PlayerControllerSystem.ts

import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
import type { CursorRenderer } from '@/rendering/CursorRenderer';
import type { Ship } from '@/game/ship/Ship';

import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { audioManager } from '@/audio/Audio';

import { FiringMode } from '@/systems/combat/types/WeaponTypes';

export class PlayerControllerSystem {
  private isEnginePlaying = false;
  private lastFiringModeSwitchTime: number = -Infinity;

  constructor(
    private readonly camera: Camera, 
    private readonly inputManager: InputManager, 
    private readonly cursorRenderer: CursorRenderer,
    private readonly playerShip: Ship
  ) {}

  public getIntent(): ShipIntent {
    const shift = this.inputManager.isShiftPressed();

    // === Directional movement ===
    const movementIntent: MovementIntent = {
      thrustForward: this.inputManager.isKeyPressed('KeyW'),
      brake: this.inputManager.isKeyPressed('KeyS'),

      // SHIFT+A/D → Strafe; A/D → Rotate
      rotateLeft: !shift && this.inputManager.isKeyPressed('KeyA'),
      rotateRight: !shift && this.inputManager.isKeyPressed('KeyD'),

      strafeLeft: this.inputManager.isKeyPressed('KeyQ') || (shift && this.inputManager.isKeyPressed('KeyA')),
      strafeRight: this.inputManager.isKeyPressed('KeyE') || (shift && this.inputManager.isKeyPressed('KeyD')),
    };

    // === Weapon controls ===
    const firePrimary = this.inputManager.isKeyPressed('MouseLeft');
    const fireSecondary = this.inputManager.isKeyPressed('MouseRight');

    const mouseScreen = this.inputManager.getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y);

    const weaponIntent: WeaponIntent = {
      firePrimary,
      fireSecondary,
      aimAt: mouseWorld,
      firingMode: this.playerShip.getFiringMode(),
    };

    if (firePrimary || fireSecondary) {
      this.cursorRenderer.setTargetCrosshairCursor();
    } else {
      this.cursorRenderer.setDefaultCursor();
    }

    // === Utility Controls === <--- NEW
    const toggleShields = this.inputManager.wasKeyJustPressed('Space');

    const utilityIntent: UtilityIntent = {
      toggleShields,
    };

    // === Non Intent Player Input Options ===

    // Switch firing mode
    const now = performance.now();
    if (this.inputManager.wasKeyJustPressed('KeyX') && now - this.lastFiringModeSwitchTime >= 1000) {
      this.lastFiringModeSwitchTime = now;

      const newMode = this.playerShip.getFiringMode() === FiringMode.Synced ? FiringMode.Sequence : FiringMode.Synced;
      this.playerShip.setFiringMode(newMode);
      audioManager.play('assets/sounds/sfx/ship/attach_00.wav', 'sfx');

      const playerPos = this.playerShip.getTransform().position;
      const lightColor = newMode === FiringMode.Synced ? '#00ffff' : '#ff0000';
      createLightFlash(playerPos.x, playerPos.y, 520, 1.2, 0.4, lightColor);
    }

    return {
      movement: movementIntent,
      weapons: weaponIntent,
      utility: utilityIntent,
    };
  }
}