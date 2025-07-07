// import { getMinimalistLetterIcon } from '@/rendering/cache/Letters';

// import { getUniformScaleFactor } from '@/config/view';

// export class WordRenderer {
//   private word: string = '';
//   private readonly icons: (HTMLCanvasElement | null)[] = [];

//   constructor(
//     private x: number,
//     private y: number,
//     private scale: number = getUniformScaleFactor(),
//   ) {}

//   public setWord(word: string): void {
//     this.word = word.toUpperCase();
//     this.icons.length = 0;

//     for (const char of this.word) {
//       if (char === ' ') {
//         this.icons.push(null);
//       } else {
//         try {
//           this.icons.push(getMinimalistLetterIcon(char));
//         } catch {
//           console.warn(`[WordRenderer] Unsupported character: '${char}'`);
//           this.icons.push(null);
//         }
//       }
//     }
//   }

//   public setPosition(x: number, y: number): void {
//     this.x = x;
//     this.y = y;
//   }

//   public setScale(scale: number): void {
//     this.scale = scale;
//   }

//   public render(ctx: CanvasRenderingContext2D): void {
//     const glyphSize = 128 * this.scale;
//     const spacing = 4 * this.scale;

//     let cursorX = this.x;

//     for (const icon of this.icons) {
//       if (icon === null) {
//         // Space character or unsupported glyph
//         cursorX += glyphSize * 0.5;
//         continue;
//       }

//       const drawWidth = glyphSize;
//       const drawHeight = glyphSize;
//       const drawY = this.y - drawHeight / 2;

//       ctx.drawImage(icon, cursorX, drawY, drawWidth, drawHeight);
//       cursorX += (glyphSize / 2) + spacing;
//     }
//   }
// }

// /* Usage:
// const wordRenderer = new WordRenderer(100, 200, 1.5);
// wordRenderer.setWord('SHIP HOP');

// function draw(ctx: CanvasRenderingContext2D) {
//   wordRenderer.render(ctx);
// }
// */

import { getMinimalistLetterIcon } from '@/rendering/cache/Letters';
import { getUniformScaleFactor } from '@/config/view';

interface PulseConfig {
  enabled: boolean;
  baseOpacity: number;
  pulseIntensity: number;
  pulseSpeed: number;
  waveDelay: number;           // Delay between letters in wave effect
  useWaveEffect: boolean;      // Whether letters pulse in sequence
  pulseType: 'sine' | 'ease' | 'breath';
}

export class WordRenderer {
  private word: string = '';
  private readonly icons: (HTMLCanvasElement | null)[] = [];
  private pulseTime: number = 0;
  
  private pulseConfig: PulseConfig = {
    enabled: true,
    baseOpacity: 0.8,            // Base opacity level
    pulseIntensity: 0.3,         // How much brighter it gets
    pulseSpeed: 1.2,             // Speed of the pulse cycle
    waveDelay: 0.15,             // Delay between letters (seconds)
    useWaveEffect: true,         // Letters pulse in sequence
    pulseType: 'breath'          // Breathing-like pulse
  };

  constructor(
    private x: number,
    private y: number,
    private scale: number = getUniformScaleFactor(),
  ) {}

  public setWord(word: string): void {
    this.word = word.toUpperCase();
    this.icons.length = 0;

    for (const char of this.word) {
      if (char === ' ') {
        this.icons.push(null);
      } else {
        try {
          this.icons.push(getMinimalistLetterIcon(char));
        } catch {
          console.warn(`[WordRenderer] Unsupported character: '${char}'`);
          this.icons.push(null);
        }
      }
    }
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public setScale(scale: number): void {
    this.scale = scale;
  }

  public setPulseConfig(config: Partial<PulseConfig>): void {
    this.pulseConfig = { ...this.pulseConfig, ...config };
  }

  public enablePulse(enabled: boolean = true): void {
    this.pulseConfig.enabled = enabled;
  }

  private calculatePulseOpacity(letterIndex: number): number {
    if (!this.pulseConfig.enabled) return 1.0;

    const { baseOpacity, pulseIntensity, pulseSpeed, waveDelay, useWaveEffect, pulseType } = this.pulseConfig;
    
    // Calculate time offset for wave effect
    let timeOffset = 0;
    if (useWaveEffect) {
      timeOffset = letterIndex * waveDelay;
    }
    
    const adjustedTime = this.pulseTime * pulseSpeed + timeOffset;
    
    // Calculate pulse value based on type
    let pulseValue: number;
    switch (pulseType) {
      case 'sine':
        pulseValue = Math.sin(adjustedTime * Math.PI * 2);
        break;
      case 'ease':
        // Smoother easing function
        const t = (Math.sin(adjustedTime * Math.PI * 2) + 1) / 2;
        pulseValue = t * t * (3 - 2 * t); // Smoothstep
        pulseValue = pulseValue * 2 - 1; // Convert back to -1 to 1
        break;
      case 'breath':
        // Breathing-like pulse with longer hold at peak
        const breathCycle = adjustedTime * Math.PI * 2;
        const sineWave = Math.sin(breathCycle);
        pulseValue = Math.pow(Math.abs(sineWave), 0.7) * Math.sign(sineWave);
        break;
      default:
        pulseValue = Math.sin(adjustedTime * Math.PI * 2);
    }
    
    // Convert to opacity (0 to 1 range)
    const normalizedPulse = (pulseValue + 1) / 2;
    const finalOpacity = baseOpacity + (normalizedPulse * pulseIntensity);
    
    return Math.max(0.1, Math.min(1.0, finalOpacity));
  }

  public render(ctx: CanvasRenderingContext2D, deltaTime: number = 1 / 60): void {
    // Update pulse time
    this.pulseTime += deltaTime; // deltaTime is already in seconds

    
    const glyphSize = 128 * this.scale;
    const spacing = 4 * this.scale;
    let cursorX = this.x;
    let letterIndex = 0;

    // Store original global alpha
    const originalAlpha = ctx.globalAlpha;

    for (const icon of this.icons) {
      if (icon === null) {
        // Space character - still increment letter index for wave effect
        cursorX += glyphSize * 0.5;
        letterIndex++;
        continue;
      }

      const drawWidth = glyphSize;
      const drawHeight = glyphSize;
      const drawY = this.y - drawHeight / 2;

      // Apply pulse effect
      const pulseOpacity = this.calculatePulseOpacity(letterIndex);
      ctx.globalAlpha = originalAlpha * pulseOpacity;

      ctx.drawImage(icon, cursorX, drawY, drawWidth, drawHeight);
      cursorX += (glyphSize / 2) + spacing;
      letterIndex++;
    }

    // Restore original alpha
    ctx.globalAlpha = originalAlpha;
  }

  // Preset configurations for different pulse styles
  public setSubtlePulse(): void {
    this.setPulseConfig({
      baseOpacity: 0.85,
      pulseIntensity: 0.15,
      pulseSpeed: 0.2,
      waveDelay: 0.1,
      useWaveEffect: true,
      pulseType: 'breath'
    });
  }

  public setEnergeticPulse(): void {
    this.setPulseConfig({
      baseOpacity: 0.4,
      pulseIntensity: 1.0,
      pulseSpeed: 0.05,
      waveDelay: 1.08,
      useWaveEffect: true,
      pulseType: 'sine'
    });
  }

  public setBreathingPulse(): void {
    this.setPulseConfig({
      baseOpacity: 0.7,
      pulseIntensity: 0.35,
      pulseSpeed: 0.4,
      waveDelay: 0.2,
      useWaveEffect: true,
      pulseType: 'breath'
    });
  }

  public setSynchronizedPulse(): void {
    this.setPulseConfig({
      baseOpacity: 0.8,
      pulseIntensity: 0.3,
      pulseSpeed: 1.0,
      waveDelay: 0,
      useWaveEffect: false,
      pulseType: 'ease'
    });
  }
}

/* Enhanced Usage Example:
const wordRenderer = new WordRenderer(100, 200, 1.5);
wordRenderer.setWord('SHIPWRIGHT SURVIVORS');

// Choose a pulse style:
wordRenderer.setSubtlePulse();        // Gentle breathing effect
wordRenderer.setEnergeticPulse();     // More dynamic pulsing
wordRenderer.setBreathingPulse();     // Slow, meditative pulse
wordRenderer.setSynchronizedPulse();  // All letters pulse together

// Or customize manually:
wordRenderer.setPulseConfig({
  baseOpacity: 0.8,
  pulseIntensity: 0.25,
  pulseSpeed: 1.0,
  waveDelay: 0.12,
  useWaveEffect: true,
  pulseType: 'breath'
});

// In your game loop:
function draw(ctx: CanvasRenderingContext2D, deltaTime: number) {
  wordRenderer.render(ctx, deltaTime);
}

// To disable pulsing:
wordRenderer.enablePulse(false);
*/