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
} from '@/core/interfaces/events/QuestReporter';

import { QuestCompletionAnnouncementPopup } from '@/game/quests/ui/QuestCompleteAnnouncementPopup';
import { ShipUnlockAnnouncementPopupMenu } from '@/game/quests/ui/ShipUnlockAnnouncementPopupMenu';
import { AbilityUnlockAnnouncementPopupMenu } from '@/game/quests/ui/AbilityUnlockAnnouncementPopupMenu';
import { CoreRewardAnnouncementPopupMenu } from '@/game/quests/ui/CoreRewardAnnouncementPopupMenu';

import { ShipBlueprintRegistry } from '../ship/ShipBlueprintRegistry';
import { missionResultStore } from '@/game/missions/MissionResultStore';

import { GlobalEventBus }            from '@/core/EventBus';

import type { Quest }                from '@/game/quests/interfaces/Quest';
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

    GlobalEventBus.on('quests:complete', this.handleQuestComplete);
  }

  public destroy(): void {
    this.questPopup.destroy();
    this.abilityPopup.destroy();
    this.shipPopup.destroy();
    this.corePopup.destroy();

    GlobalEventBus.off('quests:complete', this.handleQuestComplete);
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
  }

  // ───────────────────────────── Internal Data ───────────────────────────────────────
  private readonly backlog: Quest[] = [];
  private phase: Phase = 'idle';
  private ctx: ActiveQuestCtx | null = null;

  private questPopup: QuestCompletionAnnouncementPopup;
  private abilityPopup: AbilityUnlockAnnouncementPopupMenu;
  private shipPopup: ShipUnlockAnnouncementPopupMenu;
  private corePopup: CoreRewardAnnouncementPopupMenu;

  // ───────────────────────────── Event Binding ───────────────────────────────────────
  private readonly handleQuestComplete = ({ questId }: { questId: string }) => {
    this.completeQuest(questId);
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

      /* istanbul ignore next */
      default:
        ((x: never) => {
          console.warn('[QuestCompletionController] Unhandled reward kind:', x);
        })(r);
    }
  }
}
