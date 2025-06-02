// src/systems/controls/PlayerControllerSystem.ts

import type { InputManager } from '@/core/InputManager';
import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';
import type { CursorRenderer } from '@/rendering/CursorRenderer';

export class PlayerControllerSystem {
  private isEnginePlaying = false;

  constructor(
    private readonly camera: Camera, 
    private readonly inputManager: InputManager, 
    private readonly cursorRenderer: CursorRenderer
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

    return {
      movement: movementIntent,
      weapons: weaponIntent,
      utility: utilityIntent,
    };
  }
}