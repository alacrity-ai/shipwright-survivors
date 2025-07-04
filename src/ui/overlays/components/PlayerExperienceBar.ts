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

  private hidden = false;

  private renderCacheCanvas: HTMLCanvasElement;
  private renderCacheCtx: CanvasRenderingContext2D;
  private lastRenderValue = -1;
  private lastRenderLabel = '';
  private lastRenderGlow = false;

  private readonly textManager: FloatingTextManager;

  private boundHandleHide: () => void;
  private boundHandleShow: () => void;

  constructor(textManager: FloatingTextManager) {
    const xp = PlayerExperienceManager.getInstance();
    this.level = xp.getLevel();
    this.currentEntropium = xp.getEntropium();
    this.entropiumForNextLevel = xp.getEntropiumForNextLevel();

    this.textManager = textManager;

    this.boundHandleHide = this.handleHide.bind(this);
    this.boundHandleShow = this.handleShow.bind(this);

    GlobalEventBus.on('player:entropium:added', this.onEntropiumAdded);
    GlobalEventBus.on('player:entropium:levelup', this.onLevelUp);
    GlobalEventBus.on('experiencebar:hide', this.boundHandleHide);
    GlobalEventBus.on('experiencebar:show', this.boundHandleShow);
  
    const scale = getUniformScaleFactor();
    const width = Math.floor(300 * scale) + 20;
    const height = Math.floor(20 * scale) + 20;

    this.renderCacheCanvas = document.createElement('canvas');
    this.renderCacheCanvas.width = width;
    this.renderCacheCanvas.height = height;
    this.renderCacheCtx = this.renderCacheCanvas.getContext('2d')!;
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
    if (this.hidden) return;

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

    const cacheChanged =
      this.lastRenderValue !== ratio ||
      this.lastRenderLabel !== text ||
      this.lastRenderGlow !== glow;

    if (cacheChanged) {
      this.lastRenderValue = ratio;
      this.lastRenderLabel = text;
      this.lastRenderGlow = glow;

      // Clear offscreen canvas
      this.renderCacheCtx.clearRect(0, 0, this.renderCacheCanvas.width, this.renderCacheCanvas.height);

      // Redraw to cache
      drawUIResourceBar(this.renderCacheCtx, {
        x: 10,
        y: 10,
        width: barWidth,
        height: barHeight,
        value: ratio,
        label: text,
        style: {
          barColor: glow ? '#fff861' : '#ffd700',
          warningColor: '#f9d247',
          criticalColor: '#ffb543',
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
          criticalAnimation: false,
        }
      }, performance.now());
    }

    // Always blit the cached canvas
    ctx.drawImage(this.renderCacheCanvas, baseX - 10, y - 10);
  }

  public handleHide(): void {
    this.hidden = true;
  }

  public handleShow(): void {
    this.hidden = false;
  }

  public destroy(): void {
    GlobalEventBus.off('player:entropium:added', this.onEntropiumAdded);
    GlobalEventBus.off('player:entropium:levelup', this.onLevelUp);
    GlobalEventBus.off('experiencebar:hide', this.boundHandleHide);
    GlobalEventBus.off('experiencebar:show', this.boundHandleShow);
  }
}
