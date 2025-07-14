/* ────────────────────────────────────────────────────────────────
 *  @/game/quests/interfaces/QuestStep.ts
 *  • Strongly-typed discriminated union representing a single
 *    measurable objective within a quest.
 * ───────────────────────────────────────────────────────────── */

export type QuestStep =
  | CursedCargoIncidentsClearedStep
  | SpaceStationsSlainStep
  | SpaceStations2SlainStep
  | PlanetsExploredStep
  | BrawlersSlainStep
  | TimeSurvivedStep
  | Tier5BlocksAttachedStep
  | HitlessRunStep
  | BossSlainStep;

export const aggregators: Record<Aggregation, (prev: any, next: any) => any> = {
  add:      (p: number, n: number)  => (p ?? 0) + n,
  set:      (_: any,    n: any)     => n,
  or:       (p: boolean, n: boolean)=> (p ?? false) || n,
  replace:  (_: any,    n: any)     => n,
} as const;

// QuestStep.ts --------------------------------------------------------------
export const DEFAULT_AGGREGATION: Record<QuestStepId, Aggregation> = {
  cursedCargoIncidentsCleared: 'add',
  spaceStationsSlain:          'add',
  spaceStations2Slain:         'add',
  brawlersSlain:               'add',
  timeSurvived:                'set',
  tier5BlocksAttached:         'add',
  hitlessRun:                  'or',
  planetsExplored:             'or',
  bossSlain:                   'replace',
} as const;

/** How successive updates are combined. */
export type Aggregation =
  | 'add'        // numeric accumulation
  | 'set'        // last value wins
  | 'or'         // boolean OR
  | 'replace';   // literal replacement (strings)

/** Shared discriminant key */
interface BaseQuestStep<
  K extends string,
  V extends number | boolean | string,
  A extends Aggregation = 'add' // sensible default
> {
  kind: K;
  progress: V;
  goal: V;
  aggregation?: A;              // optional for terseness
}

/*───────────────────────────────────────────────────────────*
 *  Numerical objectives
 *───────────────────────────────────────────────────────────*/
export interface CursedCargoIncidentsClearedStep
  extends BaseQuestStep<'cursedCargoIncidentsCleared', number> {}

export interface SpaceStationsSlainStep
  extends BaseQuestStep<'spaceStationsSlain', number> {}

export interface SpaceStations2SlainStep
  extends BaseQuestStep<'spaceStations2Slain', number> {}

export interface BrawlersSlainStep extends BaseQuestStep<'brawlersSlain', number> {}

export interface TimeSurvivedStep extends BaseQuestStep<'timeSurvived', number, 'set'> {} // This is the step we're examining

export interface Tier5BlocksAttachedStep
  extends BaseQuestStep<'tier5BlocksAttached', number> {}


/*───────────────────────────────────────────────────────────*
 *  Boolean objective
 *───────────────────────────────────────────────────────────*/
export interface HitlessRunStep
  extends BaseQuestStep<'hitlessRun', boolean> {}

export interface PlanetsExploredStep
  extends BaseQuestStep<'planetsExplored', boolean> {}

/*───────────────────────────────────────────────────────────*
 *  String objective
 *───────────────────────────────────────────────────────────*/
export interface BossSlainStep
  extends BaseQuestStep<'bossSlain', string> {}

export type QuestStepId = QuestStep['kind'];
