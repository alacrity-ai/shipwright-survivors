// src/core/interfaces/EventTypes.ts

import type { IncidentMinimapMarker } from '@/core/interfaces/events/IncidentMinimapReporter';
import type { FiringMode } from '@/systems/combat/types/WeaponTypes';
import type {
  PostEffectName,
  CinematicGradingParams,
  UnderwaterParams
} from '@/rendering/unified/passes/PostProcessPass';
import type { SpecialFxInstance } from '@/rendering/unified/interfaces/SpecialFxInstance';
import type { WaveDefinition } from '@/game/waves/types/WaveDefinition';
import type { CompositeBlockObject } from '@/game/entities/CompositeBlockObject';
import type { DestructionCause } from '@/game/ship/CompositeBlockDestructionService';
import type { PowerUpChoice } from '@/game/player/PlayerExperienceManager';
import type { PlanetDefinition } from '@/game/planets/interfaces/PlanetDefinition';
import type { QuestStepId } from '@/game/quests/interfaces/QuestStep';

export type CursorChangeType =
  | 'crosshair'
  | 'target'
  | 'hovered'
  | 'wrench'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'small-circle';

export interface LightningBoltSpawnEvent {
  start: { x: number; y: number };
  end:   { x: number; y: number };
  opts?: Partial<{
    lifetime: number;
    thickness: number;
    color: [number, number, number, number];
    subdivision: number;
    jitter: number;
    lightRadius: number;
    lightIntensity: number;
  }>;
}

type EffectParams = CinematicGradingParams | UnderwaterParams | undefined;

export interface EventTypes {
  // Runtime control
  'runtime:pause': undefined;
  'runtime:resume': undefined;

  // Game outcome events
  'player:victory': undefined;
  'player:defeat': undefined;

  // Incident events
  'incident:minimap:marker': IncidentMinimapMarker;
  'incident:minimap:clear': { id: string };

  // Dialogue events
  'dialogue:pause': undefined;
  'dialogue:resume': undefined;

  // Menu events
  'menu:opened': { id: string };
  'menu:closed': { id: string };

  // Hud/Minimap/Waves overlays
  'waves:show': undefined;
  'waves:hide': undefined;
  'hud:show': undefined;
  'hud:hide': undefined;
  'minimap:show': undefined;
  'minimap:hide': undefined;
  'blockqueue:show': undefined;
  'blockqueue:hide': undefined;
  'experiencebar:show': undefined;
  'experiencebar:hide': undefined;
  'firingmode:show': undefined;
  'firingmode:hide': undefined;
  'meters:show': undefined;
  'meters:hide': undefined;
  'attachAllButton:show': undefined;
  'attachAllButton:hide': undefined;
  'rollButton:show': undefined;
  'rollButton:hide': undefined;
  'attachButton:show': undefined;
  'attachButton:hide': undefined;
  'combineButton:show': undefined;
  'combineButton:hide': undefined;
  'activeContractsButton:show': undefined;
  'activeContractsButton:hide': undefined;
  'jumpCastButton:show': undefined;
  'jumpCastButton:hide': undefined;

  // Abilities
  'abilities:update': undefined;
  'abilities:announcement:open': { abilityKey: string };
  'abilities:unlock-all': undefined;

  // Quests
  'quests:step:update': { stepId: QuestStepId; value: number | boolean | string };
  'quests:menu:open': { planetName: string };
  'quests:complete': { questId: string };
  'quests:announcement:open': { questId: string };
  'quests:announcement:ship': { shipId: string };
  'quests:announcement:cores': { amount: number };
  'quests:announcement:artifact': { artifactId: string };

  // Screen edge indicators (NEW!)
  'indicator:create': { id: string; worldX: number; worldY: number; color?: string; icon?: HTMLImageElement | HTMLCanvasElement };
  'indicator:remove': { id: string };

  // Camera events
  'camera:shake': { strength: number; duration: number; frequency?: number, tag?: string };

  // Player events
  'player:firemode:changed': { mode: FiringMode };
  'player:entropium:added': { amount: number };
  'player:entropium:levelup': { newLevel: number };
  'player:powerup:chosen': { powerup: PowerUpChoice };

  // Cursor events
  'cursor:change': { type: CursorChangeType };
  'cursor:restore': undefined;
  'cursor:hide': undefined;
  'cursor:show': undefined;

  // Gamepad cursor hiding should be used when the gamepad is the input device and we're in a menu
  'cursor:gamepad:hide': undefined; 
  'cursor:gamepad:show': undefined;

  // Block Drop Decision Menu
  'blockdropdecision:combine:lock': undefined;
  'blockdropdecision:combine:unlock': undefined;
  'blockdropdecision:attach-all:lock': undefined;
  'blockdropdecision:attach-all:unlock': undefined;
  'blockdropdecision:attach:lock': undefined;
  'blockdropdecision:attach:unlock': undefined;
  'blockdropdecision:roll:lock': undefined;
  'blockdropdecision:roll:unlock': undefined;
  'blockdropdecision:lock-all': undefined;
  'blockdropdecision:unlock-all': undefined;
  'blockqueue:request-place': {
    blockTypeId: string;
    index: number;
  };
  'blockqueue:request-refine': {
    blockTypeId: string;
    index: number;
  };
  'blockqueue:request-placefirst': undefined;
  'blockqueue:request-placeall': undefined;
  'blockqueue:request-roll': undefined;

  // Block Queue
  'blockqueue:lock': undefined;
  'blockqueue:unlock': undefined;
  'blockqueue:cancel-interaction': undefined;

  // UI Events
  'ui:overlay:interacting': undefined;
  'ui:overlay:not-interacting': undefined;

  // Artifact Collection
  'ui:artifacts:collection-opened': { slotIndex: 0 | 1 | 2 };
  'ui:artifacts:collection-closed': undefined;
  'ui:artifacts:equipped': { shipName: string; slotIndex: 0 | 1 | 2; artifactId: string };

  // Resolution
  'resolution:changed': { width: number; height: number };

  // Rendering – main postprocessing
  'postprocess:effect:set': {
    effectChain: { effect: PostEffectName; params?: EffectParams }[];
  };
  'postprocess:effect:add': {
    effect: PostEffectName;
    params?: EffectParams;
  };
  'postprocess:effect:remove': { effect: PostEffectName };
  'postprocess:effect:clear': undefined;

  // Rendering – background postprocessing
  'postprocess:background:effect:set': {
    effectChain: { effect: PostEffectName; params?: EffectParams }[];
  };
  'postprocess:background:effect:add': {
    effect: PostEffectName;
    params?: EffectParams;
  };
  'postprocess:background:effect:remove': { effect: PostEffectName };
  'postprocess:background:effect:clear': undefined;

  // Special FX runtime events
  'fx:spawn': Omit<SpecialFxInstance, 'time'>;
  'fx:clear': undefined;
  // Lightning FX
  'lightning:bolt:spawn': LightningBoltSpawnEvent;

  // Wave spawning / Enemy spawning
  'wave:spawn': { tag: string; wave: WaveDefinition; } // Tag to keep track of wave
  'wave:clear': { tag: string; }; // Removed by tag
  'wave:completed': { tag: string; }; // Completed by tag

  // Incident spawning / lifecycle
  'incident:trigger': { script: string; tag: string; options?: Record<string, any> };
  'incident:clear': { tag: string };

  // Pickups
  'pickup:disableDrops': undefined;
  'pickup:enableDrops': undefined;
  'pickup:collected': { typeId: string; };
  'pickup:spawn:block': {
    x: number;
    y: number;
    blockTypeId: string;
  };
  'pickup:spawn:currency': {
    x: number;
    y: number;
    currencyType: string;
    amount: number;
  };
  'pickup:spawn:repair': {
    x: number;
    y: number;
    amount: number;
  };
  'pickup:spawn:quantumAttractor': {
    x: number;
    y: number;
  };
  'pickup:spawn:shipBlueprint': {
    x: number;
    y: number;
    shipId: string;
  };

  // Planet Menus
  'tradepost:open': { tradePostId: string };
  'jumpcast:menu:open': undefined;
  'jumpcast:initiate-jump': { x: number; y: number };
  'planet:interaction:options:open': { planetDefinition: PlanetDefinition };
  'planet:interaction:options:disable-jump': undefined;
  'planet:interaction:options:enable-jump': undefined;
  'planet:interaction:options:enable-contracts': undefined;
  'planet:interaction:options:disable-contracts': undefined;

  // Entities
  'entity:destroy': {
    entity: CompositeBlockObject;
    cause: DestructionCause;
  };
}
