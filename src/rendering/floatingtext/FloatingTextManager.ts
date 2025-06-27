// src/rendering/floatingtext/FloatingTextManager.ts

import { FloatingTextEntity, FloatingTextPositionResolver } from '@/rendering/floatingtext/interfaces/FloatingTextEntity';
import { CanvasManager } from '@/core/CanvasManager';
import type { FloatingTextBehaviorOptions } from '@/rendering/floatingtext/interfaces/FloatingTextBehaviorOptions';
import type { Camera } from '@/core/Camera';


export class FloatingTextManager {
  private floatingTexts: FloatingTextEntity[] = [];
  private canvasManager: CanvasManager;
  private ctx: CanvasRenderingContext2D;

  // Channel tracking
  private channelMap: Map<string, { entity: FloatingTextEntity; lastUpdate: number }> = new Map();
  private readonly MERGE_WINDOW_MS = 50;

  constructor() {
    this.canvasManager = CanvasManager.getInstance();
    this.ctx = this.canvasManager.getContext('ui');
  }

  public update(dt: number): void {
    for (const ft of this.floatingTexts) {
      ft.update(dt);
    }
    // Cleanup expired
    this.floatingTexts = this.floatingTexts.filter(ft => !ft.isExpired());
  }

  public render(): void {
    for (const ft of this.floatingTexts) {
      ft.render(this.ctx);
    }
  }

  public clear(): void {
    this.floatingTexts.length = 0;
    this.channelMap.clear();
  }

  // === Factory Methods ===

  public createScreenText(
    text: string,
    screenX: number,
    screenY: number,
    fontSize: number = 14,
    fontFamily: string = 'monospace',
    life: number = 0.6,
    speed: number = 30,
    alpha: number = 1.0,
    color: string = '#FFFFFF',
    behavior?: FloatingTextBehaviorOptions,
    channel?: string
  ): void {
    const resolver: FloatingTextPositionResolver = () => ({ x: screenX, y: screenY });
    this.create(text, resolver, fontSize, fontFamily, life, speed, alpha, color, behavior, channel);
  }

  public createWorldText(
    text: string,
    worldX: number,
    worldY: number,
    camera: Camera,
    fontSize: number = 14,
    fontFamily: string = 'monospace',
    life: number = 0.6,
    speed: number = 30,
    alpha: number = 1.0,
    color: string = '#FFFFFF',
    behavior?: FloatingTextBehaviorOptions,
    channel?: string
  ): void {
    const resolver: FloatingTextPositionResolver = () => camera.worldToScreen(worldX, worldY);
    this.create(text, resolver, fontSize, fontFamily, life, speed, alpha, color, behavior, channel);
  }

  // === Core Create with Channel Merge ===

  private create(
    text: string,
    getPosition: FloatingTextPositionResolver,
    fontSize: number,
    fontFamily: string,
    life: number,
    speed: number,
    alpha: number,
    color: string,
    behavior?: FloatingTextBehaviorOptions,
    channel?: string
  ): void {
    const now = performance.now();

    if (channel) {
      const existing = this.channelMap.get(channel);
      if (existing && now - existing.lastUpdate < this.MERGE_WINDOW_MS) {
        // Try to merge values
        const currentValue = parseFloat(existing.entity.text);
        const newValue = parseFloat(text);

        if (!isNaN(currentValue) && !isNaN(newValue)) {
          const merged = currentValue + newValue;
          existing.entity.text = `${Math.round(merged)}`;
          existing.entity.alpha = 1;
          existing.entity.life = life;
          existing.lastUpdate = now;

          return;
        }

        // If non-numeric or merging fails, fall through and overwrite
      }
    }

    const entity = new FloatingTextEntity(
      text,
      getPosition,
      fontSize,
      fontFamily,
      life,
      speed,
      alpha,
      color,
      behavior
    );

    this.floatingTexts.push(entity);

    if (channel) {
      this.channelMap.set(channel, { entity, lastUpdate: now });
    }
  }
}
