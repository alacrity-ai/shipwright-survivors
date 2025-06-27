import { CanvasManager } from '@/core/CanvasManager';
import { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import { GlobalEventBus } from '@/core/EventBus';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import { getUniformScaleFactor } from '@/config/view';

export class PlayerExperienceBar {
  private currentEntropium = 0;
  private entropiumForNextLevel = 100;
  private level = 1;
  private glowTimer = 0;

  private readonly textManager: FloatingTextManager;

  constructor(textManager: FloatingTextManager) {
    const xp = PlayerExperienceManager.getInstance();
    this.level = xp.getLevel();
    this.currentEntropium = xp.getEntropium();
    this.entropiumForNextLevel = xp.getEntropiumForNextLevel();

    this.textManager = textManager;

    GlobalEventBus.on('player:entropium:added', this.onEntropiumAdded);
    GlobalEventBus.on('player:entropium:levelup', this.onLevelUp);
  }

  private onEntropiumAdded = ({ amount }: { amount: number }): void => {
    const xp = PlayerExperienceManager.getInstance();
    this.currentEntropium = xp.getEntropium();
    this.entropiumForNextLevel = xp.getEntropiumForNextLevel();

    const scale = getUniformScaleFactor();
    const ctx = CanvasManager.getInstance().getContext('ui');
    const screenX = Math.floor(900 * scale) + Math.floor(80 * scale);
    const y = ctx.canvas.height - Math.floor(24 * scale);
    const screenY = y - Math.floor(12 * scale);

    this.textManager?.createScreenText(
      `+${amount}`,
      screenX,
      screenY,
      12,
      'monospace',
      1,
      100,
      1.0,
      '#FFD700',
      { impactScale: 1.5 },
      'currency'
    );

    if (this.currentEntropium >= this.entropiumForNextLevel) {
      this.glowTimer = 1.0;
    }
  };

  private onLevelUp = ({ newLevel }: { newLevel: number }): void => {
    const xp = PlayerExperienceManager.getInstance();
    this.level = newLevel;
    this.currentEntropium = xp.getEntropium();
    this.entropiumForNextLevel = xp.getEntropiumForNextLevel();
    this.glowTimer = 1.0;
  };

  public update(dt: number): void {
    if (this.glowTimer > 0) {
      this.glowTimer = Math.max(0, this.glowTimer - dt * 0.0025);
    }
  }

  public render(): void {
    const ctx = CanvasManager.getInstance().getContext('ui');
    const scale = getUniformScaleFactor();

    const barWidth = Math.floor(300 * scale);
    const barHeight = Math.floor(20 * scale);

    const canvas = ctx.canvas;
    const baseX = Math.floor((canvas.width - barWidth) / 2);
    const y = canvas.height - Math.floor(84 * scale);

    const ratio = Math.min(1.0, this.currentEntropium / this.entropiumForNextLevel);
    const text = `Lv ${this.level} — ${this.currentEntropium} / ${this.entropiumForNextLevel}`;
    const glow = this.glowTimer > 0;

    drawUIResourceBar(ctx, {
      x: baseX,
      y: y,
      width: barWidth,
      height: barHeight,
      value: ratio,
      label: text,
      style: {
        barColor: glow ? '#fff861' : '#ffd700',
        borderColor: glow ? '#ffeeaa' : '#ccaa55',
        backgroundColor: '#1a1300',
        glow,
        textColor: glow ? '#ffffff' : '#ffffaa',
        font: `${Math.floor(10 * scale)}px "Courier New", monospace`,
        scanlineIntensity: 0.3,
        chromaticAberration: true,
        phosphorDecay: true,
        cornerBevel: true,
        animated: true,
      }
    }, performance.now());
  }

  public destroy(): void {
    GlobalEventBus.off('player:entropium:added', this.onEntropiumAdded);
    GlobalEventBus.off('player:entropium:levelup', this.onLevelUp);
  }
}
