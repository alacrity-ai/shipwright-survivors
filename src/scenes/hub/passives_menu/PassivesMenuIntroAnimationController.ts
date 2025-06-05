// src/scenes/hub/passives_menu/PassivesMenuAnimationController.ts

import { drawCRTText } from '@/ui/primitives/CRTText';
import { RollingText } from './RollingText';

type AnimationPhase =
  | 'loginPrompt'
  | 'usernameInput'
  | 'passwordPrompt'
  | 'passwordInput'
  | 'clear1'
  | 'bootMessage'
  | 'clear2'
  | 'done';

export class PassivesMenuIntroAnimationController {
  private phase: AnimationPhase = 'loginPrompt';
  private timer = 0;
  private lastTime = 0;
  private username = new RollingText('Shipwright SecondClass', 30, 40);
  private password = new RollingText('************', 60, 20);
  private bootText = new RollingText('VIEW_PASSIVES()    ', 50, 1);

  private delayAfterPhaseComplete = 600; // ms

  update(now: number): void {
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.timer += dt;

    switch (this.phase) {
      case 'usernameInput':
        this.username.update(now);
        if (this.username.done() && this.timer > this.delayAfterPhaseComplete) {
          this.advance('passwordPrompt');
        }
        break;
      case 'passwordInput':
        this.password.update(now);
        if (this.password.done() && this.timer > this.delayAfterPhaseComplete) {
          this.advance('clear1');
        }
        break;
      case 'bootMessage':
        this.bootText.update(now);
        if (this.bootText.done() && this.timer > this.delayAfterPhaseComplete) {
          this.advance('clear2');
        }
        break;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = 300;
    let y = 160;

    const style = {
      font: '18px monospace',
      color: '#00ff41',
      glow: true,
      chromaticAberration: true as const
    };

    ctx.save();
    ctx.fillStyle = '#000';
    // ctx.fillRect(275, 98, 885, 542); // Commented out
    ctx.restore();

    switch (this.phase) {
      case 'loginPrompt':
        drawCRTText(ctx, x, y, 'login:', style);
        this.advance('usernameInput');
        break;
      case 'usernameInput':
        drawCRTText(ctx, x, y, 'login: ' + this.username.getText(), style);
        break;
      case 'passwordPrompt':
        drawCRTText(ctx, x, y, 'login: Shipwright SecondClass', style);
        y += 32;
        drawCRTText(ctx, x, y, 'password:', style);
        this.advance('passwordInput');
        break;
      case 'passwordInput':
        drawCRTText(ctx, x, y - 32, 'login: Shipwright SecondClass', style);
        drawCRTText(ctx, x, y, 'password: ' + this.password.getText(), style);
        break;
      case 'clear1':
        this.advance('bootMessage');
        break;
      case 'bootMessage':
        drawCRTText(ctx, x, y, this.bootText.getText(), style);
        break;
      case 'clear2':
        this.advance('done');
        break;
      case 'done':
        break;
    }
  }

  private advance(next: AnimationPhase): void {
    this.phase = next;
    this.timer = 0;
    const now = performance.now();
    if (next === 'usernameInput') this.username.start(now);
    if (next === 'passwordInput') this.password.start(now);
    if (next === 'bootMessage') this.bootText.start(now);
  }

  isComplete(): boolean {
    return this.phase === 'done';
  }
}
