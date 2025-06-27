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

type EffectParams = CinematicGradingParams | UnderwaterParams | undefined;

export interface EventTypes {
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

  // Camera events
  'camera:shake': { strength: number; duration: number; frequency?: number };

  // Player events
  'player:firemode:changed': { mode: FiringMode };
  'player:entropium:added': { amount: number };
  'player:entropium:levelup': { newLevel: number };
  'player:powerup:chosen': { powerup: PowerUpChoice };

  // Cursor events
  'cursor:change': { type: CursorChangeType };
  'cursor:restore': undefined;

  // UI Events
  'ui:overlay:interacting': undefined
  'ui:overlay:not-interacting': undefined;

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

  // Wave spawning / Enemy spawning
  'wave:spawn': { tag: string; wave: WaveDefinition; } // Tag to keep track of wave
  'wave:clear': { tag: string; }; // Removed by tag
  'wave:completed': { tag: string; }; // Completed by tag

  // Incident spawning / lifecycle
  'incident:trigger': { script: string; tag: string; options?: Record<string, any> };
  'incident:clear': { tag: string };

  // Pickups
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

  // Entities
  'entity:destroy': {
    entity: CompositeBlockObject;
    cause: DestructionCause;
  };

  // UI-triggered block placement from BlockQueueDisplayManager
  'blockqueue:request-place': {
    blockTypeId: string;
    index: number;
  };

  'blockqueue:request-refine': {
    blockTypeId: string;
    index: number;
  };
}
