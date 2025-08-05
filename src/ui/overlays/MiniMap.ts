// src/ui/overlays/MiniMap.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { AIOrchestratorSystem } from '@/systems/ai/AIOrchestratorSystem';
import type { PlanetSystem } from '@/game/planets/PlanetSystem';

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';
import { getUniformScaleFactor } from '@/config/view';
import { GlobalEventBus } from '@/core/EventBus';
import { MiniMapIcons, IconType } from '@/ui/utils/MiniMapIcons';
import { CloudManager } from '@/game/veil/CloudManager';

import { getWorldWidth, getWorldHeight } from '@/config/world';
import { SETTINGS } from '@/config/settings';

export class MiniMap {
  private player: Ship | null = null;

  private hidden: boolean = false;

  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();

  private readonly baseWidth = 180;
  private readonly baseHeight = 180;
  private readonly baseMargin = 14;
  private width: number;
  private height: number;
  private margin: number;
  private animationTime = 0;
  private scanlineOffset = 0;
  private lastFrameTime = 0;
  
  private cloudRegionCache = new Map<number, HTMLCanvasElement>();
  private wasInCloud = false;

  private projectionScaleX = 1;
  private projectionScaleY = 1;

  private incidentMarkers = new Map<string, { x: number; y: number; icon: string }>();
  private iconCache = new Map<string, HTMLCanvasElement>();
  
  private unsubscribeResolution: () => void;

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
    private readonly aiOrchestrator: AIOrchestratorSystem,
    private readonly planetSystem: PlanetSystem,
    private readonly cloudManager: CloudManager,
    private scale: number = 1.0,
  ) {
    GlobalEventBus.on('minimap:hide', this.onHide);
    GlobalEventBus.on('minimap:show', this.onShow);

    this.unsubscribeResolution = PlayerSettingsManager.getInstance().onResolutionChange(() => {
      this.resize(getUniformScaleFactor());
    });

    // Apply scale to dimensions
    this.width = Math.floor(this.baseWidth * this.scale);
    this.height = Math.floor(this.baseHeight * this.scale);
    this.margin = Math.floor(this.baseMargin * this.scale);

    this.initializeStaticCache();
    this.resize(getUniformScaleFactor());

    this.cloudManager = cloudManager;

    this.enemyMarkers = {
      passive: this.createEnemyDot('#3399ff'),
      seeking: this.createEnemyDot('#ffbb33'),
      attacking: this.createEnemyDot('#ff0000'),
      hunter: this.createEnemyDot('#ff0000'),
    };

    this.planetMarker = this.createPlanetDot('#00ffff');
    this.playerMarker = this.createPlayerMarker();

    // Await incident markers being added
    GlobalEventBus.on('incident:minimap:marker', this.handleIncidentMarkerAdd);
    GlobalEventBus.on('incident:minimap:clear', this.handleIncidentMarkerClear);
  }

  public setPlayerShip(ship: Ship): void {
    this.player = ship;
  }

  private initializeStaticCache(): void {
    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.width + Math.floor(20 * this.scale); // Extra space for brackets
    this.staticCanvas.height = this.height + Math.floor(20 * this.scale);
    this.staticCtx = this.staticCanvas.getContext('2d');
  }

  private handleIncidentMarkerAdd = (marker: { id: string; icon: string; x: number; y: number }) => {
    this.incidentMarkers.set(marker.id, marker);
  };

  private handleIncidentMarkerClear = ({ id }: { id: string }) => {
    this.incidentMarkers.delete(id);
  };

  private resize(newScale: number): void {
    this.scale = newScale;
    this.width = Math.floor(this.baseWidth * this.scale);
    this.height = Math.floor(this.baseHeight * this.scale);
    this.margin = Math.floor(this.baseMargin * this.scale);

    const padding = Math.floor(20 * this.scale);
    this.projectionScaleX = (this.width - padding) / getWorldWidth();
    this.projectionScaleY = (this.height - padding) / getWorldHeight();

    this.initializeStaticCache();
    this.resetAllCaches();
  }

  private resetAllCaches(): void {
    this.staticCacheValid = false;
    this.enemyMarkers = {
      passive: this.createEnemyDot('#3399ff'),
      seeking: this.createEnemyDot('#ffbb33'),
      attacking: this.createEnemyDot('#ff0000'),
      hunter: this.createEnemyDot('#ff0000'),
    };
    this.planetMarker = this.createPlanetDot('#00ffff');
    this.playerMarker = this.createPlayerMarker();
    this.cloudRegionCache.clear();
  }

  private drawCloudRegions(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    if (!this.cloudManager) return;

    const regions = this.cloudManager.getRegionCoords();
    const padding = Math.floor(20 * this.scale);

    for (const { x, y, radius } of regions) {
      const screen = project({ x, y });

      // Convert world-space radius to minimap pixels
      const pixelRadius = Math.floor(
        (radius / getWorldWidth()) * (this.width - padding)
      );

      const clampedRadius = Math.max(4, pixelRadius);

      const cloudDot = this.getOrCreateCloudRegionDot(clampedRadius);
      const half = Math.floor(cloudDot.width / 2);
      ctx.drawImage(cloudDot, screen.x - half, screen.y - half);
    }
  }

  private getOrCreateCloudRegionDot(pixelRadius: number): HTMLCanvasElement {
    if (this.cloudRegionCache.has(pixelRadius)) {
      return this.cloudRegionCache.get(pixelRadius)!;
    }

    const diameter = pixelRadius * 2;
    const canvas = document.createElement('canvas');
    canvas.width = diameter;
    canvas.height = diameter;

    const ctx = canvas.getContext('2d')!;
    ctx.translate(pixelRadius, pixelRadius); // Center origin

    ctx.fillStyle = 'rgba(255, 97, 239, 0.28)';
    ctx.strokeStyle = 'rgba(129, 0, 105, 0.55)';
    ctx.lineWidth = Math.max(1, Math.floor(1 * this.scale));

    ctx.beginPath();
    ctx.arc(0, 0, pixelRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    this.cloudRegionCache.set(pixelRadius, canvas);
    return canvas;
  }

  private getFrameColor(): string {
    return this.cloudManager?.isShipInCloud() ? '#bb88ff' : '#00ff41';
  }

  private getScanlineColor(): string {
    return this.cloudManager?.isShipInCloud() ? 'rgba(187,136,255,0.06)' : 'rgba(0,255,65,0.06)';
  }

  private getGridLineColor(): string {
    return this.cloudManager?.isShipInCloud() ? '#330055' : '#004120';
  }

  private renderStaticElements(): void {
    if (!this.staticCtx || this.staticCacheValid) return;

    const ctx = this.staticCtx;
    const x = Math.floor(10 * this.scale); // Offset for brackets
    const y = Math.floor(10 * this.scale);

    ctx.clearRect(0, 0, this.staticCanvas!.width, this.staticCanvas!.height);

    // === Diegetic Frame with Corner Brackets ===
    this.drawDiegeticFrame(ctx, x, y);

    // === CRT Background ===
    this.drawCRTBackground(ctx, x, y);

    // === Radar Grid (static) ===
    this.drawRadarGrid(ctx, x, y);

    this.staticCacheValid = true;
  }

  private getOrCreateIncidentIcon(icon: string): HTMLCanvasElement {
    if (this.iconCache.has(icon)) return this.iconCache.get(icon)!;

    const size = Math.floor(18 * this.scale);
    
    // Check if it's a valid icon type, fallback to simple circle if not
    const validIcons: IconType[] = ['caution', 'greenCross', 'skullAndBones', 'treasure', 'purpleVortex', 'quantumAttractor', 'planet'];
    const iconType = validIcons.includes(icon as IconType) ? icon as IconType : null;
    
    let canvas: HTMLCanvasElement;
    
    if (iconType) {
      // Use the new icon system
      canvas = MiniMapIcons.createIcon(iconType, size);
    } else {
      // Fallback for unknown icons - create a simple colored circle
      canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    this.iconCache.set(icon, canvas);
    return canvas;
  }

  render(): void {
    if (this.hidden) return;

    const ctx = this.canvasManager.getContext('overlay');
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Update only essential animations
    this.animationTime = currentTime;
    this.scanlineOffset = (this.scanlineOffset + deltaTime * 0.03) % (4 * this.scale); // Scaled scanlines

    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;
    const x = canvasW - this.width - this.margin * 1.5;
    const y = canvasH - this.height - this.margin;

    const alpha = SETTINGS.MINIMAP_TRANSPARENCY ?? 0.85;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Cloud check and cache invalidation
    const inCloud = this.cloudManager?.isShipInCloud() ?? false;

    if (inCloud !== this.wasInCloud) {
      this.invalidateCache(); // Forces redraw of staticCanvas with new theme
      this.wasInCloud = inCloud;
    }

    // === Draw cached static elements ===
    this.renderStaticElements();
    if (this.staticCanvas) {
      ctx.drawImage(this.staticCanvas, x - Math.floor(10 * this.scale), y - Math.floor(10 * this.scale));
    }

    // === Coordinate projection helper ===
    const offset = Math.floor(10 * this.scale);
    const halfWorldWidth = getWorldWidth() / 2;
    const halfWorldHeight = getWorldHeight() / 2;

    const project = (worldPos: { x: number; y: number }) => {
      return {
        x: x + offset + (worldPos.x + halfWorldWidth) * this.projectionScaleX,
        y: y + offset + (worldPos.y + halfWorldHeight) * this.projectionScaleY,
      };
    };

    // === Draw planets
    this.drawPlanets(ctx, project);

    // === Draw cloud regions ===
    this.drawCloudRegions(ctx, project);

    // === Draw ships (simplified) ===
    this.drawPlayerShip(ctx, project);

    // === Draw incidents ===
    for (const { x: worldX, y: worldY, icon } of this.incidentMarkers.values()) {
      const screen = project({ x: worldX, y: worldY });
      const image = this.getOrCreateIncidentIcon(icon);
      const half = Math.floor(image.width / 2);
      ctx.drawImage(image, screen.x - half, screen.y - half);
    }

    // === Minimal scanlines ===
    this.drawScanlines(ctx, x, y);

    // // === Minimal status indicator ===
    // this.drawStatusIndicator(ctx, x, y);

    ctx.restore();
  }

  private drawPlayerShip(ctx: CanvasRenderingContext2D, project: (pos: { x: number; y: number }) => { x: number; y: number }): void {
    if (!this.player) return;

    const playerPos = project(this.player.getTransform().position);
    const playerRotation = this.player.getTransform().rotation;

    // === Draw Player (diamond with orientation, rasterized) ===
    ctx.save();
    ctx.globalAlpha = 1.0;
    ctx.translate(playerPos.x, playerPos.y);
    ctx.rotate(playerRotation);
    const playerMarkerHalfSize = Math.floor(8 * this.scale);
    ctx.drawImage(this.playerMarker, -playerMarkerHalfSize, -playerMarkerHalfSize); // Centered draw
    ctx.restore();
  }

  private drawDiegeticFrame(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const frameColor = this.getFrameColor();
    const frameThickness = Math.floor(2 * this.scale);
    const cornerSize = Math.floor(8 * this.scale);
    const bracketOffset = Math.floor(6 * this.scale);

    // Main frame
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameThickness;
    ctx.strokeRect(
      x - frameThickness,
      y - frameThickness,
      this.width + frameThickness * 2,
      this.height + frameThickness * 2
    );

    // Simplified corner brackets
    ctx.strokeStyle = frameColor;
    ctx.lineWidth = Math.max(1, Math.floor(1 * this.scale));

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

  public hide(): void {
    this.hidden = true;
  }

  public show(): void {
    this.hidden = false;
  }

  private drawCRTBackground(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const inCloud = this.cloudManager?.isShipInCloud() ?? false;

    // Simple vertical gradient background
    const bgGradient = ctx.createLinearGradient(x, y, x, y + this.height);
    
    if (inCloud) {
      bgGradient.addColorStop(0, '#100024'); // purple-tinted CRT
      bgGradient.addColorStop(1, '#050013');
    } else {
      bgGradient.addColorStop(0, '#001a00'); // standard CRT green
      bgGradient.addColorStop(1, '#000a00');
    }

    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, this.width, this.height);
  }

  private drawRadarGrid(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = this.getGridLineColor();
    ctx.lineWidth = Math.max(1, Math.floor(1 * this.scale));

    const centerX = x + this.width / 2;
    const centerY = y + this.height / 2;
    const maxRadius = Math.min(this.width, this.height) / 2 - Math.floor(10 * this.scale);

    // Draw 2 concentric rings
    for (let i = 1; i <= 2; i++) {
      const radius = (maxRadius * i) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(centerX, y + Math.floor(10 * this.scale));
    ctx.lineTo(centerX, y + this.height - Math.floor(10 * this.scale));
    ctx.moveTo(x + Math.floor(10 * this.scale), centerY);
    ctx.lineTo(x + this.width - Math.floor(10 * this.scale), centerY);
    ctx.stroke();
  }

  private drawPlanets(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    const basePlanetWorldRadius = 256; // Match whatever a scale=1.0 planet means in world units

    for (const planet of this.planetSystem.getPlanets()) {
      const scale = planet.getScale();
      const pos = planet.getPosition();
      const screen = project(pos);

      // === Determine world size of planet, then map to minimap scale
      const planetWorldRadius = basePlanetWorldRadius * scale;

      // Convert world-space radius to minimap pixels
      const minimapPixelRadius = Math.floor(
        (planetWorldRadius / getWorldWidth()) * (this.width - Math.floor(20 * this.scale))
      );

      const pixelRadius = Math.max(2, minimapPixelRadius); // Enforce a minimum render size

      ctx.save();
      ctx.translate(screen.x, screen.y);
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = Math.floor(6 * this.scale);
      ctx.beginPath();
      ctx.arc(0, 0, pixelRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Deprecated: No longer used, TODO: Maybe draw incident enemies or bosses
  private drawShips(
    ctx: CanvasRenderingContext2D,
    project: (pos: { x: number; y: number }) => { x: number; y: number }
  ): void {
    if (!this.player) return;

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

      const enemyMarkerHalfSize = Math.floor(4 * this.scale);
      ctx.drawImage(markerCanvas, px - enemyMarkerHalfSize, py - enemyMarkerHalfSize); // Center on dot
    }
  }

  private createPlanetDot(color: string): HTMLCanvasElement {
    const size = Math.floor(16 * this.scale); // 4x standard dot size (normal is 8px)
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.floor(8 * this.scale);

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, Math.floor(6 * this.scale), 0, Math.PI * 2); // Larger radius
    ctx.fill();

    return canvas;
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = this.getScanlineColor();

    const scanlineSpacing = Math.floor(8 * this.scale);
    for (let i = -this.scanlineOffset; i < this.height; i += scanlineSpacing) {
      if (y + i >= y && y + i < y + this.height) {
        ctx.fillRect(x, y + i, this.width, Math.max(1, Math.floor(1 * this.scale)));
      }
    }
  }

  // Call this when the minimap size or styling changes to invalidate cache
  public invalidateCache(): void {
    this.staticCacheValid = false;
  }

  private createEnemyDot(color: string): HTMLCanvasElement {
    const size = Math.floor(8 * this.scale);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.floor(4 * this.scale);

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, Math.floor(2 * this.scale), 0, Math.PI * 2);
    ctx.fill();

    return canvas;
  }

  private createPlayerMarker(): HTMLCanvasElement {
    const size = Math.floor(16 * this.scale);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    ctx.translate(size / 2, size / 2);
    ctx.rotate(0); // Leave unrotated; rotate at render time if needed

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = Math.floor(6 * this.scale);

    const markerSize = Math.floor(4 * this.scale);
    const markerLineLength = Math.floor(4 * this.scale);

    ctx.beginPath();
    ctx.moveTo(0, -markerSize);
    ctx.lineTo(Math.floor(3 * this.scale), 0);
    ctx.lineTo(0, markerSize);
    ctx.lineTo(-Math.floor(3 * this.scale), 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, Math.floor(1 * this.scale));
    ctx.beginPath();
    ctx.moveTo(0, -markerSize);
    ctx.lineTo(0, -markerSize - markerLineLength);
    ctx.stroke();

    return canvas;
  }

  public destroy(): void {
    this.unsubscribeResolution();

    GlobalEventBus.off('incident:minimap:marker', this.handleIncidentMarkerAdd);
    GlobalEventBus.off('incident:minimap:clear', this.handleIncidentMarkerClear);

    GlobalEventBus.off('minimap:hide', this.onHide);
    GlobalEventBus.off('minimap:show', this.onShow);

    this.incidentMarkers.clear();
    this.iconCache.clear();

  }
}
