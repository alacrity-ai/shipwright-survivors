# WAVES.md

This document serves as a definitive guide to the **Wave System** in Shipwright Survivors. It explains how waves are defined, spawned, progressed, and tracked, including modular extensibility for custom behaviors.

---

## 🧠 Overview

The wave system enables structured orchestration of enemy encounters using declarative definitions and runtime composition.

Each wave is defined in JSON-compatible `WaveDefinition` structures and interpreted through an executor, spawning ships and triggering custom scripts.

---

## 🗂️ Architecture

### Core Classes

| Module | Responsibility |
|--------|----------------|
| `WaveOrchestrator` | Controls wave timing and progression. Notifies ship destruction. |
| `WaveExecutor` | Spawns ships/formations/incidents based on the current `WaveDefinition`. |
| `WaveExecutionContext` | Tracks all spawned ships and their group membership for defeat detection. |
| `SpawnCoordinateResolver` | Computes spawn positions using the `spawnDistribution` policy. |
| `WaveModifiersApplier` | Applies affix-based modifiers to ships per wave (e.g., "fast", "shielded"). |
| `ScriptRunner` | Executes declarative wave scripts (e.g., `onAllDefeated`). |

---

## 📄 WaveDefinition

Located in: `types/WaveDefinition.ts`

```ts
export interface WaveDefinition {
  mods: string[];
  ships: WaveShipEntry[];
  incidents?: WaveIncidentEntry[];
  formations?: ShipFormationEntry[];
  music?: MusicTrack;
  lightingSettings?: WaveLightingSettings;
  duration?: number; // Seconds until auto-advancement. Infinity = manual progression
  spawnDistribution: 'random' | 'outer' | 'inner' | 'aroundPlayer';
}
```

### 🛠️ WaveShipEntry

```
export interface WaveShipEntry {
  shipId: string;
  count: number;
  hunter?: boolean;
  behaviorProfile?: BehaviorProfile;
  affixes?: ShipAffixes;
  onAllDefeated?: string; // Script to run when all ships in this group are destroyed
}
```

All ships spawned by the same entry are grouped logically. When all are destroyed, onAllDefeated (if defined) is executed via the ScriptRunner.

### 📦 Formations

Formations are declared via ShipFormationEntry[] and spawned as coordinated groups via ShipFormationFactory. These currently do not support onAllDefeated but could in future.

### 🎯 Spawn Coordinate Policies
The field spawnDistribution determines where enemies appear:

| Mode           | Description                                              |
| -------------- | -------------------------------------------------------- |
| `random`       | Anywhere on the map. No spatial constraints.             |
| `outer`        | Enemies spawn **outside** a central forbidden zone.      |
| `inner`        | Enemies spawn **within** a central zone near map center. |
| `aroundPlayer` | Enemies appear in a ring around the current player ship. |

```
// Forbidden zone only applies to 'outer'
const forbiddenZone = {
  xMin: -1200, xMax: 1200,
  yMin: -1200, yMax: 1200
};
```

### 🧪 Scripts
Wave scripts are declared by name (e.g., "onAllDefeated": "progressToNextWave"), and executed through the ScriptRunner.

You can register scripts at runtime via:
```
scriptRunner.register('progressToNextWave', (ctx) => {
  waveOrchestrator.spawnNextWave(); // if manually exposed
});
```

Context passed to script:
```
interface ScriptContext {
  waveIndex: number;
  waveDefinition: WaveDefinition;
}
```

🎮 Runtime Behavior
WaveOrchestrator runs update(dt) per frame.

First wave is delayed by initialDelay = 10 seconds.

Subsequent waves are spaced by WaveDefinition.duration or a default of 120 seconds.

duration: Infinity disables automatic advancement.

Ship destruction is routed through notifyShipDestroyed(ship) for defeat tracking.

### 🧱 Modifiers
Modifiers apply affixes to all ships spawned in the wave.

Examples:
```
modAffixMap = {
  'fast': { thrustPowerMulti: 1.6, turnPowerMulti: 1.6 },
  'shielded': { shieldRadiusMulti: 1.25, shieldEfficiencyMulti: 1.4 },
}
```
Modifiers are stackable. Internally merged before being applied to the ship's affix state.

### 🚦Wave Completion
The orchestrator does not decide when the mission ends.

Instead:

It exposes areAllWavesCompleted().

Consumers (e.g., mission engine, scripted incident) may react to that to trigger end conditions.

### ✅ Example

```
const wave1: WaveDefinition = {
  mods: ['fast'],
  spawnDistribution: 'outer',
  duration: 45,
  ships: [
    { shipId: 'drone', count: 10, onAllDefeated: 'progressToNextWave' },
    { shipId: 'interceptor', count: 2 },
  ],
  music: { file: 'assets/sounds/music/track_01.mp3' },
};
```

| File                         | Role                                            |
| ---------------------------- | ----------------------------------------------- |
| `WaveOrchestrator.ts`        | Top-level control of wave lifecycle             |
| `WaveExecutor.ts`            | Spawns ships/formations/incidents               |
| `WaveExecutionContext.ts`    | Tracks active ships and evaluates defeat groups |
| `SpawnCoordinateResolver.ts` | Computes spawn positions per policy             |
| `ScriptRunner.ts`            | Declares and runs defeat logic scripts          |
| `WaveModifiersApplier.ts`    | Applies affix logic based on modifier strings   |

```
src/game/waves
├── WaveSpawner.bak.ts
├── executor
│   ├── SpawnCoordinateResolver.ts
│   ├── WaveExecutor.ts
│   └── WaveModifersApplier.ts
├── missions
│   ├── Mission1Waves.bak.ts
│   ├── Mission1Waves.ts
│   ├── Mission2Waves.ts
│   ├── Mission3Waves.ts
│   └── Mission4Waves.ts
├── orchestrator
│   ├── WaveExecutionContext.ts
│   ├── WaveInstance.ts
│   └── WaveOrchestrator.ts
├── scripting
│   └── ScriptRunner.ts
└── types
    └── WaveDefinition.ts
```