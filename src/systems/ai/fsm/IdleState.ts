// src/systems/ai/fsm/IdleState.ts

import type { ShipIntent } from '@/core/intent/interfaces/ShipIntent';
import { BaseAIState } from '@/systems/ai/fsm/BaseAIState';

export class IdleState extends BaseAIState {
  update(): ShipIntent {
    return {
      movement: {
        thrustForward: false,
        brake: false,
        rotateLeft: false,
        rotateRight: false,
        strafeLeft: false,
        strafeRight: false,
      },
      weapons: {
        firePrimary: false,
        fireSecondary: false,
        aimAt: { x: 0, y: 0 }
      }
    };
  }

  transitionIfNeeded() {
    // Remain idle for now
    return null;
  }
}
