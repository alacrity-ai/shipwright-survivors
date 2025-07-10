// import { getUniformScaleFactor } from '@/config/view';
// import { drawCore } from '@/scenes/debriefing/helpers/drawCore';

// export type FlyInBoxPhase = 'hidden' | 'sliding-in' | 'settling' | 'appeared';

// export class FlyInBox {
//   private targetX: number;
//   private y: number;
//   private width: number;
//   private height: number;

//   private phase: FlyInBoxPhase = 'hidden';
//   private x: number;
//   private settleTimer: number = 0;

//   private cores: number[] = [];
//   private isFloating = false;
//   private floatTimer = 0;

//   private readonly slideSpeed: number;
//   private readonly settleDuration = 0.2;
//   private readonly overshoot = 20;

//   private pulseTimer: number = 0;
//   private readonly PULSE_DURATION = 0.5;

//   constructor(
//     targetX: number,
//     y: number,
//     width: number,
//     height: number,
//     slideSpeed?: number
//   ) {
//     this.targetX = targetX;
//     this.y = y;
//     this.width = width;
//     this.height = height;

//     this.x = targetX + 200;
//     this.slideSpeed = slideSpeed ?? 1200;
//   }

//   trigger(): void {
//     if (this.phase === 'hidden') {
//       this.phase = 'sliding-in';
//     }
//   }

//   setFloatingState(): void {
//     this.isFloating = true;
//     this.floatTimer = 0;
//   }

//   update(dt: number): void {
//     switch (this.phase) {
//       case 'sliding-in': {
//         const overshootX = this.targetX + this.overshoot;
//         const direction = Math.sign(overshootX - this.x);
//         this.x += direction * this.slideSpeed * dt;

//         if ((direction > 0 && this.x >= overshootX) ||
//             (direction < 0 && this.x <= overshootX)) {
//           this.x = overshootX;
//           this.phase = 'settling';
//           this.settleTimer = this.settleDuration;
//         }
//         break;
//       }

//       case 'settling': {
//         this.settleTimer -= dt;
//         const progress = 1 - Math.max(0, this.settleTimer / this.settleDuration);
//         this.x = this.targetX + this.overshoot * (1 - progress);
//         if (this.settleTimer <= 0) {
//           this.x = this.targetX;
//           this.phase = 'appeared';
//         }
//         break;
//       }
//     }

//     if (this.pulseTimer > 0) {
//       this.pulseTimer -= dt;
//       if (this.pulseTimer < 0) this.pulseTimer = 0;
//     }

//     if (this.isFloating) {
//       this.floatTimer += dt;
//     }
//   }

//   render(ctx: CanvasRenderingContext2D): void {
//     if (this.phase === 'hidden') return;

//     const scale = getUniformScaleFactor();
//     const x = this.x;
//     const y = this.y;
//     const w = this.width * scale;
//     const h = this.height * scale;

//     ctx.save();

//     // === Box Outline ===
//     ctx.lineWidth = 2 * scale;
//     ctx.strokeStyle = '#00ff00';
//     ctx.shadowBlur = 6 * scale;
//     ctx.shadowColor = '#00ff00';
//     ctx.globalAlpha = 1.0;
//     ctx.strokeRect(x, y, w, h);

//     // === Label with pulse ===
//     const label = `Cores Generated: ${this.cores.length}`;
//     const pulseStrength = this.pulseTimer > 0 ? this.pulseTimer / this.PULSE_DURATION : 0;
//     const floatGlowPulse = this.isFloating ? (0.5 + 0.5 * Math.sin(this.floatTimer * 3)) : 0;
//     const glowIntensity = 6 * scale * (1 + pulseStrength * 2 + floatGlowPulse);

//     ctx.font = `${Math.round(18 * scale * (1 + 0.1 * pulseStrength))}px monospace`;
//     ctx.fillStyle = '#00ff00';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'bottom';
//     ctx.shadowColor = '#00ff00';
//     ctx.shadowBlur = glowIntensity;

//     const centerX = x + w / 2;
//     const labelY = y - 8 * scale;
//     ctx.fillText(label, centerX, labelY);

//     // === Core Stack ===
//     const paddingX = 16 * scale;
//     const paddingY = 12 * scale;
//     const coreSize = 32 * scale;
//     const marginX = 4 * scale;

//     const availableWidth = w - 2 * paddingX;
//     const maxCores = this.cores.length;

//     if (maxCores > 0) {
//       let coreSpacing = coreSize + marginX;
//       const totalNormalWidth = maxCores * coreSize + (maxCores - 1) * marginX;

//       if (totalNormalWidth > availableWidth) {
//         coreSpacing = (availableWidth - coreSize) / (maxCores - 1);
//       }

//       const actualTotalWidth = coreSize + (maxCores - 1) * coreSpacing;
//       const startX = x + paddingX + (availableWidth - actualTotalWidth) / 2;
//       const baseY = y + paddingY;

//       for (let i = 0; i < maxCores; i++) {
//         const drawX = startX + i * coreSpacing;
//         const floatOffset = this.isFloating
//           ? 4 * scale * Math.sin(this.floatTimer * 2 + i * 0.6)
//           : 0;
//         drawCore(ctx, drawX, baseY + floatOffset, coreSize, 1.0);
//       }
//     }

//     ctx.restore();
//   }

//   addCore(): void {
//     this.cores.push(this.cores.length);
//     this.pulseTimer = this.PULSE_DURATION;
//   }

//   isAppeared(): boolean {
//     return this.phase === 'appeared';
//   }

//   public forceCoreCount(total: number): void {
//     this.cores = [];
//     for (let i = 0; i < total; i++) {
//       this.cores.push(i);
//     }
//     this.pulseTimer = 0;
//   }
// }

// src/scenes/debriefing/FlyInBox.ts (Updated render method)

import { getUniformScaleFactor } from '@/config/view';
import { getCoreCanvas } from '@/scenes/debriefing/helpers/drawCore';

export type FlyInBoxPhase = 'hidden' | 'sliding-in' | 'settling' | 'appeared';

export class FlyInBox {
  private targetX: number;
  private y: number;
  private width: number;
  private height: number;

  private phase: FlyInBoxPhase = 'hidden';
  private x: number;
  private settleTimer: number = 0;

  private cores: number[] = [];
  private isFloating = false;
  private floatTimer = 0;

  private readonly slideSpeed: number;
  private readonly settleDuration = 0.2;
  private readonly overshoot = 20;

  private pulseTimer: number = 0;
  private readonly PULSE_DURATION = 0.5;

  // Static composite canvas for batching (shared across all FlyInBox instances)
  private static compositeCanvas: HTMLCanvasElement | null = null;
  private static compositeCtx: CanvasRenderingContext2D | null = null;

  constructor(
    targetX: number,
    y: number,
    width: number,
    height: number,
    slideSpeed?: number
  ) {
    this.targetX = targetX;
    this.y = y;
    this.width = width;
    this.height = height;

    this.x = targetX + 200;
    this.slideSpeed = slideSpeed ?? 1200;
  }

  private static getCompositeCanvas(width: number, height: number): CanvasRenderingContext2D {
    if (!FlyInBox.compositeCanvas) {
      FlyInBox.compositeCanvas = document.createElement('canvas');
      FlyInBox.compositeCtx = FlyInBox.compositeCanvas.getContext('2d')!;
    }

    const canvas = FlyInBox.compositeCanvas;
    
    // Only resize if necessary to avoid expensive canvas reallocation
    if (canvas.width < width || canvas.height < height) {
      canvas.width = Math.max(canvas.width, width);
      canvas.height = Math.max(canvas.height, height);
    }

    const ctx = FlyInBox.compositeCtx!;
    ctx.clearRect(0, 0, width, height);
    return ctx;
  }

  trigger(): void {
    if (this.phase === 'hidden') {
      this.phase = 'sliding-in';
    }
  }

  setFloatingState(): void {
    this.isFloating = true;
    this.floatTimer = 0;
  }

  update(dt: number): void {
    switch (this.phase) {
      case 'sliding-in': {
        const overshootX = this.targetX + this.overshoot;
        const direction = Math.sign(overshootX - this.x);
        this.x += direction * this.slideSpeed * dt;

        if ((direction > 0 && this.x >= overshootX) ||
            (direction < 0 && this.x <= overshootX)) {
          this.x = overshootX;
          this.phase = 'settling';
          this.settleTimer = this.settleDuration;
        }
        break;
      }

      case 'settling': {
        this.settleTimer -= dt;
        const progress = 1 - Math.max(0, this.settleTimer / this.settleDuration);
        this.x = this.targetX + this.overshoot * (1 - progress);
        if (this.settleTimer <= 0) {
          this.x = this.targetX;
          this.phase = 'appeared';
        }
        break;
      }
    }

    if (this.pulseTimer > 0) {
      this.pulseTimer -= dt;
      if (this.pulseTimer < 0) this.pulseTimer = 0;
    }

    if (this.isFloating) {
      this.floatTimer += dt;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.phase === 'hidden') return;

    const scale = getUniformScaleFactor();
    const x = this.x;
    const y = this.y;
    const w = this.width * scale;
    const h = this.height * scale;

    ctx.save();

    // === Box Outline ===
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#00ff00';
    ctx.shadowBlur = 6 * scale;
    ctx.shadowColor = '#00ff00';
    ctx.globalAlpha = 1.0;
    ctx.strokeRect(x, y, w, h);

    // === Label with pulse ===
    const label = `Cores Generated: ${this.cores.length}`;
    const pulseStrength = this.pulseTimer > 0 ? this.pulseTimer / this.PULSE_DURATION : 0;
    const floatGlowPulse = this.isFloating ? (0.5 + 0.5 * Math.sin(this.floatTimer * 3)) : 0;
    const glowIntensity = 6 * scale * (1 + pulseStrength * 2 + floatGlowPulse);

    ctx.font = `${Math.round(18 * scale * (1 + 0.1 * pulseStrength))}px monospace`;
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = glowIntensity;

    const centerX = x + w / 2;
    const labelY = y - 8 * scale;
    ctx.fillText(label, centerX, labelY);

    // === Batched Core Stack Rendering ===
    const paddingX = 16 * scale;
    const paddingY = 12 * scale;
    const coreSize = 32 * scale;
    const marginX = 4 * scale;

    const availableWidth = w - 2 * paddingX;
    const maxCores = this.cores.length;

    if (maxCores > 0) {
      let coreSpacing = coreSize + marginX;
      const totalNormalWidth = maxCores * coreSize + (maxCores - 1) * marginX;

      if (totalNormalWidth > availableWidth) {
        coreSpacing = (availableWidth - coreSize) / (maxCores - 1);
      }

      const actualTotalWidth = coreSize + (maxCores - 1) * coreSpacing;
      const startX = paddingX + (availableWidth - actualTotalWidth) / 2;
      const baseY = paddingY;

      // Calculate max float offset to determine composite canvas size
      const maxFloatOffset = this.isFloating ? 5 * scale : 0;
      const compositeWidth = Math.ceil(actualTotalWidth + coreSize); // Extra space for core width
      const compositeHeight = Math.ceil(coreSize + maxFloatOffset * 2); // Extra space for float range

      // Get composite canvas and render all cores to it
      const compositeCtx = FlyInBox.getCompositeCanvas(compositeWidth, compositeHeight);
      const coreImage = getCoreCanvas();

      // Render each core to the composite canvas with individual float offsets
      for (let i = 0; i < maxCores; i++) {
        const drawX = startX + i * coreSpacing - paddingX; // Relative to composite canvas
        const floatOffset = this.isFloating
          ? 4 * scale * Math.sin(this.floatTimer * 2 + i * 0.6)
          : 0;
        const drawY = baseY + floatOffset - maxFloatOffset; // Offset by max float to center

        compositeCtx.drawImage(coreImage, drawX, drawY, coreSize, coreSize);
      }

      // Apply glow effect to the entire composite (optional - for performance)
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 8 * scale;
      
      // Draw the entire composite to the main canvas in one operation
      ctx.drawImage(
        FlyInBox.compositeCanvas!, 
        0, 0, compositeWidth, compositeHeight,
        x + paddingX, y + paddingY - maxFloatOffset, compositeWidth, compositeHeight
      );
    }

    ctx.restore();
  }

  addCore(): void {
    this.cores.push(this.cores.length);
    this.pulseTimer = this.PULSE_DURATION;
  }

  isAppeared(): boolean {
    return this.phase === 'appeared';
  }

  public forceCoreCount(total: number): void {
    this.cores = [];
    for (let i = 0; i < total; i++) {
      this.cores.push(i);
    }
    this.pulseTimer = 0;
  }
}