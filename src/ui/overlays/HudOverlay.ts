// src/ui/overlays/HudOverlay.ts

import type { CanvasManager } from '@/core/CanvasManager';
import type { Ship } from '@/game/ship/Ship';
import type { PlayerResources } from '@/game/player/PlayerResources';
import type { FloatingTextManager } from '@/rendering/floatingtext/FloatingTextManager';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';
import type { InputManager } from '@/core/InputManager';

import { PlayerExperienceBar } from '@/ui/overlays/components/PlayerExperienceBar';
import { PlayerExperienceManager } from '@/game/player/PlayerExperienceManager';
import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
import { drawUIVerticalResourceBar } from '@/ui/primitives/UIVerticalResourceBar';
import { drawFiringModeToggle } from '@/ui/primitives/UIFiringModeToggle';
import { drawLabel } from '@/ui/primitives/UILabel';
import { getUniformScaleFactor } from '@/config/view';

import { GlobalEventBus } from '@/core/EventBus';

import { PlayerResources as PlayerResourcesSingleton } from '@/game/player/PlayerResources';
import { BlockQueueDisplayManager } from '@/ui/overlays/components/BlockQueueDisplayManager';

export class HudOverlay {
  private ship: Ship | null = null;

  private readonly playerResources: PlayerResources;
  private readonly blockQueueDisplayManager: BlockQueueDisplayManager;

  private readonly onHide = () => this.hide();
  private readonly onShow = () => this.show();
  private hidden: boolean = false;

  private entropium: number = 0;
  private previousEntropium: number = 0;
  private experienceBar: PlayerExperienceBar;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly floatingTextManager: FloatingTextManager,
    private readonly blockDropDecisionMenu: BlockDropDecisionMenu,
    private readonly inputManager: InputManager,
  ) {
    GlobalEventBus.on('hud:hide', this.onHide);
    GlobalEventBus.on('hud:show', this.onShow);

    this.experienceBar = new PlayerExperienceBar(floatingTextManager);
    this.inputManager = inputManager;
    this.playerResources = PlayerResourcesSingleton.getInstance();
    this.entropium = PlayerExperienceManager.getInstance().getEntropium();
    this.previousEntropium = this.entropium;

    // Pass through the blockDropDecisionMenu
    this.blockQueueDisplayManager = new BlockQueueDisplayManager(
      this.canvasManager,
      this.playerResources,
      this.blockDropDecisionMenu,
      this.inputManager
    );
  }

  public setPlayerShip(ship: Ship): void {
    this.ship = ship;
  }

  update(dt: number): void {
    this.experienceBar.update(dt);
    this.blockQueueDisplayManager.update(dt);
  }

  render(dt: number): void {
    // === Block Queue Display ===
    this.blockQueueDisplayManager.render();
    this.experienceBar.render();
    
    if (this.hidden) return;
    if (!this.ship) return;

    const scale = getUniformScaleFactor();
    const ctx = this.canvasManager.getContext('ui');
    const canvas = ctx.canvas;

    const { velocity } = this.ship.getTransform();
    // const blocks = this.ship.getAllBlocks();
    const currentHp = Math.floor(this.ship.getCockpitHp() ?? 0);
    const maxHp = Math.floor(this.ship.getCockpit()?.type.armor ?? 1);
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

    const energyComponent = this.ship.getEnergyComponent();
    const energy = Math.floor(energyComponent?.getCurrent() ?? 0);
    const maxEnergy = Math.floor(energyComponent?.getMax() ?? 0);

    const barWidth = Math.floor(120 * scale);
    const barHeight = Math.floor(12 * scale);
    const spacing = Math.floor(20 * scale);
    const totalWidth = barWidth * 2 + spacing;
    const baseX = Math.floor((canvas.width - totalWidth) / 2);
    const y = canvas.height - Math.floor(24 * scale);

    const toggleWidth = Math.floor(120 * scale);
    const toggleHeight = Math.floor(24 * scale);
    const toggleX = Math.floor(64 * scale);
    const toggleY = y - Math.floor(70 * scale);

    // === Afterburner Fuel Bar ===
    const afterburnerComponent = this.ship.getAfterburnerComponent();
    const afterburnerValue = afterburnerComponent ? afterburnerComponent.getCurrent() : 0;
    const afterburnerMax = afterburnerComponent ? afterburnerComponent.getMax() : 1;

    drawUIResourceBar(ctx, {
      x: toggleX,
      y: y - Math.floor(24 * scale),
      width: barWidth,
      height: barHeight,
      value: afterburnerValue / afterburnerMax,
      label: `${Math.floor(afterburnerValue)} / ${afterburnerMax}`,
      style: {
        barColor: '#ffcc00',
        borderColor: '#ffee88',
        backgroundColor: '#221800',
        glow: true,
        textColor: '#ffffaa',
        font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
        scanlineIntensity: 0.3,
        chromaticAberration: true,
        phosphorDecay: true,
        cornerBevel: true,
        warningThreshold: 0.25,
        criticalThreshold: 0.1,
        warningColor: '#ffaa00',
        criticalColor: '#ff0040',
        animated: true,
      }
    }, performance.now());

    // === Energy Bar ===
    drawUIResourceBar(ctx, {
      x: toggleX,
      y: y,
      width: barWidth,
      height: barHeight,
      value: maxEnergy > 0 ? energy / maxEnergy : 1,
      label: `${Math.round(energy)} / ${maxEnergy}`,
      style: {
        barColor: '#0af',
        borderColor: '#6cf',
        backgroundColor: '#003',
        glow: true,
        textColor: '#9cf',
        font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
        scanlineIntensity: 0.25,
        chromaticAberration: true,
        phosphorDecay: true,
        cornerBevel: true,
        warningThreshold: 0.25,
        criticalThreshold: 0.1,
        warningColor: '#ffaa00',
        criticalColor: '#ff0040',
        animated: true,
      }
    }, performance.now());

    // === Speed Bar (Vertical) ===
    const speedBarHeight = Math.floor(120 * scale);
    const speedBarWidth = Math.floor(12 * scale);
    const speedBarX = Math.floor(32 * scale);
    const speedBarY = y - speedBarHeight + Math.floor(14 * scale);

    drawUIVerticalResourceBar(ctx, {
      x: speedBarX,
      y: speedBarY,
      width: speedBarWidth,
      height: speedBarHeight,
      value: speed,
      maxValue: 2000,
      style: {
        barColor: '#00ff41',
        backgroundColor: '#001100',
        borderColor: '#00aa33',
        glow: true,
        textColor: '#00ff88',
        showLabel: true,
        unit: 'm/s',
      }
    });

    // === Firing Mode Toggle ===

    drawFiringModeToggle(ctx, {
      x: toggleX,
      y: y - Math.floor(62 * scale),
      mode: this.ship.getFiringMode(),
      style: {
        width: toggleWidth,
        height: toggleHeight,
        backgroundColor: '#000a00',
        borderColor: '#00ff41',
        activeColor: '#00ff41',
        inactiveColor: '#001a00',
        textColor: '#00ff41',
        glowColor: '#00ff41',
        font: `${Math.floor(10 * scale)}px "Courier New", monospace`,
        glow: true,
        animated: true,
        scanlineIntensity: 0.3,
        chromaticAberration: false,
      }
    }, performance.now());
  }

  destroy(): void {
    GlobalEventBus.off('hud:hide', this.onHide);
    GlobalEventBus.off('hud:show', this.onShow);
    this.experienceBar.destroy();
    this.blockQueueDisplayManager.destroy();
  }

  public hide(): void {
    this.hidden = true;
  }

  public show(): void {
    this.hidden = false;
  }
}
