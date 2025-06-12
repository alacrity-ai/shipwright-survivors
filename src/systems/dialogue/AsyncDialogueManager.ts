// src/systems/dialogue/AsyncDialogueManager.ts

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

      // Runner enters renderQueue when it wants to be visual
      if (runner.wantsVisualFocus() && !this.renderQueue.includes(runner)) {
        this.renderQueue.push(runner);
      }

      // Cleanup finished runners
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

        // Explicit teardown of completed runner
        runner.destroy();
      }
    }

    // Promote next renderer
    if (!this.currentRenderer && this.renderQueue.length > 0) {
      this.currentRenderer = this.renderQueue.shift()!;
      this.currentRenderer.grantVisualFocus();
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.currentRenderer?.render(ctx);
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

  destroy(): void {
    for (const runner of this.allRunners) {
      runner.destroy();
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
