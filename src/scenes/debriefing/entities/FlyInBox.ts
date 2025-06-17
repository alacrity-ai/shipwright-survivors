import { getUniformScaleFactor } from '@/config/view';
import { drawCore } from '@/scenes/debriefing/helpers/drawCore';

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

    // === Core Stack ===
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
      const startX = x + paddingX + (availableWidth - actualTotalWidth) / 2;
      const baseY = y + paddingY;

      for (let i = 0; i < maxCores; i++) {
        const drawX = startX + i * coreSpacing;
        const floatOffset = this.isFloating
          ? 4 * scale * Math.sin(this.floatTimer * 2 + i * 0.6)
          : 0;
        drawCore(ctx, drawX, baseY + floatOffset, coreSize, 1.0);
      }
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
