import { AnimatedSprite } from './entities/AnimatedSprite';
import { AnimatedSpriteFactory } from './factories/AnimatedSpriteFactory';
import { SpriteSheetManager } from './SpriteSheetManager';
import { DefaultSpriteSheetManifest } from './registry/SpriteSheetManifest';
import { SpriteAnimationRegistry } from './registry/SpriteAnimationRegistry';
import type { SpriteRegistration } from './interfaces/SpriteRegistration';
import type { SpriteSheet } from './interfaces/SpriteSheet';

type SpriteInstanceKey = string;

interface SpriteInstance {
  sprite: AnimatedSprite;
  x: number;
  y: number;
  visible: boolean;
}

export class AnimatedSpriteOrchestrator {
  private readonly sprites = new Map<SpriteInstanceKey, SpriteInstance>();
  private readonly sheetManager = new SpriteSheetManager();
  private factory: AnimatedSpriteFactory | null = null;
  private loadingPromise: Promise<void> | null = null;
  private initialized = false;
  private defaultScale: number = 1.0;

  constructor(private readonly renderContext: CanvasRenderingContext2D) {}

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    if (!this.loadingPromise) {
      this.loadingPromise = this.sheetManager
        .loadAll(DefaultSpriteSheetManifest)
        .then(() => {
          const sheets: Record<string, SpriteSheet> = this.sheetManager.getSheets();
          this.factory = new AnimatedSpriteFactory(sheets, SpriteAnimationRegistry);
          this.initialized = true;
        });
    }

    await this.loadingPromise;
  }

  public async registerSprites(defs: SpriteRegistration[]): Promise<void> {
    await this.ensureInitialized();

    for (const def of defs) {
      if (this.sprites.has(def.key)) {
        console.warn(`[Orchestrator] Sprite with key '${def.key}' already registered; skipping.`);
        continue;
      }

      const sprite = this.factory!.createAnimatedSprite(def.sheetId, def.animationId);
      sprite.setScale(this.defaultScale);

      const x = def.x ?? 0;
      const y = def.y ?? 0;
      const visible = false; // always default to invisible

      this.sprites.set(def.key, { sprite, x, y, visible });
    }
  }

  public placeSprite(key: SpriteInstanceKey, x: number, y: number): void {
    const instance = this.sprites.get(key);
    if (!instance) {
      console.warn(`[Orchestrator] Cannot place sprite with key '${key}': not registered.`);
      return;
    }
    instance.x = x;
    instance.y = y;
    instance.visible = true;
  }

  public update(dt: number): void {
    if (!this.initialized) return;

    for (const { sprite } of this.sprites.values()) {
      sprite.update(dt);
    }
  }

  public render(): void {
    if (!this.initialized) return;

    for (const { sprite, x, y, visible } of this.sprites.values()) {
      if (visible) {
        sprite.draw(this.renderContext, x, y);
      }
    }
  }

  public destroy(): void {
    for (const { sprite } of this.sprites.values()) {
      sprite.pause();
    }
    this.sprites.clear();
    this.initialized = false;
    this.loadingPromise = null;
    this.factory = null;
  }

  public getSprite(key: SpriteInstanceKey): AnimatedSprite | undefined {
    return this.sprites.get(key)?.sprite;
  }

  public setPosition(key: SpriteInstanceKey, x: number, y: number): void {
    const instance = this.sprites.get(key);
    if (instance) {
      instance.x = x;
      instance.y = y;
    }
  }

  public setVisible(key: SpriteInstanceKey, visible: boolean): void {
    const instance = this.sprites.get(key);
    if (instance) {
      instance.visible = visible;
    }
  }

  public pauseSprite(key: SpriteInstanceKey): void {
    this.sprites.get(key)?.sprite.pause();
  }

  public playSprite(key: SpriteInstanceKey): void {
    this.sprites.get(key)?.sprite.play();
  }

  public setGlobalScale(scale: number): void {
    this.defaultScale = scale;

    for (const { sprite } of this.sprites.values()) {
      sprite.setScale(scale);
    }
  }
}
