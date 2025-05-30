// src/systems/controls/PlayerControllerSystem.ts

import {
  isKeyPressed,
  isShiftPressed,
  getMousePosition,
  wasKeyJustPressed
} from '@/core/Input';

import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';
import type { UtilityIntent } from '@/core/intent/interfaces/UtilityIntent';

export class PlayerControllerSystem {
  constructor(private readonly camera: Camera) {}

  public getIntent(): ShipIntent {
    const shift = isShiftPressed();

    // === Directional movement ===
    const movementIntent: MovementIntent = {
      thrustForward: isKeyPressed('KeyW'),
      brake: isKeyPressed('KeyS'),

      // SHIFT+A/D → Strafe; A/D → Rotate
      rotateLeft: !shift && isKeyPressed('KeyA'),
      rotateRight: !shift && isKeyPressed('KeyD'),

      strafeLeft: isKeyPressed('KeyQ') || (shift && isKeyPressed('KeyA')),
      strafeRight: isKeyPressed('KeyE') || (shift && isKeyPressed('KeyD')),
    };

    // === Weapon controls ===
    const firePrimary = isKeyPressed('MouseLeft');
    const fireSecondary = isKeyPressed('MouseRight');

    const mouseScreen = getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y);

    const weaponIntent: WeaponIntent = {
      firePrimary,
      fireSecondary,
      aimAt: mouseWorld,
    };

    // === Utility Controls === <--- NEW
    const toggleShields = wasKeyJustPressed('Space');

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