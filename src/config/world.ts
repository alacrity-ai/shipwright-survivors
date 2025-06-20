// src/config/world.ts
class WorldSettings {
  private static instance: WorldSettings;

  private worldWidth: number = 32000;
  private worldHeight: number = 32000;
  private worldCenter: { x: number; y: number } = { x: 0, y: 0 };

  private constructor() {}

  public static getInstance(): WorldSettings {
    if (!WorldSettings.instance) {
      WorldSettings.instance = new WorldSettings();
    }
    return WorldSettings.instance;
  }

  public getWorldWidth(): number {
    return this.worldWidth;
  }

  public getWorldHeight(): number {
    return this.worldHeight;
  }

  public getWorldCenter(): { x: number; y: number } {
    return this.worldCenter;
  }

  public setWorldWidth(width: number): void {
    this.worldWidth = width;
  }

  public setWorldHeight(height: number): void {
    this.worldHeight = height;
  }
}

export const getWorldWidth = (): number => WorldSettings.getInstance().getWorldWidth();
export const getWorldHeight = (): number => WorldSettings.getInstance().getWorldHeight();
export const getWorldCenter = (): { x: number; y: number } => WorldSettings.getInstance().getWorldCenter();

export const WorldSettingsManager = WorldSettings.getInstance();
