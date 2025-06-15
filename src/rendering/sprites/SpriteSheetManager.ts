// src/rendering/sprites/SpriteSheetManager.ts

import { SpriteSheetLoader } from '@/rendering/sprites/loaders/SpriteSheetLoader';
import type { SpriteSheet } from '@/rendering/sprites/interfaces/SpriteSheet';
import type { SpriteSheetManifest as SpriteSheetManifestType } from '@/rendering/sprites/interfaces/SpriteSheetManifest';

export class SpriteSheetManager {
  private readonly sheets = new Map<string, SpriteSheet>();

  public async loadAll(manifest: SpriteSheetManifestType): Promise<void> {
    const entries = Object.entries(manifest);

    const loadPromises = entries.map(async ([sheetId, config]) => {
      try {
        const loader = new SpriteSheetLoader(
          config.path,
          config.cols,
          config.rows,
          config.frameWidth,
          config.frameHeight
        );
        const sheet = await loader.load();
        this.sheets.set(sheetId, sheet);
        console.log(`[SpriteSheetManager] Loaded '${sheetId}' from '${config.path}'`);
      } catch (err) {
        console.error(`[SpriteSheetManager] Failed to load sprite sheet '${sheetId}' at '${config.path}':`, err);
        throw err;
      }
    });

    await Promise.all(loadPromises);
  }

  public getSheets(): Record<string, SpriteSheet> {
    const out: Record<string, SpriteSheet> = {};
    for (const [key, value] of this.sheets.entries()) {
      out[key] = value;
    }
    return out;
  }

  public getSheet(id: string): SpriteSheet | undefined {
    const sheet = this.sheets.get(id);
    if (!sheet) {
      console.warn(`[SpriteSheetManager] Sheet not found for id '${id}'`);
    }
    return sheet;
  }
}
