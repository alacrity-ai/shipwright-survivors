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
  'blockdropdecision:refine:lock': undefined;
  'blockdropdecision:refine:unlock': undefined;
  'blockdropdecision:attach-all:lock': undefined;
  'blockdropdecision:attach-all:unlock': undefined;
  'blockdropdecision:attach:lock': undefined;
  'blockdropdecision:attach:unlock': undefined;
  'blockdropdecision:roll:lock': undefined;
  'blockdropdecision:roll:unlock': undefined;
  'blockdropdecision:lock-all': undefined;
  'blockdropdecision:unlock-all': undefined;

  // Block Queue
  'blockqueue:lock': undefined;
  'blockqueue:unlock': undefined;

  // UI Events
  'ui:overlay:interacting': undefined;
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

  // Tradeposts
  'tradepost:open': { tradePostId: string };

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

  'blockqueue:request-placeall': undefined;
}
