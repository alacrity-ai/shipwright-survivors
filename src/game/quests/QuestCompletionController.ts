// src/game/quests/QuestCompletionController.ts
// ────────────────────────────────────────────────────────────────────────────
//  QuestCompletionController
//  • Runtime-scoped orchestrator that surfaces quest and reward popups
//    after PlayerQuestManager applies all business logic.
//  • `update(dt)` expects dt in **seconds**.
// ────────────────────────────────────────────────────────────────────────────

import { quests }                    from '@/game/player/PlayerQuestManager';
import { QuestRegistry }             from '@/game/quests/registry/QuestRegistry';

import { 
  openQuestAnnouncement,
  openAbilityAnnouncement,
  openShipAnnouncement,
  openCoreRewardAnnouncement,
  openArtifactAnnouncement,
} from '@/core/interfaces/events/QuestReporter';

import { QuestCompletionAnnouncementPopup } from '@/game/quests/ui/QuestCompleteAnnouncementPopup';
import { ShipUnlockAnnouncementPopupMenu } from '@/game/quests/ui/ShipUnlockAnnouncementPopupMenu';
import { AbilityUnlockAnnouncementPopupMenu } from '@/game/quests/ui/AbilityUnlockAnnouncementPopupMenu';
import { CoreRewardAnnouncementPopupMenu } from '@/game/quests/ui/CoreRewardAnnouncementPopupMenu';
import { ArtifactRewardAnnouncementPopupMenu } from '@/game/quests/ui/ArtifactRewardAnnouncementPopupMenu';

import { audioManager } from '@/audio/Audio';
import { createLightFlash } from '@/lighting/helpers/createLightFlash';
import { ShipRegistry } from '@/game/ship/ShipRegistry';

import { ShipBlueprintRegistry } from '../ship/ShipBlueprintRegistry';
import { missionResultStore } from '@/game/missions/MissionResultStore';

import { GlobalEventBus }            from '@/core/EventBus';

import type { Quest }                from '@/game/quests/interfaces/Quest';
import type { QuestStepId }          from '@/game/quests/interfaces/QuestStep';
import type { QuestReward }          from '@/game/quests/interfaces/QuestReward';

// ──────────────────────────────────────────────────────────────
//  Timing constants (in seconds)
// ──────────────────────────────────────────────────────────────
const QUEST_POPUP_S   = 3.0;
const REWARD_POPUP_S  = 3.0;

// ──────────────────────────────────────────────────────────────
//  FSM state contracts
// ──────────────────────────────────────────────────────────────
type Phase = 'idle' | 'questDisplay' | 'rewardDisplay';

interface ActiveQuestCtx {
  quest: Quest;
  rewardIdx: number;
  timer: number; // seconds
}

export class QuestCompletionController {
  // ──────────────────────────── Constructor / Disposal ───────────────────────────────
  public constructor() {
    this.questPopup = new QuestCompletionAnnouncementPopup();
    this.abilityPopup = new AbilityUnlockAnnouncementPopupMenu();
    this.shipPopup = new ShipUnlockAnnouncementPopupMenu();
    this.corePopup = new CoreRewardAnnouncementPopupMenu();
    this.artifactPopup = new ArtifactRewardAnnouncementPopupMenu();

    GlobalEventBus.on('quests:complete', this.handleQuestComplete);
    GlobalEventBus.on('quests:step:update', this.handleQuestStepUpdate);
  }

  public destroy(): void {
    this.questPopup.destroy();
    this.abilityPopup.destroy();
    this.shipPopup.destroy();
    this.corePopup.destroy();
    this.artifactPopup.destroy();

    GlobalEventBus.off('quests:complete', this.handleQuestComplete);
    GlobalEventBus.off('quests:step:update', this.handleQuestStepUpdate);
  }

  // ───────────────────────────── API: Lifecycle ──────────────────────────────────────
  /**
   * Main update loop. Accepts **delta time in seconds**.
   * @param dt delta time (in seconds)
   */
  public update(dt: number): void {
    if (this.phase === 'idle' || !this.ctx) return;

    this.abilityPopup.update(dt);
    this.shipPopup.update(dt);
    this.questPopup.update(dt);
    this.corePopup.update(dt);
    this.artifactPopup.update(dt);

    this.ctx.timer -= dt;
    if (this.ctx.timer > 0) return;

    switch (this.phase) {
      case 'questDisplay':
        this.processNextReward();
        break;

      case 'rewardDisplay': {
        const more = this.processNextReward();
        if (!more) this.beginNextQuest();
        break;
      }
    }
  }

  public render(): void {
    this.abilityPopup.render();
    this.shipPopup.render();
    this.questPopup.render();
    this.corePopup.render();
    this.artifactPopup.render();
  }

  // ───────────────────────────── Internal Data ───────────────────────────────────────
  private readonly backlog: Quest[] = [];
  private phase: Phase = 'idle';
  private ctx: ActiveQuestCtx | null = null;

  private questPopup: QuestCompletionAnnouncementPopup;
  private abilityPopup: AbilityUnlockAnnouncementPopupMenu;
  private shipPopup: ShipUnlockAnnouncementPopupMenu;
  private corePopup: CoreRewardAnnouncementPopupMenu;
  private artifactPopup: ArtifactRewardAnnouncementPopupMenu;

  // ───────────────────────────── Event Binding ───────────────────────────────────────
  private readonly handleQuestComplete = ({ questId }: { questId: string }) => {
    this.completeQuest(questId);
  };

  private readonly handleQuestStepUpdate = (
    { stepId, value }: { stepId: QuestStepId; value: number | boolean | string }
  ) => {
    const didUpdate = quests.updateStep(stepId, value);
    if (didUpdate) {
      audioManager.play('assets/sounds/sfx/debriefing/progressbar_wave.wav', 'sfx', { volume: 1.2, maxSimultaneous: 8 });
      const playerShip = ShipRegistry.getInstance().getPlayerShip();
      if (playerShip) {
        const { x, y } = playerShip.getTransform().position;
        createLightFlash(x, y, 800, 1.4, 0.4, '#ff45b2ff');
      }
    }

    // Harvest newly eligible quests (active only),
    // then pipe them through existing completion path.
    for (const q of quests.getQuestsReadyForCompletion()) {
      this.completeQuest(q.id);
    }
  };

  // ───────────────────────────── Core Orchestration ──────────────────────────────────
  private completeQuest(id: string): void {
    if (quests.hasCompleted(id)) return;

    quests.complete(id);  // Grants rewards immediately

    const quest = QuestRegistry[id];
    if (!quest) {
      console.warn(`[QuestCompletionController] Unknown quest id: ${id}`);
      return;
    }

    this.backlog.push(quest);
    if (this.phase === 'idle') this.beginNextQuest();
  }

  private beginNextQuest(): void {
    const next = this.backlog.shift();
    if (!next) {
      this.phase = 'idle';
      this.ctx   = null;
      return;
    }

    openQuestAnnouncement(next.id);

    this.phase = 'questDisplay';
    this.ctx = {
      quest: next,
      rewardIdx: 0,
      timer: QUEST_POPUP_S,
    };
  }

  private processNextReward(): boolean {
    if (!this.ctx) return false;

    const { quest, rewardIdx } = this.ctx;
    if (rewardIdx >= quest.rewards.length) return false;

    const reward = quest.rewards[rewardIdx];
    this.announceReward(reward);

    this.ctx.rewardIdx++;
    this.ctx.timer = REWARD_POPUP_S;
    this.phase = 'rewardDisplay';

    return this.ctx.rewardIdx < quest.rewards.length;
  }

  private announceReward(r: QuestReward): void {
    switch (r.kind) {
      case 'abilityUnlock':
        openAbilityAnnouncement(r.abilityId);
        missionResultStore.addBonusObjective(r.blurb);
        break;

      case 'shipUnlock':
        openShipAnnouncement?.(r.shipId);
        const shipName = ShipBlueprintRegistry.getByKey(r.shipId)?.name ?? r.shipId;
        missionResultStore.addShipDiscovery(shipName);
        break;

      case 'core':
        openCoreRewardAnnouncement?.(r.amount);
        missionResultStore.addBonusObjective(r.blurb);
        break;
      
      case 'artifactUnlock':
        openArtifactAnnouncement?.(r.artifactId);
        missionResultStore.addBonusObjective(r.blurb);
        break;

      /* istanbul ignore next */
      default:
        ((x: never) => {
          console.warn('[QuestCompletionController] Unhandled reward kind:', x);
        })(r);
    }
  }
}
