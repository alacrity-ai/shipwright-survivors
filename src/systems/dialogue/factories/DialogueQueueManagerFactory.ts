// src/systems/dialogue/factories/DialogueQueueManagerFactory.ts

import { DialogueQueueManager } from '@/systems/dialogue/DialogueQueueManager';
import { DialogueOrchestratorFactory } from './DialogueOrchestratorFactory';

export class DialogueQueueManagerFactory {
  static create(): DialogueQueueManager {
    const orchestrator = DialogueOrchestratorFactory.create();
    return new DialogueQueueManager(orchestrator);
  }
}
