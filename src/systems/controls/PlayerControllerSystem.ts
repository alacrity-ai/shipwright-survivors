// src/systems/controls/PlayerControllerSystem.ts

import {
  isKeyPressed,
  isLeftMouseDown,
  isRightMouseDown,
  getMousePosition,
} from '@/core/Input';

import type { Ship } from '@/game/ship/Ship';
import type { Camera } from '@/core/Camera';
import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import type { MovementIntent } from '@/core/intent/interfaces/MovementIntent';
import type { WeaponIntent } from '@/core/intent/interfaces/WeaponIntent';

export class PlayerControllerSystem {
  constructor(
    private readonly ship: Ship,
    private readonly camera: Camera
  ) {}

  public getIntent(): ShipIntent {
    const movementIntent: MovementIntent = {
      thrustForward: isKeyPressed('KeyW'),
      brake: isKeyPressed('KeyS'),
      rotateLeft: isKeyPressed('KeyA'),
      rotateRight: isKeyPressed('KeyD'),
    };

    const firePrimary = isLeftMouseDown();
    const fireSecondary = isRightMouseDown();
    const mouseScreen = getMousePosition();
    const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y);

    const weaponIntent: WeaponIntent = {
      firePrimary,
      fireSecondary,
      aimAt: mouseWorld,
    };

    return {
      movement: movementIntent,
      weapons: weaponIntent,
    };
  }
}
