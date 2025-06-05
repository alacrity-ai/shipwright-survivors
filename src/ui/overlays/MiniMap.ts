// src/ui/overlays/MiniMap.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { PlanetSystem } from '@/game/planets/PlanetSystem';

import { WORLD_WIDTH, WORLD_HEIGHT, WORLD_CENTER } from '@/config/world';
import { SETTINGS } from '@/config/settings';

export class MiniMap {
  private readonly width = 220;
  private readonly height = 220;
  private readonly margin = 14;
  private animationTime = 0;
  private scanlineOffset = 0;
  private lastFrameTime = 0;
  
  // Cached elements to avoid redrawing static parts
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;
  private staticCacheValid = false;
  private enemyMarkers: {
    passive: HTMLCanvasElement;
    seeking: HTMLCanvasElement;
    attacking: HTMLCanvasElement;
    hunter: HTMLCanvasElement;
  };
  private playerMarker: HTMLCanvasElement;
  private planetMarker: HTMLCanvasElement;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly player: Ship,
    private readonly registry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly planetSystem: PlanetSystem
  ) {
    this.initializeStaticCache();

    this.enemyMarkers = {
      passive: this.createEnemyDot('#3399ff'),
      seeking: this.createEnemyDot('#ffbb33'),
      attacking: this.createEnemyDot('#ff0000'),
      hunter: this.createEnemyDot('#ff0000'),
    };

    this.planetMarker = this.createPlanetDot('#00ffff');
    this.playerMarker = this.createPlayerMarker();
  }

  private initializeStaticCache(): void {
    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.width + 20; // Extra space for brackets
    this.staticCanvas.height = this.height + 20;
    this.staticCtx = this.staticCanvas.getContext('2d');
  }

  private renderStaticElements(): void {
    if (!this.staticCtx || this.staticCacheValid) return;

    const ctx = this.staticCtx;
    const x = 10; // Offset for brackets
    const y = 10;

    ctx.clearRect(0, 0, this.staticCanvas!.width, this.staticCanvas!.height);

    // === Diegetic Frame with Corner Brackets ===
    this.drawDiegeticFrame(ctx, x, y);

    // === CRT Background ===
    this.drawCRTBackground(ctx, x, y);

    // === Radar Grid (static) ===
    this.drawRadarGrid(ctx, x, y);

    this.staticCacheValid = true;
  }

  render(): void {
    const ctx = this.canvasManager.getContext('ui');
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Update only essential animations
    this.animationTime = currentTime;
    this.scanlineOffset = (this.scanlineOffset + deltaTime * 0.03) % 4; // Slower scanlines

    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const x = canvasW - this.width - this.margin;
    const y = canvasH - this.height - this.margin;

    const alpha = SETTINGS.MINIMAP_TRANSPARENCY ?? 0.85;

    ctx.save();
    ctx.globalAlpha = alpha;

    // === Draw cached static elements ===
    this.renderStaticElements();
    if (this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, x - 10, y - 10);
    }

    // === Coordinate projection helper ===
    const scaleX = (this.width - 20) / WORLD_WIDTH;
    const scaleY = (this.height - 20) / WORLD_HEIGHT;

    const project = (worldPos: { x: number; y: number }) => {
      const relX = worldPos.x - WORLD_CENTER.x + WORLD_WIDTH / 2;
      const relY = worldPos.y - WORLD_CENTER.y + WORLD_HEIGHT / 2;
      return {
        x: x + 10 + relX * scaleX,
        y: y + 10 + relY * scaleY
      };
    };

    // === Draw planets
    this.drawPlanets(ctx, project);

    // === Draw ships (simplified) ===
    this.drawShips(ctx, project);

    // === Minimal scanlines ===
    this.drawScanlines(ctx, x, y);

    // === Minimal status indicator ===
    this.drawStatusIndicator(ctx, x, y);

    ctx.restore();
  }

  private drawDiegeticFrame(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const frameThickness = 2;
    const cornerSize = 8;
    
    // Main frame
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = frameThickness;
    ctx.strokeRect(x - frameThickness, y - frameThickness, 
                   this.width + frameThickness * 2, this.height + frameThickness * 2);

    // Simplified corner brackets
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x - 6, y + cornerSize);
    ctx.lineTo(x - 6, y - 6);
    ctx.lineTo(x + cornerSize, y - 6);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + this.width - cornerSize, y - 6);
    ctx.lineTo(x + this.width + 6, y - 6);
    ctx.lineTo(x + this.width + 6, y + cornerSize);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + this.width + 6, y + this.height - cornerSize);
    ctx.lineTo(x + this.width + 6, y + this.height + 6);
    ctx.lineTo(x + this.width - cornerSize, y + this.height + 6);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x + cornerSize, y + this.height + 6);
    ctx.lineTo(x - 6, y + this.height + 6);
    ctx.lineTo(x - 6, y + this.height - cornerSize);
    ctx.stroke();
  }

  private drawCRTBackground(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Simple gradient background
    const bgGradient = ctx.createLinearGradient(x, y, x, y + this.height);
    bgGradient.addColorStop(0, '#001a00');
    bgGradient.addColorStop(1, '#000a00');

    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, this.width, this.height);
  }

  private drawRadarGrid(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = '#00ff4120';
    ctx.lineWidth = 1;

    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const maxRadius = Math.min(this.width, this.height) / 2 - 10;

    // Just 2 range rings instead of 4
    for (let i = 1; i <= 2; i++) {
      const radius = (maxRadius * i) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Simple crosshair
    ctx.beginPath();
    ctx.moveTo(centerX, y + 10);
    ctx.lineTo(centerX, y + this.height - 10);
    ctx.moveTo(x + 10, centerY);
    ctx.lineTo(x + this.width - 10, centerY);
    ctx.stroke();
  }

  private drawPlanets(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    for (const planet of this.planetSystem.getPlanets()) {
      const pos = planet.getPosition(); // Assumes a public accessor exists
      const screen = project(pos);
      ctx.drawImage(this.planetMarker, screen.x - 8, screen.y - 8); // Centered
    }
  }

  private drawShips(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    const playerPos = project(this.player.getTransform().position);
    const playerRotation = this.player.getTransform().rotation;

    // === Draw Enemies (blit pre-rendered canvases) ===
    for (const [controller, ship] of this.aiOrchestrator.getAllControllers()) {
      const { position } = ship.getTransform();
      const { x: px, y: py } = project(position);

      const state = controller.getCurrentStateString();

      const markerCanvas =
        controller.isHunter()
          ? this.enemyMarkers.hunter
          : state === 'AttackState'
            ? this.enemyMarkers.attacking
            : state === 'SeekTargetState'
              ? this.enemyMarkers.seeking
              : this.enemyMarkers.passive;

      ctx.drawImage(markerCanvas, px - 4, py - 4); // Center on dot
    }

    // === Draw Player (diamond with orientation, rasterized) ===
    ctx.save();
    ctx.translate(playerPos.x, playerPos.y);
    ctx.rotate(playerRotation);
    ctx.drawImage(this.playerMarker, -8, -8); // Centered draw
    ctx.restore();
  }

  private createPlanetDot(color: string): HTMLCanvasElement {
    const size = 16; // 4x standard dot size (normal is 8px)
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 6, 0, Math.PI * 2); // Larger radius
    ctx.fill();

    return canvas;
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Minimal scanlines - every 4th line only
    ctx.fillStyle = 'rgba(0, 255, 65, 0.06)';
    
    for (let i = -this.scanlineOffset; i < this.height; i += 8) { // Wider spacing
      if (y + i >= y && y + i < y + this.height) {
        ctx.fillRect(x, y + i, this.width, 1);
      }
    }
  }

  private drawStatusIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Simple static status light - no pulsing
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(x + this.width - 10, y + 10, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Scale indicator only
    ctx.font = '8px "Courier New", monospace';
    ctx.fillStyle = '#00ff4180';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 0;
    
    const scaleText = '1:' + Math.floor(WORLD_WIDTH / this.width);
    ctx.fillText(scaleText, x + this.width - 4, y + this.height - 4);
  }

  // Call this when the minimap size or styling changes to invalidate cache
  public invalidateCache(): void {
    this.staticCacheValid = false;
  }

  private createEnemyDot(color: string): HTMLCanvasElement {
    const size = 8;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  private createPlayerMarker(): HTMLCanvasElement {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.translate(size / 2, size / 2);
    ctx.rotate(0); // Leave unrotated; rotate at render time if needed

    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 6;

    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(3, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-3, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -8);
    ctx.stroke();

    return canvas;
  }

}