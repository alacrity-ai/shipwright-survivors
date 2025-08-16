// // src/game/waves/io/validation.ts

// import { z } from 'zod';

// export const WavesFileZ = z.object({
//   version: z.literal(1),
//   affixes: z.record(z.any()).optional(),
//   behaviors: z.record(z.object({
//     preset: z.string(),
//     params: z.record(z.any()).optional()
//   })).optional(),
//   waves: z.array(z.object({
//     mods: z.array(z.string()),
//     ships: z.array(z.object({
//       shipId: z.string(),
//       count: z.number().int().nonnegative(),
//       hunter: z.boolean().optional(),
//       noClip: z.boolean().optional(),
//       onAllDefeated: z.string().optional(),
//       affixesRef: z.string().optional(),
//       affixes: z.record(z.any()).optional(),
//       behaviorRef: z.string().optional(),
//       behavior: z.object({
//         preset: z.string(),
//         params: z.record(z.any()).optional()
//       }).optional()
//     })),
//     incidents: z.array(z.object({
//       spawnChance: z.number(),
//       script: z.string(),
//       options: z.record(z.any()).optional(),
//       label: z.string().optional(),
//       delaySeconds: z.number().optional()
//     })).optional(),
//     formations: z.array(z.any()).optional(),
//     music: z.any().optional(),
//     lightingSettings: z.object({ clearColor: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional() }).optional(),
//     duration: z.union([z.number(), z.literal("Infinity")]).optional(),
//     spawnDistribution: z.enum(['at','random','outer','inner','aroundPlayer','aroundPlayerNear','center']),
//     atCoords: z.object({ x: z.number(), y: z.number(), spreadRadius: z.number().optional() }).optional(),
//     isBoss: z.boolean().optional(),
//     sustainMode: z.boolean().optional(),
//     spawnDelay: z.number().optional()
//   }))
// });
