// src/ui/overlays/MiniMap.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { PlanetSystem } from '@/game/planets/PlanetSystem';

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { getUIScale } from '@/ui/menus/helpers/getUIScale';
import { getUniformScaleFactor } from '@/config/view';

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
  private unsubscribeResolution: () => void;
  private unsubscribeInterfaceScale: () => void;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly player: Ship,
    private readonly registry: ShipRegistry,
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly planetSystem: PlanetSystem
  ) {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;
    this.initializeStaticCache(scale);

    this.unsubscribeResolution = PlayerSettingsManager.getInstance().onResolutionChange(() => {
      this.resetAllCaches();
    });

    this.unsubscribeInterfaceScale = PlayerSettingsManager.getInstance().onInterfaceScaleChange(() => {
      this.resetAllCaches();
    });

    this.enemyMarkers = {
      passive: this.createEnemyDot('#3399ff'),
      seeking: this.createEnemyDot('#ffbb33'),
      attacking: this.createEnemyDot('#ff0000'),
      hunter: this.createEnemyDot('#ff0000'),
    };

    this.planetMarker = this.createPlanetDot('#00ffff');
    this.playerMarker = this.createPlayerMarker();
  }

  public resetAllCaches(): void {
    // Invalidate static rendering cache
    this.staticCacheValid = false;

    // Reinitialize static canvas and context
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;
    this.initializeStaticCache(scale);

    // Recreate marker canvases
    this.enemyMarkers = {
      passive: this.createEnemyDot('#3399ff'),
      seeking: this.createEnemyDot('#ffbb33'),
      attacking: this.createEnemyDot('#ff0000'),
      hunter: this.createEnemyDot('#ff0000'),
    };

    this.planetMarker = this.createPlanetDot('#00ffff');
    this.playerMarker = this.createPlayerMarker();
  }

  private initializeStaticCache(uiScale: number): void {
    const padding = 20 * uiScale;

    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = Math.ceil((this.width + padding) * uiScale);
    this.staticCanvas.height = Math.ceil((this.height + padding) * uiScale);
    this.staticCtx = this.staticCanvas.getContext('2d');

    // Apply internal scale so draw operations match scaled dimensions
    this.staticCtx?.scale(uiScale, uiScale);
  }

  private renderStaticElements(): void {
    if (!this.staticCtx || this.staticCacheValid) return;

    const ctx = this.staticCtx;

    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const padding = 10 * scale;
    const x = padding;
    const y = padding;

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

  const uiScale = getUIScale();
  const resolutionScale = getUniformScaleFactor();
  const scale = uiScale * resolutionScale;

  const padding = 10 * scale;
  const scaledWidth = this.width + 2 * padding;
  const scaledHeight = this.height + 2 * padding;

  this.animationTime = currentTime;
  this.scanlineOffset = (this.scanlineOffset + deltaTime * 0.03 * scale) % (4 * scale);

  const canvasW = ctx.canvas.width;
  const canvasH = ctx.canvas.height;

  const x = canvasW - scaledWidth - this.margin;
  const y = canvasH - scaledHeight - this.margin;

  const alpha = SETTINGS.MINIMAP_TRANSPARENCY ?? 0.85;

  ctx.save();
  ctx.globalAlpha = alpha;

  // === Draw cached static elements ===
  this.renderStaticElements();
  if (this.staticCanvas) {
    ctx.drawImage(this.staticCanvas, x, y);
  }

  // === Coordinate projection helper ===
  const scaleX = this.width / WORLD_WIDTH;
  const scaleY = this.height / WORLD_HEIGHT;

  const project = (worldPos: { x: number; y: number }) => {
    const relX = worldPos.x - WORLD_CENTER.x + WORLD_WIDTH / 2;
    const relY = worldPos.y - WORLD_CENTER.y + WORLD_HEIGHT / 2;
    return {
      x: x + padding + relX * scaleX,
      y: y + padding + relY * scaleY
    };
  };

  this.drawPlanets(ctx, project);
  this.drawShips(ctx, project);
  this.drawScanlines(ctx, x + padding, y + padding);
  this.drawStatusIndicator(ctx, x + padding, y + padding);

  ctx.restore();
}


  private drawDiegeticFrame(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const frameThickness = 2 * scale;
    const cornerSize = 8 * scale;
    const bracketOffset = 6 * scale;

    // === Main Frame ===
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = frameThickness;
    ctx.strokeRect(
      x - frameThickness,
      y - frameThickness,
      this.width + frameThickness * 2,
      this.height + frameThickness * 2
    );

    // === Corner Brackets ===
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1 * scale;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x - bracketOffset, y + cornerSize);
    ctx.lineTo(x - bracketOffset, y - bracketOffset);
    ctx.lineTo(x + cornerSize, y - bracketOffset);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + this.width - cornerSize, y - bracketOffset);
    ctx.lineTo(x + this.width + bracketOffset, y - bracketOffset);
    ctx.lineTo(x + this.width + bracketOffset, y + cornerSize);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + this.width + bracketOffset, y + this.height - cornerSize);
    ctx.lineTo(x + this.width + bracketOffset, y + this.height + bracketOffset);
    ctx.lineTo(x + this.width - cornerSize, y + this.height + bracketOffset);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x + cornerSize, y + this.height + bracketOffset);
    ctx.lineTo(x - bracketOffset, y + this.height + bracketOffset);
    ctx.lineTo(x - bracketOffset, y + this.height - cornerSize);
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
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    ctx.strokeStyle = '#00ff4120';
    ctx.lineWidth = 1 * scale;

    const padding = 10 * scale;
    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const maxRadius = Math.min(this.width, this.height) / 2 - padding;

    // Just 2 range rings
    for (let i = 1; i <= 2; i++) {
      const radius = (maxRadius * i) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Scaled crosshair lines
    ctx.beginPath();
    ctx.moveTo(centerX, y + padding);
    ctx.lineTo(centerX, y + this.height - padding);
    ctx.moveTo(x + padding, centerY);
    ctx.lineTo(x + this.width - padding, centerY);
    ctx.stroke();
  }

  private drawPlanets(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    const markerW = this.planetMarker.width;
    const markerH = this.planetMarker.height;

    for (const planet of this.planetSystem.getPlanets()) {
      const pos = planet.getPosition();
      const screen = project(pos);
      ctx.drawImage(this.planetMarker, screen.x - markerW / 2, screen.y - markerH / 2);
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

      const markerW = markerCanvas.width;
      const markerH = markerCanvas.height;

      ctx.drawImage(markerCanvas, px - markerW / 2, py - markerH / 2);
    }

    // === Draw Player (diamond with orientation, rasterized) ===
    const playerW = this.playerMarker.width;
    const playerH = this.playerMarker.height;

    ctx.save();
    ctx.translate(playerPos.x, playerPos.y);
    ctx.rotate(playerRotation);
    ctx.drawImage(this.playerMarker, -playerW / 2, -playerH / 2);
    ctx.restore();
  }

  private createPlanetDot(color: string): HTMLCanvasElement {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const logicalSize = 16;
    const logicalRadius = 6;
    const logicalShadowBlur = 8;

    const size = Math.ceil(logicalSize * scale);
    const radius = logicalRadius * scale;
    const shadowBlur = logicalShadowBlur * scale;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = shadowBlur;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const lineSpacing = 8 * scale;
    const lineThickness = Math.max(1, Math.floor(1 * scale)); // Ensure at least 1px

    ctx.fillStyle = 'rgba(0, 255, 65, 0.06)';

    for (let i = -this.scanlineOffset * scale; i < this.height; i += lineSpacing) {
      const lineY = y + i;
      if (lineY >= y && lineY < y + this.height) {
        ctx.fillRect(x, lineY, this.width, lineThickness);
      }
    }
  }

  private drawStatusIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const dotOffsetX = 10 * scale;
    const dotOffsetY = 10 * scale;
    const dotRadius = 3 * scale;
    const shadowBlur = 4 * scale;

    // === Draw static status light ===
    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = shadowBlur;
    ctx.beginPath();
    ctx.arc(x + this.width - dotOffsetX, y + dotOffsetY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // === Draw scale indicator text ===
    const fontSize = 8 * scale;
    ctx.font = `${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#00ff4180';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowBlur = 0;

    const paddingX = 4 * scale;
    const paddingY = 4 * scale;
    const scaleText = '1:' + Math.floor(WORLD_WIDTH / this.width);

    ctx.fillText(scaleText, x + this.width - paddingX, y + this.height - paddingY);
  }

  // Call this when the minimap size or styling changes to invalidate cache
  public invalidateCache(): void {
    this.staticCacheValid = false;
  }

  private createEnemyDot(color: string): HTMLCanvasElement {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const logicalSize = 8;
    const logicalRadius = 2;
    const size = Math.ceil(logicalSize * scale);
    const radius = logicalRadius * scale;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4 * scale;

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  private createPlayerMarker(): HTMLCanvasElement {
    const uiScale = getUIScale();
    const resolutionScale = getUniformScaleFactor();
    const scale = uiScale * resolutionScale;

    const logicalSize = 16;
    const size = Math.ceil(logicalSize * scale); // Final canvas dimensions

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    ctx.translate(size / 2, size / 2);

    ctx.fillStyle = '#00ff41';
    ctx.shadowColor = '#00ff41';
    ctx.shadowBlur = 6 * scale;

    // Draw diamond
    ctx.beginPath();
    ctx.moveTo(0, -4 * scale);
    ctx.lineTo(3 * scale, 0);
    ctx.lineTo(0, 4 * scale);
    ctx.lineTo(-3 * scale, 0);
    ctx.closePath();
    ctx.fill();

    // Top antenna line
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(0, -4 * scale);
    ctx.lineTo(0, -8 * scale);
    ctx.stroke();

    return canvas;
  }

  public destroy(): void {
    this.unsubscribeResolution();
    this.unsubscribeInterfaceScale();
  }
}