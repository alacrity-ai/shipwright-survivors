// src/scenes/debriefing/result_bar/MissionProgressBarController.ts

import { CanvasManager } from '@/core/CanvasManager';
import { MissionProgressBarRenderer } from './MissionProgressBarRenderer';

export type MissionProgressBarState = 'idle' | 'filling' | 'complete';

export class MissionProgressBarController {
  private state: MissionProgressBarState = 'idle';

  private wavesCleared: number = 0;
  private totalWaves: number = 0;
  private didKillBoss: boolean = false;

  private progressRatio: number = 0;
  private fillSpeed: number = 0.75;
  private currentWaveTick: number = 0;
  private tickPopFlags: boolean[] = [];
  private tickPulseTimers: number[] = []; // NEW
  private crownPulseTimer: number = -1;   // NEW: -1 means not triggered

  private timeSinceStart: number = 0;

  private renderer: MissionProgressBarRenderer;

  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(x: number, y: number) {
    this.renderer = new MissionProgressBarRenderer(x, y);
    const ctx = CanvasManager.getInstance().getContext('overlay');
    this.ctx = ctx;
    this.canvas = ctx.canvas;
  }

  public triggerStart(wavesCleared: number, totalWaves: number, didKillBoss: boolean = false): void {
    this.wavesCleared = wavesCleared;
    this.totalWaves = totalWaves;
    this.didKillBoss = didKillBoss;

    this.progressRatio = 0;
    this.timeSinceStart = 0;
    this.currentWaveTick = 0;
    this.tickPopFlags = new Array(totalWaves).fill(false);
    this.tickPulseTimers = new Array(totalWaves).fill(-1); // -1 = no pulse active
    this.crownPulseTimer = -1;

    this.state = 'filling';
  }

  public update(dt: number): void {
    if (this.state !== 'filling') return;

    this.timeSinceStart += dt;
    const targetRatio = Math.min(this.wavesCleared / this.totalWaves, 1.0);

    if (this.progressRatio < targetRatio) {
      this.progressRatio += dt * this.fillSpeed;
      this.progressRatio = Math.min(this.progressRatio, targetRatio);

      const ticksToPop = Math.floor(this.progressRatio * this.totalWaves);
      while (this.currentWaveTick < ticksToPop) {
        this.tickPopFlags[this.currentWaveTick] = true;
        this.tickPulseTimers[this.currentWaveTick] = 0; // Start pulse
        this.currentWaveTick++;
      }

      if (this.progressRatio >= targetRatio) {
        this.state = 'complete';

        if (this.didKillBoss) {
          this.crownPulseTimer = 0;
        }
      }
    }

    // === Update pulse timers ===
    for (let i = 0; i < this.tickPulseTimers.length; i++) {
      if (this.tickPulseTimers[i] >= 0) {
        this.tickPulseTimers[i] += dt;
        if (this.tickPulseTimers[i] > 0.4) {
          this.tickPulseTimers[i] = -1; // expire pulse
        }
      }
    }

    if (this.crownPulseTimer >= 0) {
      this.crownPulseTimer += dt;
      if (this.crownPulseTimer > 0.6) {
        this.crownPulseTimer = -1; // expire crown pulse
      }
    }
  }

  public render(): void {
    this.renderer.setRenderState({
      progressRatio: this.progressRatio,
      tickPopFlags: this.tickPopFlags,
      tickPulseTimers: this.tickPulseTimers,
      totalWaves: this.totalWaves,
      didReachBoss: this.didKillBoss,
      crownPulseTimer: this.crownPulseTimer,
    });

    this.renderer.render(this.ctx);
  }

  public isComplete(): boolean {
    return this.state === 'complete';
  }
}
