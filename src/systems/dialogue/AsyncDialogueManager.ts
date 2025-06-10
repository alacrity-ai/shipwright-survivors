import { AsyncDialogueRunner } from './AsyncDialogueRunner';
import { DialogueOrchestrator } from './DialogueOrchestrator';
import type { DialogueEvent } from './interfaces/DialogueEvent';

export class AsyncDialogueManager {
  private readonly allRunners: Set<AsyncDialogueRunner> = new Set();
  private readonly renderQueue: AsyncDialogueRunner[] = [];
  private currentRenderer: AsyncDialogueRunner | null = null;
  private runnerMap: Map<string, AsyncDialogueRunner> = new Map();

  constructor(private readonly orchestratorFactory: () => DialogueOrchestrator) {}

  startAsync(dialogue: DialogueEvent[], shouldInterrupt?: () => boolean, id?: string): void {
    if (id && this.runnerMap.has(id)) return;

    const runner = new AsyncDialogueRunner(dialogue, this.orchestratorFactory(), shouldInterrupt);

    this.allRunners.add(runner);
    if (id) {
      this.runnerMap.set(id, runner);
    }
  }

  update(dt: number): void {
    for (const runner of this.allRunners) {
      runner.update(dt);

      // A runner that reaches a line and wants to be visible enters the renderQueue
      if (runner.wantsVisualFocus() && !this.renderQueue.includes(runner)) {
        this.renderQueue.push(runner);
      }

      // Clean up finished
      if (runner.isFinished()) {
        this.allRunners.delete(runner);
        if (runner === this.currentRenderer) {
          this.currentRenderer = null;
        }

        for (const [id, ref] of this.runnerMap.entries()) {
          if (ref === runner) {
            this.runnerMap.delete(id);
            break;
          }
        }
      }
    }

    // Promote next renderer if current is done
    if (!this.currentRenderer && this.renderQueue.length > 0) {
      this.currentRenderer = this.renderQueue.shift()!;
      this.currentRenderer.grantVisualFocus();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.currentRenderer) {
      this.currentRenderer.render(ctx);
    }
  }

  clearAll(): void {
    for (const runner of this.allRunners) {
      runner.clear();
    }
    this.allRunners.clear();
    this.runnerMap.clear();
    this.renderQueue.length = 0;
    this.currentRenderer = null;
  }

  hasActiveRunners(): boolean {
    return this.allRunners.size > 0;
  }

  getActiveRunnerCount(): number {
    return this.allRunners.size;
  }
}
