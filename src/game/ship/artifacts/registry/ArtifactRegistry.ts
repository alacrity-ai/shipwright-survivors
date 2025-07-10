import type { ArtifactDefinition } from '@/game/ship/artifacts/interfaces/ArtifactDefinition';

// === Artifact Definitions ===
import { fortificationModule } from '@/game/ship/artifacts/registry/definitions/fortificationModule';
import { unstableThruster } from '@/game/ship/artifacts/registry/definitions/unstableThruster';
import { reflectorPlate } from '@/game/ship/artifacts/registry/definitions/reflectorPlate';
import { solarCapacitor } from '@/game/ship/artifacts/registry/definitions/solarCapacitor';
import { chaosModule } from '@/game/ship/artifacts/registry/definitions/chaosModule';
import { tradersHologram } from '@/game/ship/artifacts/registry/definitions/tradersHologram';
import { midasApparatus } from '@/game/ship/artifacts/registry/definitions/midasApparatus';
import { unstableWormhole } from '@/game/ship/artifacts/registry/definitions/unstableWormhole';
import { huntersCore } from '@/game/ship/artifacts/registry/definitions/huntersCore';
import { hornedPlating } from '@/game/ship/artifacts/registry/definitions/hornedPlating';
import { visceralPlating } from '@/game/ship/artifacts/registry/definitions/visceralPlating';
import { growthSpores } from '@/game/ship/artifacts/registry/definitions/growthSpores';
import { investigatorsModule } from '@/game/ship/artifacts/registry/definitions/investigatorsModule';
import { gravestoneSignet } from '@/game/ship/artifacts/registry/definitions/gravestoneSignet';
import { fangModule } from '@/game/ship/artifacts/registry/definitions/fangModule';
import { rallyingDish } from '@/game/ship/artifacts/registry/definitions/rallyingDish';
import { flatShells } from '@/game/ship/artifacts/registry/definitions/flatShells';
import { coatedPlating } from '@/game/ship/artifacts/registry/definitions/coatedPlating';
import { cornucopiaModule } from '@/game/ship/artifacts/registry/definitions/cornucopiaModule';
import { homingBeacon } from '@/game/ship/artifacts/registry/definitions/homingBeacon';
import { signOfRo } from '@/game/ship/artifacts/registry/definitions/signOfRo';
import { pulseVane } from '@/game/ship/artifacts/registry/definitions/pulseVane';
import { catharsisRelay } from '@/game/ship/artifacts/registry/definitions/catharsisRelay';
import { eidolonFrame } from '@/game/ship/artifacts/registry/definitions/eidolonFrame';
import { blackboxRecorder } from '@/game/ship/artifacts/registry/definitions/blackboxRecorder';
import { wardensGavel } from '@/game/ship/artifacts/registry/definitions/wardensGavel';
import { chromaticReactor } from '@/game/ship/artifacts/registry/definitions/chromaticReactor';
import { ampedScope } from '@/game/ship/artifacts/registry/definitions/ampedScope';
import { phaseglassHull } from '@/game/ship/artifacts/registry/definitions/phaseglassHull';
import { acidicRounds } from '@/game/ship/artifacts/registry/definitions/acidicRounds';
import { spiteCoil } from '@/game/ship/artifacts/registry/definitions/spiteCoil';
import { nullWeavePlating } from '@/game/ship/artifacts/registry/definitions/nullWeavePlating';
import { ashenDrive } from '@/game/ship/artifacts/registry/definitions/ashenDrive';
import { gyroStabilizer } from '@/game/ship/artifacts/registry/definitions/gyroStabilizer';
import { echoChamber } from '@/game/ship/artifacts/registry/definitions/echoChamber';
import { resupplyCargo } from '@/game/ship/artifacts/registry/definitions/resupplyCargo';
import { engineersInspection } from '@/game/ship/artifacts/registry/definitions/engineersInspection';
import { magnetArray } from '@/game/ship/artifacts/registry/definitions/magnetArray';
import { storageModule } from '@/game/ship/artifacts/registry/definitions/storageModule';
import { imprinterNode } from '@/game/ship/artifacts/registry/definitions/imprinterNode';

// === Internal Artifact Lookup ===
const internalRegistry: Record<string, ArtifactDefinition> = {
  [fortificationModule.id]: fortificationModule,
  [unstableThruster.id]: unstableThruster,
  [reflectorPlate.id]: reflectorPlate,
  [solarCapacitor.id]: solarCapacitor,
  [tradersHologram.id]: tradersHologram,
  [chaosModule.id]: chaosModule,
  [midasApparatus.id]: midasApparatus,
  [unstableWormhole.id]: unstableWormhole,
  [huntersCore.id]: huntersCore,
  [hornedPlating.id]: hornedPlating,
  [visceralPlating.id]: visceralPlating,
  [growthSpores.id]: growthSpores,
  [investigatorsModule.id]: investigatorsModule,
  [gravestoneSignet.id]: gravestoneSignet,
  [fangModule.id]: fangModule,
  [rallyingDish.id]: rallyingDish,
  [flatShells.id]: flatShells,
  [coatedPlating.id]: coatedPlating,
  [cornucopiaModule.id]: cornucopiaModule,
  [homingBeacon.id]: homingBeacon,
  [signOfRo.id]: signOfRo,
  [pulseVane.id]: pulseVane,
  [catharsisRelay.id]: catharsisRelay,
  [eidolonFrame.id]: eidolonFrame,
  [blackboxRecorder.id]: blackboxRecorder,
  [wardensGavel.id]: wardensGavel,
  [chromaticReactor.id]: chromaticReactor,
  [ampedScope.id]: ampedScope,
  [phaseglassHull.id]: phaseglassHull,
  [acidicRounds.id]: acidicRounds,
  [spiteCoil.id]: spiteCoil,
  [nullWeavePlating.id]: nullWeavePlating,
  [ashenDrive.id]: ashenDrive,
  [gyroStabilizer.id]: gyroStabilizer,
  [echoChamber.id]: echoChamber,
  [resupplyCargo.id]: resupplyCargo,
  [engineersInspection.id]: engineersInspection,
  [magnetArray.id]: magnetArray,
  [storageModule.id]: storageModule,
  [imprinterNode.id]: imprinterNode,
  // TODO: Add more artifacts here
};

/**
 * Retrieves an artifact definition by its ID.
 */
export function getArtifactById(id: string): ArtifactDefinition | undefined {
  return internalRegistry[id];
}

/**
 * Returns all registered artifact definitions.
 */
export function getAllArtifacts(): ArtifactDefinition[] {
  return Object.values(internalRegistry);
}

/**
 * Checks whether an artifact ID is registered.
 */
export function isArtifactRegistered(id: string): boolean {
  return id in internalRegistry;
}
