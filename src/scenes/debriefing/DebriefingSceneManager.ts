// src/scenes/hub/DebriefingSceneManager.ts

import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { InputManager } from '@/core/InputManager';
import { sceneManager } from '@/core/SceneManager';
import { audioManager } from '@/audio/Audio';

import { AnimatedLabel } from '@/ui/components/AnimatedLabel';
import { calculateCoresEarnedDetailed, calculateCoresEarned } from '@/scenes/debriefing/helpers/calculateCores';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { PlayerMetaCurrencyManager } from '@/game/player/PlayerMetaCurrencyManager';

import { destroyGLBlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { getAssetPath } from '@/shared/assetHelpers';
import { createPreviewShip } from '@/game/ship/factories/previewShipFactory';
import { PreviewShipRendererGL } from '@/rendering/PreviewShipRenderer';
import type { SerializedShip } from '@/systems/serialization/ShipSerializer';
import type { PreviewShip } from '@/game/ship/PreviewShip';

import { FlyInBox } from './entities/FlyInBox';
import { FlyInLabel } from './entities/FlyInLabel';
import { getUniformScaleFactor, getViewportHeight, getViewportWidth } from '@/config/view';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton, handleButtonInteraction } from '@/ui/primitives/UIButton';
import { CursorRenderer } from '@/rendering/CursorRenderer';

const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 50;

const COLUMN_START_X = 300;
const ROW_BASE_Y = 160;
const ROW_SPACING_Y = 28;

const BOX_WIDTH = 520;
const BOX_HEIGHT = 60;

type DebriefingPhase = 'reveal' | 'tally' | 'done';

// === DEBUG: Simulated mission ===
missionResultStore.initialize();
missionResultStore.get().outcome = 'victory';
missionResultStore.incrementBlockCollectedCount(220);
missionResultStore.incrementWavesCleared(3);
missionResultStore.incrementKillCount(100);
missionResultStore.addCurrency(4542);
missionResultStore.incrementMassAchieved(4040);
missionResultStore.incrementIncidentsCompleted(2);

export class DebriefingSceneManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private cursorRenderer: CursorRenderer;

  private state: DebriefingPhase = 'reveal';

  private buttons: UIButton[];

  private flyInLabels: FlyInLabel[] = [];
  private labelRevealTimer = 1.0;
  private nextLabelIndex = 0;

  private summaryBox: FlyInBox | null = null;
  private boxTriggered: boolean = false;

  private coresToAdd: number[] = [];
  private tallyIndex: number = 0;
  private tallyTimer: number = 0;
  private tallyPitchAdd: number = 0;
  private totalCores: number = 0;
  private coresAdded: number = 0;
  private currentDecrement = 1;
  private decrementAcceleration = 1.2;

  private previewShip?: PreviewShip;
  private previewRenderer?: PreviewShipRendererGL;
  private shipJsonLoaded = false;

  private headerLabel!: AnimatedLabel;
  private subtitleLabel!: AnimatedLabel;

  private missionResult: string | null = null;

  private initialBlackoutTimer: number = 1.2;
  private introDelayTimer: number = 1.20; // seconds

  constructor(
    canvasManager: CanvasManager,
    gameLoop: GameLoop,
    inputManager: InputManager
  ) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;
    this.cursorRenderer = new CursorRenderer(canvasManager, inputManager, null);

    this.missionResult = missionResultStore.get().outcome;

    // === Immediately credit meta currency ===
    const detailed = calculateCoresEarnedDetailed();
    const totalEarned = Object.values(detailed).reduce((sum, v) => sum + v, 0);
    PlayerMetaCurrencyManager.getInstance().addMetaCurrency(totalEarned);

    if (this.missionResult === 'victory') {
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_succeeded_00.wav', 'sfx');
      audioManager.playMusic({ file: 'assets/sounds/music/track_06_mission4.mp3'});
    } else {
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_failed_00.wav', 'sfx');
      audioManager.playMusic({ file: 'assets/sounds/music/track_06_mission4.mp3'});
    }
    
    const scale = getUniformScaleFactor();
    const screenW = getViewportWidth();
    const screenH = getViewportHeight();

    const crtStyle = {
      borderRadius: 10,
      alpha: 0.85,
      borderColor: '#00ff00',
      textFont: `${Math.round(18 * scale)}px monospace`,
      backgroundGradient: {
        type: 'linear' as const,
        stops: [
          { offset: 0, color: '#002200' },
          { offset: 1, color: '#001500' }
        ]
      }
    };

    this.buttons = [
      {
        x: screenW / 2 - BUTTON_WIDTH * scale / 2,
        y: screenH - 80 * scale - BUTTON_HEIGHT * scale / 2,
        width: BUTTON_WIDTH * scale,
        height: BUTTON_HEIGHT * scale,
        label: 'Return to Base',
        isHovered: false,
        onClick: () => {
          audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 4 });

          if (this.state !== 'done') {
            this.skipToDone();
            return;
          }

          this.stop();
          sceneManager.fadeToScene('hub');
        },
        style: crtStyle
      }
    ];

    const headerText = 'Mission Debriefing';
    const subtitleText = this.missionResult?.toUpperCase() ?? 'ERROR';

    this.headerLabel = new AnimatedLabel(
      headerText,
      screenW / 2,
      40 * scale,
      {
        align: 'center',
        font: `${Math.round(36)}px monospace`,
        color: '#00ff00',
        glow: true
      }
    );

    this.subtitleLabel = new AnimatedLabel(
      subtitleText,
      screenW / 2,
      80 * scale,
      {
        align: 'center',
        font: `${Math.round(24)}px monospace`,
        color: this.missionResult === 'victory' ? '#00ff00' : '#ff0000',
        glow: true
      }
    );

    // === Fly-in labels ===
    const baseY = ROW_BASE_Y;
    const spacing = ROW_SPACING_Y;
    const labelX = COLUMN_START_X;

    const result = missionResultStore.get();

    const labelEntries: [string, number][] = [
      [`Waves Cleared: ${result.wavesCleared}`, detailed.fromWaves],
      [`Enemies Destroyed: ${result.enemiesDestroyed}`, detailed.fromKills],
      [`Blocks Collected: ${result.blocksCollected}`, detailed.fromBlocks],
      [`Entropium Gathered: ${result.currencyGathered}`, detailed.fromCurrency],
      [`Mass Achieved: ${result.massAchieved}`, detailed.fromMass],
      [`Incidents Completed: ${result.incidentsCompleted}`, detailed.fromIncidents],
    ];

    if (this.missionResult === 'victory') {
      labelEntries.push([`Victory Bonus: 1000`, detailed.fromVictory]);
    }

    this.flyInLabels = labelEntries.map(([text], i) => {
      return new FlyInLabel(text, labelX, baseY + i * spacing);
    });

    this.coresToAdd = labelEntries.map(([_, coreValue]) => coreValue);

    // === Summary box (placed after all labels)
    const boxX = screenW / 2 - BOX_WIDTH * scale / 2;
    // const boxY = baseY + labelEntries.length * spacing + 40 * scale + 24 * scale;
    const boxY = screenH - (220 * scale);
    this.summaryBox = new FlyInBox(boxX, boxY, BOX_WIDTH, BOX_HEIGHT);
  }

start() {
  this.gameLoop.onUpdate(this.update);
  this.gameLoop.onRender(this.render);
  this.gameLoop.start();

  // === Step 3: Now load the preview ship and renderer
  const path = getAssetPath('assets/ships/player/ship_00.json');

  fetch(path)
    .then(res => res.json())
    .then((data: SerializedShip) => {
      // Example of putting it in the middle right corner, notice that X and Y are inverted.
      // const scale = getUniformScaleFactor();
      // const shipX = -160 * scale;
      // const shipY = 130 * scale;
      // const shipScale = 0.75 * scale;

      // this.previewShip = createPreviewShip(data, shipX, shipY, shipScale); // No matter what X,Y I pass in, it's always in the same spot
      // this.previewRenderer = new PreviewShipRendererGL();
      // this.shipJsonLoaded = true;
      // this.previewShip.getTransform().position.x = shipX;
      // this.previewShip.getTransform().position.y = shipY;

      const scale = getUniformScaleFactor();
      const shipX = 0;
      const shipY = 0;
      const shipScale = scale;

      this.previewShip = createPreviewShip(data, shipX, shipY, shipScale); // No matter what X,Y I pass in, it's always in the same spot
      this.previewRenderer = new PreviewShipRendererGL();
      this.shipJsonLoaded = true;
      this.previewShip.getTransform().position.x = shipX;
      this.previewShip.getTransform().position.y = shipY;
    })
    .catch(err => {
      console.error('[DebriefingSceneManager] Failed to load preview ship JSON:', err);
    });
}

  stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
    this.cursorRenderer.destroy();
    this.previewRenderer?.destroy();
    destroyGLBlockSpriteCache(this.canvasManager.getWebGLContext('entitygl'));
  }

  private update = () => {
    const dt = this.gameLoop.getDeltaTime();

    // === Initial blackout ===
    if (this.initialBlackoutTimer > 0) {
      this.initialBlackoutTimer -= dt;
      return;
    }

    // === Initial delay before showing anything ===
    if (this.introDelayTimer > 0) {
      this.introDelayTimer -= dt;
      if (this.introDelayTimer <= 0) {
        this.headerLabel.trigger();
        this.subtitleLabel.trigger();
      }
      return;
    }

    const scale = getUniformScaleFactor();
    this.inputManager.updateFrame();

    const { x, y } = this.inputManager.getMousePosition();
    const clicked = this.inputManager.wasMouseClicked();

    handleButtonInteraction(this.buttons[0], x, y, clicked, scale);

    if (this.state === 'reveal') {
      this.updateReveal(dt);
    } else if (this.state === 'tally') {
      this.updateTally(dt);
    }

    this.headerLabel.update(dt);
    this.subtitleLabel.update(dt);

    for (const label of this.flyInLabels) label.update(dt);
    this.summaryBox?.update(dt);

    // === Preview ship spin ===
    if (this.previewShip && this.previewRenderer && this.hasHeaderFinished()) {
      const transform = this.previewShip.getTransform();
      transform.rotation += dt * 0.25;
    }
  };

  private updateReveal(dt: number) {
    this.labelRevealTimer -= dt;

    if (this.labelRevealTimer <= 0 && this.nextLabelIndex < this.flyInLabels.length) {
      audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 5 });
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_whoosh_00.wav', 'sfx', { maxSimultaneous: 5 });
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_whoosh_01.wav', 'sfx', { maxSimultaneous: 5 });
      this.flyInLabels[this.nextLabelIndex].trigger();
      this.nextLabelIndex++;
      this.labelRevealTimer = 1.0;

    }

    if (
      !this.boxTriggered &&
      this.nextLabelIndex === this.flyInLabels.length &&
      this.labelRevealTimer <= 0
    ) {
      this.summaryBox?.trigger();
      this.boxTriggered = true;
    }

    if (
      this.boxTriggered &&
      this.summaryBox?.isAppeared()
    ) {
      this.beginTally();
      this.state = 'tally';
    }
  }

  private beginTally() {
    audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 10 });

    this.totalCores = this.coresToAdd.reduce((a, b) => a + b, 0);
    this.tallyIndex = 0;
    this.tallyTimer = 0.5;
    this.currentDecrement = 1;

    this.flyInLabels.forEach(label => label.setActive(false));
    this.flyInLabels[0]?.setActive(true);
  }

  private updateTally(dt: number) {
    if (this.tallyIndex >= this.coresToAdd.length) {
      this.state = 'done';
      this.summaryBox?.setFloatingState();
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_end_00.wav', 'sfx', { maxSimultaneous: 2 });
      return;
    }

    this.tallyTimer -= dt;
    if (this.tallyTimer > 0) return;

    const coresRemaining = this.coresToAdd[this.tallyIndex];
    const label = this.flyInLabels[this.tallyIndex];
    label?.setActive(true);

    const decremented = label?.decrementDynamic(Math.floor(this.currentDecrement)) ?? false;

    if (decremented) {
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_tally_01.wav', 'sfx', { maxSimultaneous: 25, pitch: 1.0 + this.tallyPitchAdd });
      this.currentDecrement *= this.decrementAcceleration;
      this.tallyTimer = 0.05;
      this.tallyPitchAdd -= 0.005;
    } else if (coresRemaining > 0) {
      audioManager.play('assets/sounds/sfx/debriefing/debriefing_addcores_00.wav', 'sfx', { maxSimultaneous: 25 });
      this.summaryBox?.addCore();
      this.coresAdded++;
      this.coresToAdd[this.tallyIndex]--;
      this.tallyTimer = 0.15;
      this.currentDecrement = 1;
    } else {
      audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 10 });
      label?.setActive(false);
      this.tallyIndex++;
      this.tallyPitchAdd = 0;
      if (this.tallyIndex < this.flyInLabels.length) {
        this.flyInLabels[this.tallyIndex].setActive(true);
      }
      this.tallyTimer = 0.5;
      this.currentDecrement = 1;
    }
  }

  private render = () => {
    // Blackout: draw absolutely nothing
    if (this.initialBlackoutTimer > 0) return;

    this.canvasManager.clearAll();

    const uiCtx = this.canvasManager.getContext('ui');
    const scale = getUniformScaleFactor();
    // const screenW = getViewportWidth();

    this.headerLabel.render(uiCtx, scale);
    this.subtitleLabel.render(uiCtx, scale);

    if (this.hasHeaderFinished() && this.shipJsonLoaded && this.previewRenderer && this.previewShip) {
      this.previewRenderer.render(this.previewShip, this.gameLoop.getDeltaTime());
    }

    if (!this.hasHeaderFinished()) return;

    for (const label of this.flyInLabels) {
      label.render(uiCtx);
    }

    this.summaryBox?.render(uiCtx);

    for (const btn of this.buttons) {
      drawButton(uiCtx, btn);
    }

    this.cursorRenderer.render();
  };

  private hasHeaderFinished(): boolean {
    return this.headerLabel.hasCompleted() && this.subtitleLabel.hasCompleted();
  }

  private skipToDone(): void {
    // Force all fly-in labels to appear immediately
    for (const label of this.flyInLabels) {
      label.trigger();
      label.setActive(false); // deactivate all for clarity
    }

    if (this.summaryBox && !this.boxTriggered) {
      this.summaryBox.trigger();
      this.boxTriggered = true;
    }

    // Skip any tallying logic; add all cores to the box
    const total = this.coresToAdd.reduce((a, b) => a + b, 0);
    this.summaryBox?.forceCoreCount(total); // You may need to implement this if not already present

    this.coresAdded = total;
    this.coresToAdd = this.coresToAdd.map(() => 0); // clear countdowns
    this.state = 'done';

    this.summaryBox?.setFloatingState();

    audioManager.play('assets/sounds/sfx/debriefing/debriefing_end_00.wav', 'sfx', { maxSimultaneous: 2 });
  }
}
