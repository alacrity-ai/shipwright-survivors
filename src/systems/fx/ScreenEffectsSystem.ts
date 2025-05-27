import { CanvasManager } from '@/core/CanvasManager';

interface ScreenFlash {
  color: string;
  intensity: number; // 0-1
  duration: number;
  currentTime: number;
}

export class ScreenEffectsSystem {
  private flashes: ScreenFlash[] = [];
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvasManager: CanvasManager) {
    try {
      // Use the overlay canvas for screen effects
      this.ctx = canvasManager.getContext('overlay');
      this.width = canvasManager.getWidth();
      this.height = canvasManager.getHeight();
    } catch (error) {
      console.error('Failed to initialize ScreenEffectsSystem:', error);
      // Create a fallback context to prevent crashes
      const dummyCanvas = document.createElement('canvas');
      this.ctx = dummyCanvas.getContext('2d')!;
      this.width = 1;
      this.height = 1;
    }
  }

  /**
   * Create a screen flash effect
   * @param color The color of the flash (e.g., 'white', 'rgba(255,0,0,0.5)')
   * @param intensity How strong the flash is (0-1)
   * @param duration How long the flash lasts in seconds
   */
  createFlash(color: string = 'white', intensity: number = 0.5, duration: number = 0.3): void {
    this.flashes.push({
      color,
      intensity: Math.max(0, Math.min(1, intensity)), // Clamp between 0-1
      duration,
      currentTime: 0
    });
  }

  /**
   * Create an explosion flash (white-yellow)
   * @param intensity How strong the flash is (0-1)
   */
  createExplosionFlash(intensity: number = 0.3): void {
    this.createFlash('rgba(255, 255, 220, 1)', intensity, 0.2);
  }

  /**
   * Create a damage flash (red)
   * @param intensity How strong the flash is (0-1)
   */
  createDamageFlash(intensity: number = 0.2): void {
    this.createFlash('rgba(255, 0, 0, 1)', intensity, 0.15);
  }

  update(dt: number): void {
    // Update all active flashes
    for (const flash of this.flashes) {
      flash.currentTime += dt;
    }

    // Remove expired flashes
    this.flashes = this.flashes.filter(flash => flash.currentTime < flash.duration);
  }

  render(): void {
    if (!this.ctx || this.flashes.length === 0) return;

    try {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      // Render all active flashes
      for (const flash of this.flashes) {
        // Calculate alpha based on a smooth curve
        // Start at full intensity, then fade out
        const progress = flash.currentTime / flash.duration;
        const alpha = flash.intensity * (1 - progress);

        // Apply the flash as a full-screen overlay
        ctx.fillStyle = this.getColorWithAlpha(flash.color, alpha);
        ctx.fillRect(0, 0, this.width, this.height);
      }
    } catch (error) {
      console.error('Error rendering screen effects:', error);
    }
  }

  private getColorWithAlpha(color: string, alpha: number): string {
    // If color is already in rgba format, replace the alpha
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${alpha})`);
    }
    
    // If color is in rgb format, convert to rgba
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    
    // For named colors or hex, create a temporary element to get RGB values
    const tempElement = document.createElement('div');
    tempElement.style.color = color;
    document.body.appendChild(tempElement);
    const computedColor = getComputedStyle(tempElement).color;
    document.body.removeChild(tempElement);
    
    // Convert rgb to rgba
    return computedColor.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
  }
}
