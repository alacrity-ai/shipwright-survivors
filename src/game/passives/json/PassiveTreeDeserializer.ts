// src/game/passives/json/PassiveTreeDeserializer.ts

import type { PassiveTree } from '../interfaces/PassiveTree';
import type { PassiveNode } from '../interfaces/PassiveNode';
import type { PositionedPassiveNode } from '../interfaces/PositionedPassiveNode';
import type { PassiveNodeMetadata } from '../interfaces/PassiveNodeMetadata';
import type { PassiveConnection } from '../interfaces/PassiveConnection';

/**
 * Loads and parses a passive tree JSON definition into a strongly typed PassiveTree.
 * Performs basic structural validation and infers `isStarter` status for the root node.
 */
export class PassiveTreeDeserializer {
  /**
   * Deserialize a JSON string into a PassiveTree object.
   * @throws Error if JSON is invalid or missing required fields.
   */
  public static fromJSON(json: string): PassiveTree {
    let raw: any;
    try {
      raw = JSON.parse(json);
    } catch (err) {
      throw new Error(`[PassiveTreeDeserializer] Failed to parse JSON: ${(err as Error).message}`);
    }

    // === Basic shape validation ===
    if (typeof raw.gridSize !== 'number') {
      throw new Error(`[PassiveTreeDeserializer] Missing or invalid gridSize`);
    }
    if (!Array.isArray(raw.squares)) {
      throw new Error(`[PassiveTreeDeserializer] Missing or invalid squares array`);
    }
    if (!Array.isArray(raw.connections)) {
      throw new Error(`[PassiveTreeDeserializer] Missing or invalid connections array`);
    }
    if (typeof raw.timestamp !== 'string') {
      throw new Error(`[PassiveTreeDeserializer] Missing or invalid timestamp`);
    }

    // === Build squares ===
    const squares: PositionedPassiveNode[] = raw.squares.map((sq: any, idx: number) => {
      if (typeof sq.x !== 'number' || typeof sq.y !== 'number') {
        throw new Error(`[PassiveTreeDeserializer] Invalid square position at index ${idx}`);
      }
      if (!sq.metadata || typeof sq.metadata !== 'object') {
        throw new Error(`[PassiveTreeDeserializer] Missing metadata for square at index ${idx}`);
      }

      const node: PassiveNode = {
        id: String(sq.metadata.id),
        name: String(sq.metadata.name),
        description: String(sq.metadata.description),
        icon: String(sq.metadata.icon),
        nodeSize: sq.metadata.nodeSize === 'major' ? 'major' : 'minor',
        cost: Number(sq.metadata.cost),
        metadata: PassiveTreeDeserializer.validateMetadata(sq.metadata.metadata ?? {}, sq.metadata.id)
      };

      const positioned: PositionedPassiveNode = {
        node,
        x: sq.x,
        y: sq.y,
        connectedTo: Array.isArray(sq.connectedTo) ? sq.connectedTo.map(String) : [],
        isStarter: node.id === 'root-node'
      };

      return positioned;
    });

    // === Build connections ===
    const connections: PassiveConnection[] = raw.connections.map((c: any, idx: number) => {
      if (!c.from || !c.to) {
        throw new Error(`[PassiveTreeDeserializer] Missing from/to in connection at index ${idx}`);
      }
      return {
        from: { x: Number(c.from.x), y: Number(c.from.y) },
        to: { x: Number(c.to.x), y: Number(c.to.y) }
      };
    });

    return {
      gridSize: raw.gridSize,
      squares,
      connections,
      timestamp: raw.timestamp
    };
  }

  /**
   * Validate and coerce the metadata object to PassiveNodeMetadata.
   * For now, this is a light structural check — full key validation can be added here.
   */
  private static validateMetadata(meta: Record<string, any>, nodeId: string): PassiveNodeMetadata {
    const out: PassiveNodeMetadata = {};

    for (const [key, value] of Object.entries(meta)) {
      if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' || Array.isArray(value)) {
        // Acceptable value types
        (out as any)[key] = value;
      } else {
        console.warn(`[PassiveTreeDeserializer] Skipping unrecognized metadata type for key "${key}" in node "${nodeId}"`);
      }
    }

    return out;
  }
}
