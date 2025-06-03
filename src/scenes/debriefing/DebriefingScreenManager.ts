import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { sceneManager } from '@/core/SceneManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { drawCRTButton, UICRTButton } from '@/ui/primitives/CRTButton';
import { drawCRTText } from '@/ui/primitives/CRTText';
import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import { getBlockType } from '@/game/blocks/BlockRegistry';
import type { InputManager } from '@/core/InputManager';
import { drawCRTBox } from '@/ui/primitives/CRTBox'; // assumes existence

export class DebriefingScreenManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private returnButton: UICRTButton;

  constructor(canvasManager: CanvasManager, gameLoop: GameLoop, inputManager: InputManager) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.returnButton = {
      x: 240 - 100,
      y: 520,
      width: 200,
      height: 40,
      label: 'Return to Hub',
      isHovered: false,
      onClick: () => {
        missionResultStore.clear();
        this.inputManager.enableAllKeys();
        this.stop();
        sceneManager.fadeToScene('hub');
      },
      style: {
        backgroundColor: '#001100',
        borderColor: '#00ff41',
        textColor: '#00ff41',
        font: '14px "Courier New", monospace',
        glow: true,
        chromaticAberration: true,
        alpha: 1
      }
    };
  }

  public start() {
    this.gameLoop.onUpdate(this.update);
    this.gameLoop.onRender(this.render);
    this.gameLoop.start();
  }

  public stop() {
    this.gameLoop.offUpdate(this.update);
    this.gameLoop.offRender(this.render);
  }

  private update = () => {
    this.inputManager.updateFrame();
    const { x, y } = this.inputManager.getMousePosition();
    this.returnButton.isHovered =
      x >= this.returnButton.x &&
      x <= this.returnButton.x + this.returnButton.width &&
      y >= this.returnButton.y &&
      y <= this.returnButton.y + this.returnButton.height;

    if (this.inputManager.wasMouseClicked() && this.returnButton.isHovered) {
      this.returnButton.onClick();
    }
  };

  private render = () => {
    this.canvasManager.clearAll();

    const ctx = this.canvasManager.getContext('ui');
    const mouse = this.inputManager.getMousePosition();

    // === Background scanline box ===
    drawCRTBox(ctx, {
      x: 40,
      y: 40,
      width: 400,
      height: 460,
      style: {
        borderColor: '#00ff41',
        backgroundColor: '#0a0a0a',
        glow: true,
        cornerBevel: true,
        scanlineIntensity: 0.3,
        chromaticAberration: true,
      }
    });

    if (!missionResultStore.hasResult()) {
      drawCRTText(ctx, 240, 240, 'ERROR: MISSION DATA MISSING', {
        font: '20px "Courier New", monospace',
        align: 'center',
        glow: true,
        chromaticAberration: true,
        color: '#ff0040'
      });
      return;
    }

    const result = missionResultStore.get();
    let y = 80;

    const line = (text: string, color = '#6ef') => {
      drawCRTText(ctx, 60, y, text, {
        font: '14px "Courier New", monospace',
        color,
        glow: true,
        chromaticAberration: true,
      });
      y += 20;
    };

    // === Title ===
    drawCRTText(ctx, 240, y, 'MISSION DEBRIEFING', {
      font: '22px "Courier New", monospace',
      align: 'center',
      glow: true,
      chromaticAberration: true,
      color: '#00ff41'
    });
    y += 40;

    line(`> Outcome: ${result.outcome.toUpperCase()}`, result.outcome === 'victory' ? '#00ff41' : '#ff0040');
    line(`> Enemies Destroyed: ${result.enemiesDestroyed}`);
    line(`> Entropium Gathered: ${result.currencyGathered}`);
    line(`> Blocks Placed: ${result.blockPlacedCount}`);
    line(`> Passive Points Earned: ${result.passivePointsEarned}`);
    line(`> Mission Duration: ${result.timeTakenSeconds?.toFixed(1)}s`);

    if (result.blocksUnlocked.length > 0) {
      line('');
      line('> New Blocks Unlocked:', '#ffaa00');
      for (const blockId of result.blocksUnlocked) {
        line(`    • ${getBlockType(blockId)}`, '#ffaa00');
      }
    }

    // === Return button ===
    drawCRTButton(ctx, this.returnButton);

    // === Cursor ===
    const cursor = getCrosshairCursorSprite();
    ctx.drawImage(cursor, mouse.x - cursor.width / 2, mouse.y - cursor.height / 2);
  };
}
