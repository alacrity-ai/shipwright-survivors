// // src/game/passives/json/PassiveTreeDeserializer.ts

// import type { PassiveTree } from '../interfaces/PassiveTree';
// import type { PassiveNode } from '../interfaces/PassiveNode';
// import type { PositionedPassiveNode } from '../interfaces/PositionedPassiveNode';
// import type { PassiveNodeMetadata } from '../interfaces/PassiveNodeMetadata';
// import type { PassiveConnection } from '../interfaces/PassiveConnection';

// /**
//  * Loads and parses a passive tree JSON definition into a strongly typed PassiveTree.
//  * Robust to authoring-time gaps: absent/partial node metadata becomes a placeholder node.
//  */
// export class PassiveTreeDeserializer {
//   /**
//    * Deserialize a JSON string into a PassiveTree object.
//    * @throws Error if JSON is invalid or missing required top-level fields.
//    */
//   public static fromJSON(json: string): PassiveTree {
//     let raw: any;
//     try {
//       raw = JSON.parse(json);
//     } catch (err) {
//       throw new Error(`[PassiveTreeDeserializer] Failed to parse JSON: ${(err as Error).message}`);
//     }

//     // === Basic shape validation (top-level only) ===
//     if (typeof raw.gridSize !== 'number') {
//       throw new Error(`[PassiveTreeDeserializer] Missing or invalid gridSize`);
//     }
//     if (!Array.isArray(raw.squares)) {
//       throw new Error(`[PassiveTreeDeserializer] Missing or invalid squares array`);
//     }
//     if (!Array.isArray(raw.connections)) {
//       throw new Error(`[PassiveTreeDeserializer] Missing or invalid connections array`);
//     }
//     if (typeof raw.timestamp !== 'string') {
//       throw new Error(`[PassiveTreeDeserializer] Missing or invalid timestamp`);
//     }

//     // === Build squares ===
//     const squares: PositionedPassiveNode[] = raw.squares.map((sq: any, idx: number) => {
//       if (typeof sq?.x !== 'number' || typeof sq?.y !== 'number') {
//         throw new Error(`[PassiveTreeDeserializer] Invalid square position at index ${idx}`);
//       }

//       const node: PassiveNode = this.buildNodeOrPlaceholder(sq?.metadata, idx, sq.x, sq.y);

//       const positioned: PositionedPassiveNode = {
//         node,
//         x: sq.x,
//         y: sq.y,
//         connectedTo: Array.isArray(sq?.connectedTo) ? sq.connectedTo.map(String) : [],
//         isStarter: node.id === 'root-node'
//       };

//       return positioned;
//     });

//     // === Build connections ===
//     const connections: PassiveConnection[] = raw.connections.map((c: any, idx: number) => {
//       if (!c?.from || !c?.to) {
//         throw new Error(`[PassiveTreeDeserializer] Missing from/to in connection at index ${idx}`);
//       }
//       return {
//         from: { x: Number(c.from.x), y: Number(c.from.y) },
//         to: { x: Number(c.to.x), y: Number(c.to.y) }
//       };
//     });

//     return {
//       gridSize: raw.gridSize,
//       squares,
//       connections,
//       timestamp: raw.timestamp
//     };
//   }

//   /**
//    * Returns a valid PassiveNode.
//    * - If metadata is absent → placeholder.
//    * - If metadata is present but partial → fills missing fields with safe defaults.
//    */
//   private static buildNodeOrPlaceholder(
//     metaObj: any | undefined,
//     index: number,
//     x: number,
//     y: number
//   ): PassiveNode {
//     const makePlaceholder = (reason: string): PassiveNode => {
//       const id = `__placeholder__:${index}:${x},${y}`;
//       // Helpful during iteration, not fatal:
//       console.warn(`[PassiveTreeDeserializer] Using placeholder for square ${index} (${x},${y}) — ${reason}`);
//       return {
//         id,
//         name: 'Not Implemented',
//         description: 'Not Implemented',
//         icon: 'icon-fallback',
//         nodeSize: 'minor',
//         cost: 0,
//         metadata: {}
//       };
//     };

//     if (!metaObj || typeof metaObj !== 'object') {
//       return makePlaceholder('missing metadata object');
//     }

//     // Safely extract known fields; if missing/invalid, fall back
//     const id = typeof metaObj.id === 'string' && metaObj.id.trim().length > 0
//       ? metaObj.id
//       : `__placeholder__:${index}:${x},${y}`;

//     const name = typeof metaObj.name === 'string' && metaObj.name.trim().length > 0
//       ? metaObj.name
//       : 'Not Implemented';

//     const description = typeof metaObj.description === 'string' && metaObj.description.trim().length > 0
//       ? metaObj.description
//       : 'Not Implemented';

//     const icon = typeof metaObj.icon === 'string' && metaObj.icon.trim().length > 0
//       ? metaObj.icon
//       : 'icon-fallback';

//     const nodeSize: 'minor' | 'major' =
//       metaObj.nodeSize === 'major' ? 'major' : 'minor';

//     const numericCost = Number(metaObj.cost);
//     const cost = Number.isFinite(numericCost) && numericCost >= 0 ? numericCost : 0;

//     const payload = this.validateMetadata(metaObj.metadata ?? {}, id);

//     // If *all* critical author fields are missing and we auto-generated id,
//     // treat it as a full placeholder for clarity (identical result, but clearer log).
//     const isAutoId = id.startsWith('__placeholder__');
//     const authorFieldsMissing =
//       name === 'Not Implemented' &&
//       description === 'Not Implemented' &&
//       icon === 'icon-fallback' &&
//       cost === 0 &&
//       nodeSize === 'minor' &&
//       Object.keys(payload).length === 0;

//     if (isAutoId && authorFieldsMissing) {
//       return makePlaceholder('metadata present but lacked core fields');
//     }

//     const node: PassiveNode = {
//       id,
//       name,
//       description,
//       icon,
//       nodeSize,
//       cost,
//       metadata: payload
//     };

//     return node;
//   }

//   /**
//    * Validate and coerce the metadata payload to PassiveNodeMetadata.
//    * Unknown value types are skipped with a warning.
//    * (Key allow-listing can be enforced here later for strict mode.)
//    */
//   private static validateMetadata(meta: Record<string, any>, nodeId: string): PassiveNodeMetadata {
//     const out: PassiveNodeMetadata = {};
//     if (!meta || typeof meta !== 'object') return out;

//     for (const [key, value] of Object.entries(meta)) {
//       if (
//         typeof value === 'number' ||
//         typeof value === 'boolean' ||
//         typeof value === 'string' ||
//         Array.isArray(value)
//       ) {
//         (out as any)[key] = value;
//       } else {
//         console.warn(
//           `[PassiveTreeDeserializer] Skipping unrecognized metadata type for key "${key}" in node "${nodeId}"`
//         );
//       }
//     }

//     return out;
//   }
// }


// src/game/passives/json/PassiveTreeDeserializer.ts

import type { PassiveTree } from '../interfaces/PassiveTree';
import type { PassiveNode } from '../interfaces/PassiveNode';
import type { PositionedPassiveNode } from '../interfaces/PositionedPassiveNode';
import type { PassiveNodeMetadata } from '../interfaces/PassiveNodeMetadata';
import type { PassiveConnection } from '../interfaces/PassiveConnection';

export class PassiveTreeDeserializer {
  public static fromJSON(json: string): PassiveTree {
    let raw: any;
    try {
      raw = JSON.parse(json);
    } catch (err) {
      throw new Error(`[PassiveTreeDeserializer] Failed to parse JSON: ${(err as Error).message}`);
    }

    if (typeof raw.gridSize !== 'number') throw new Error(`[PassiveTreeDeserializer] Missing or invalid gridSize`);
    if (!Array.isArray(raw.squares)) throw new Error(`[PassiveTreeDeserializer] Missing or invalid squares array`);
    if (!Array.isArray(raw.connections)) throw new Error(`[PassiveTreeDeserializer] Missing or invalid connections array`);
    if (typeof raw.timestamp !== 'string') throw new Error(`[PassiveTreeDeserializer] Missing or invalid timestamp`);

    // === Build squares ===
    const squares: PositionedPassiveNode[] = raw.squares.map((sq: any, idx: number) => {
      if (typeof sq?.x !== 'number' || typeof sq?.y !== 'number') {
        throw new Error(`[PassiveTreeDeserializer] Invalid square position at index ${idx}`);
      }

      const node: PassiveNode = this.buildNodeOrPlaceholder(sq?.metadata, idx, sq.x, sq.y);

      const positioned: PositionedPassiveNode = {
        node,
        x: sq.x,
        y: sq.y,
        // NOTE: will be replaced by canonical adjacency derived from `connections`
        connectedTo: Array.isArray(sq?.connectedTo) ? sq.connectedTo.map(String) : [],
        isStarter: node.id === 'root-node'
      };

      return positioned;
    });

    // === Build connections (authoritative) ===
    const connections: PassiveConnection[] = raw.connections.map((c: any, idx: number) => {
      if (!c?.from || !c?.to) {
        throw new Error(`[PassiveTreeDeserializer] Missing from/to in connection at index ${idx}`);
      }
      return {
        from: { x: Number(c.from.x), y: Number(c.from.y) },
        to:   { x: Number(c.to.x),   y: Number(c.to.y) }
      };
    });

    // === Indices ===
    const byXY = new Map<string, PositionedPassiveNode>();
    const byId = new Map<string, PositionedPassiveNode>();
    for (const sq of squares) {
      byXY.set(`${sq.x},${sq.y}`, sq);
      byId.set(sq.node.id, sq);
    }

    // === Derive canonical connectedTo from connections ===
    const adj = new Map<string, Set<string>>();
    const addEdge = (aId: string, bId: string) => {
      if (aId === bId) return; // ignore self-edge
      (adj.get(aId) ?? (adj.set(aId, new Set<string>()), adj.get(aId)!)).add(bId);
      (adj.get(bId) ?? (adj.set(bId, new Set<string>()), adj.get(bId)!)).add(aId);
    };

    if (connections.length > 0) {
      for (const edge of connections) {
        const from = byXY.get(`${edge.from.x},${edge.from.y}`);
        const to   = byXY.get(`${edge.to.x},${edge.to.y}`);
        if (!from || !to) {
          console.warn(
            `[PassiveTreeDeserializer] Connection references missing square(s): ` +
            `(${edge.from.x},${edge.from.y}) → (${edge.to.x},${edge.to.y})`
          );
          continue;
        }
        addEdge(from.node.id, to.node.id);
      }

      // Replace any authored connectedTo with canonical set from connections
      let warnedOnce = false;
      for (const sq of squares) {
        const canonical = Array.from(adj.get(sq.node.id) ?? []).sort();
        if (sq.connectedTo.length && !warnedOnce) {
          console.warn(
            '[PassiveTreeDeserializer] Ignoring authored connectedTo; using canonical adjacency derived from `connections`.'
          );
          warnedOnce = true;
        }
        sq.connectedTo = canonical;
      }
    } else {
      // Fallback: synthesize `connections` from authored `connectedTo` (if any)
      let synthesizedCount = 0;
      for (const sq of squares) {
        for (const targetId of sq.connectedTo) {
          const to = byId.get(targetId);
          if (!to) {
            console.warn(`[PassiveTreeDeserializer] connectedTo references unknown nodeId "${targetId}" from "${sq.node.id}"`);
            continue;
          }
          addEdge(sq.node.id, targetId);

          // Build a unique, undirected list of connections by position
          const a = { x: sq.x, y: sq.y };
          const b = { x: to.x, y: to.y };
          if (a.x === b.x && a.y === b.y) continue;

          // Ensure uniqueness by normalized key
          const keyA = `${a.x},${a.y}`, keyB = `${b.x},${b.y}`;
          // Store in a Set of string keys to de-dup, then materialize at end
          // (Implement local scope Set)
        }
      }

      // Materialize unique connections from adj
      const uniq = new Set<string>();
      const synthesized: PassiveConnection[] = [];
      for (const [aId, nbrs] of adj) {
        const a = byId.get(aId)!;
        for (const bId of nbrs) {
          if (aId > bId) continue; // undirected de-dup
          const b = byId.get(bId)!;
          const key = `${a.x},${a.y}|${b.x},${b.y}`;
          if (uniq.has(key)) continue;
          uniq.add(key);
          synthesized.push({ from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y } });
          synthesizedCount++;
        }
      }

      if (synthesizedCount > 0) {
        console.warn(
          `[PassiveTreeDeserializer] 'connections' missing; synthesized ${synthesizedCount} from authored connectedTo.`
        );
      }

      // Normalize each node’s connectedTo from adj (sorted, unique)
      for (const sq of squares) {
        sq.connectedTo = Array.from(adj.get(sq.node.id) ?? []).sort();
      }

      // Replace the empty connections array with synthesized list
      (connections as PassiveConnection[]).push(...synthesized);
    }

    return {
      gridSize: raw.gridSize,
      squares,
      connections,
      timestamp: raw.timestamp
    };
  }

  private static buildNodeOrPlaceholder(metaObj: any | undefined, index: number, x: number, y: number): PassiveNode {
    const makePlaceholder = (reason: string): PassiveNode => {
      const id = `__placeholder__:${index}:${x},${y}`;
      console.warn(`[PassiveTreeDeserializer] Using placeholder for square ${index} (${x},${y}) — ${reason}`);
      return {
        id,
        name: 'Not Implemented',
        description: 'Not Implemented',
        icon: 'icon-fallback',
        nodeSize: 'minor',
        cost: 0,
        metadata: {}
      };
    };

    if (!metaObj || typeof metaObj !== 'object') return makePlaceholder('missing metadata object');

    const id = typeof metaObj.id === 'string' && metaObj.id.trim().length > 0
      ? metaObj.id
      : `__placeholder__:${index}:${x},${y}`;

    const name = typeof metaObj.name === 'string' && metaObj.name.trim().length > 0 ? metaObj.name : 'Not Implemented';
    const description = typeof metaObj.description === 'string' && metaObj.description.trim().length > 0 ? metaObj.description : 'Not Implemented';
    const icon = typeof metaObj.icon === 'string' && metaObj.icon.trim().length > 0 ? metaObj.icon : 'icon-fallback';
    const nodeSize: 'minor' | 'major' = metaObj.nodeSize === 'major' ? 'major' : 'minor';

    const numericCost = Number(metaObj.cost);
    const cost = Number.isFinite(numericCost) && numericCost >= 0 ? numericCost : 0;

    const payload = this.validateMetadata(metaObj.metadata ?? {}, id);

    const isAutoId = id.startsWith('__placeholder__');
    const authorFieldsMissing =
      name === 'Not Implemented' &&
      description === 'Not Implemented' &&
      icon === 'icon-fallback' &&
      cost === 0 &&
      nodeSize === 'minor' &&
      Object.keys(payload).length === 0;

    if (isAutoId && authorFieldsMissing) return makePlaceholder('metadata present but lacked core fields');

    return { id, name, description, icon, nodeSize, cost, metadata: payload };
  }

  private static validateMetadata(meta: Record<string, any>, nodeId: string): PassiveNodeMetadata {
    const out: PassiveNodeMetadata = {};
    if (!meta || typeof meta !== 'object') return out;

    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' || Array.isArray(value)) {
        (out as any)[key] = value;
      } else {
        console.warn(`[PassiveTreeDeserializer] Skipping unrecognized metadata type for key "${key}" in node "${nodeId}"`);
      }
    }
    return out;
  }
}
