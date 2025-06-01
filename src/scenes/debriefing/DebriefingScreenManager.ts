import { CanvasManager } from '@/core/CanvasManager';
import { GameLoop } from '@/core/GameLoop';
import { sceneManager } from '@/core/SceneManager';
import { missionResultStore } from '@/game/missions/MissionResultStore';
import { drawLabel } from '@/ui/primitives/UILabel';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';
import { getCursorSprite } from '@/rendering/cache/CursorSpriteCache';
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
        sceneManager.setScene('hub');
      },
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
        font: '20px sans-serif',
        align: 'center',
      });
      return;
    }

    const result = missionResultStore.get();
    let y = 60;
    const line = (text: string) => {
      drawLabel(ctx, 80, y, text, { font: '16px sans-serif' });
      y += 24;
    };

    drawLabel(ctx, 240, y, 'Mission Debriefing', { font: '24px sans-serif', align: 'center' });
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

    // if (result.bonusObjectives?.length > 0) {
    //   line('');
    //   line('Bonus Objectives:');
    //   for (const obj of result.bonusObjectives) {
    //     line(`• ${obj}`);
    //   }
    // }

    drawButton(ctx, this.returnButton);

    // Draw cursor
    const cursor = getCursorSprite();
    const mouse = this.inputManager.getMousePosition();
    ctx.drawImage(cursor, mouse.x - cursor.width / 2, mouse.y - cursor.height / 2);
  };
}
