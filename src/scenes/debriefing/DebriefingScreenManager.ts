import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { sceneManager } from '@/core/SceneManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { getCrosshairCursorSprite } from '@/rendering/cache/CursorSpriteCache';
import type { InputManager } from '@/core/InputManager';

export class DebriefingScreenManager {
  private canvasManager: CanvasManager;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private returnButton: UIButton;

  constructor(canvasManager: CanvasManager, gameLoop: GameLoop, inputManager: InputManager) {
    this.canvasManager = canvasManager;
    this.gameLoop = gameLoop;
    this.inputManager = inputManager;

    this.returnButton = {
      x: 240,
      y: 520,
      width: 200,
      height: 40,
      label: 'Return to Hub',
      isHovered: false,
      onClick: () => {
        missionResultStore.clear();
        this.stop();
        sceneManager.fadeToScene('hub');
      },
      style: {
        borderRadius: 10,
        alpha: 0.85,
        borderColor: '#00ff00',
        backgroundGradient: {
          type: 'linear',
          stops: [
            { offset: 0, color: '#002200' },
            { offset: 1, color: '#001500' }
          ]
        }
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
    const { returnButton } = this;

    returnButton.isHovered =
      x >= returnButton.x &&
      x <= returnButton.x + returnButton.width &&
      y >= returnButton.y &&
      y <= returnButton.y + returnButton.height;

    if (this.inputManager.wasMouseClicked() && returnButton.isHovered) {
      returnButton.onClick();
    }
  };

  private render = () => {
    this.canvasManager.clearAll();
    const ctx = this.canvasManager.getContext('ui');

    if (!missionResultStore.hasResult()) {
      drawLabel(ctx, 240, 240, 'Error: No mission data available', {
        font: '20px monospace',
        align: 'center',
        glow: true
      });
      return;
    }

    const result = missionResultStore.get();
    let y = 60;

    const line = (text: string) => {
      drawLabel(ctx, 80, y, text, {
        font: '14px monospace',
        glow: true
      });
      y += 22;
    };

    drawLabel(ctx, 240, y, 'Mission Debriefing', {
      font: '24px monospace',
      align: 'center',
      glow: true
    });
    y += 40;

    line(`Mission Outcome: ${result.outcome === 'victory' ? 'Victory' : 'Defeat'}`);
    line(`Enemies Destroyed: ${result.enemiesDestroyed}`);
    line(`Currency Gathered: ${result.currencyGathered}`);
    line(`Passive Points Earned: ${result.passivePointsEarned}`);
    line(`Time Taken: ${result.timeTakenSeconds?.toFixed(1)}s`);

    if (result.blocksUnlocked.length > 0) {
      line('');
      line('Blocks Unlocked:');
      for (const blockId of result.blocksUnlocked) {
        line(`• ${blockId}`);
      }
    }

    drawButton(ctx, this.returnButton);

    // Draw cursor
    const cursor = getCrosshairCursorSprite();
    const mouse = this.inputManager.getMousePosition();
    ctx.drawImage(cursor, mouse.x - cursor.width / 2, mouse.y - cursor.height / 2);
  };
}
