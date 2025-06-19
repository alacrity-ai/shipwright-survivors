// src/game/ship/factories/ShipFormationFactory.ts

import type { ShipFactory } from '@/game/ship/ShipFactory';
import type { AIControllerSystem } from '@/systems/ai/AIControllerSystem';
import type { Ship } from '@/game/ship/Ship';
import type { BehaviorProfile } from '@/systems/ai/types/BehaviorProfile';
import type { Formation } from '@/systems/ai/formations/FormationRegistry';

import { BehaviorProfileRegistry, isBehaviorTypeKey } from '@/systems/ai/types/BehaviorProfileRegistry';
import { FormationState } from '@/systems/ai/fsm/FormationState';

import { v4 as uuidv4 } from 'uuid';

export interface ShipFormationEntry {
  formationId: string;
  layout: { x: number; y: number }[];
  leader: {
    shipId: string;
    hunter?: boolean;
    behaviorProfile?: string | BehaviorProfile;
  };
  followers: {
    shipId: string;
    hunter?: boolean;
    behaviorProfile?: string | BehaviorProfile;
  }[];
  count?: number; // Optional replication count (e.g., spawn 5 of these formations)
}

export class ShipFormationFactory {
  constructor(private readonly shipFactory: ShipFactory) {}

  public async spawnFormations(
    formations: ShipFormationEntry[],
    originX: number,
    originY: number
  ): Promise<Map<Ship, AIControllerSystem>> {
    const result = new Map<Ship, AIControllerSystem>();
    const orchestrator = this.shipFactory.getOrchestrator();
    const registry = orchestrator.getFormationRegistry();

    for (const formationEntry of formations) {
      const count = formationEntry.count ?? 1;

      for (let i = 0; i < count; i++) {
        const offsetX = originX + Math.random() * 8000 - 4000;
        const offsetY = originY + Math.random() * 8000 - 4000;

        const formationId = uuidv4();
        const formationMembers: Formation['members'] = [];

        const layout = formationEntry.layout;
        const leaderData = formationEntry.leader;
        const followersData = formationEntry.followers;

        // === Resolve leader behavior profile ===
        let resolvedLeaderProfile: BehaviorProfile | undefined = undefined;
        if (typeof leaderData.behaviorProfile === 'string' && isBehaviorTypeKey(leaderData.behaviorProfile)) {
          resolvedLeaderProfile = BehaviorProfileRegistry[leaderData.behaviorProfile];
        } else if (typeof leaderData.behaviorProfile === 'object') {
          resolvedLeaderProfile = leaderData.behaviorProfile;
        }

        // === Create leader WITHOUT registration ===
        const { ship: leaderShip, controller: leaderController } =
          await this.shipFactory.createShip(
            leaderData.shipId,
            offsetX,
            offsetY,
            leaderData.hunter ?? false,
            resolvedLeaderProfile,
            {}, // affixes
            undefined, // faction
            false // === do not auto-register
          );

        const followerControllers: AIControllerSystem[] = [];

        // === Create Followers WITHOUT registration ===
        for (let j = 0; j < followersData.length; j++) {
          const follower = followersData[j];
          const offset = layout[j];

          const fx = offsetX + offset.x;
          const fy = offsetY + offset.y;

          let resolvedFollowerProfile: BehaviorProfile | undefined = undefined;
          if (typeof follower.behaviorProfile === 'string' && isBehaviorTypeKey(follower.behaviorProfile)) {
            resolvedFollowerProfile = BehaviorProfileRegistry[follower.behaviorProfile];
          } else if (typeof follower.behaviorProfile === 'object') {
            resolvedFollowerProfile = follower.behaviorProfile;
          }

          const { ship: followerShip, controller: followerController } =
            await this.shipFactory.createShip(
              follower.shipId,
              fx,
              fy,
              follower.hunter ?? false,
              resolvedFollowerProfile,
              {}, // affixes
              undefined, // faction
              false // === do not auto-register
            );

          // === Set FormationState directly
          followerController.setInitialState(
            new FormationState(followerController, followerShip)
          );

          formationMembers.push({
            shipId: followerShip.id,
            offset,
          });

          followerControllers.push(followerController);
          result.set(followerShip, followerController);
        }

        // === Register formation BEFORE controller registration
        registry.registerFormation({
          formationId,
          leaderId: leaderShip.id,
          members: formationMembers
        });

        // === Register leader first
        orchestrator.addController(leaderController);

        // === Register followers AFTER leader is in controllerToShipMap
        for (const followerController of followerControllers) {
          orchestrator.addController(followerController);
        }

        result.set(leaderShip, leaderController);
      }
    }
    return result;
  }
}
