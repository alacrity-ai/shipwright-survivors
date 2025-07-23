// src/game/quests/ui/QuestTrackerMenu.ts

import { CanvasManager }                       from '@/core/CanvasManager';
import { drawMinimalistWindow }                from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }                           from '@/ui/primitives/UILabel';
import { getUniformScaleFactor }               from '@/config/view';
import { PlayerQuestManager }                  from '@/game/player/PlayerQuestManager';
import { resolveQuestIconSprite }              from '@/game/quests/cache/QuestIconCache';
import { QUEST_ROW_BASE_HEIGHT }               from '@/game/quests/ui/helpers/drawQuestRow';
import { pauseRuntime, resumeRuntime }         from '@/core/interfaces/events/RuntimeReporter';
import { GlobalMenuReporter }                  from '@/core/GlobalMenuReporter';
import { GlobalEventBus }                      from '@/core/EventBus';

import type { InputManager }                   from '@/core/InputManager';
import type { QuestIconKey }                   from '@/game/quests/cache/QuestIconCache';
import type { Quest }                          from '@/game/quests/interfaces/Quest';


interface TrackerRow {
  quest: Quest;
  icon: HTMLImageElement | HTMLCanvasElement;
  progressText: string;
}

export class QuestTrackerMenu {
  private readonly input: InputManager;
  private readonly cm    = CanvasManager.getInstance();
  private readonly ctx   = this.cm.getContext('overlay');

  private rows: TrackerRow[] = [];
  private open = false;

  private static readonly ROW_CAP = 5;
  private rowHeight = 0;

  private winX = 0; private winY = 0;
  private winW = 0; private winH = 0;

  constructor(input: InputManager) {
    this.input = input;
    GlobalEventBus.on('quests:tracker:open', this.handleOpen);
    GlobalEventBus.on('quests:tracker:close', this.handleClose);
  }

  private readonly handleOpen = () => this.openMenu();
  private readonly handleClose = () => this.closeMenu();

  isOpen(): boolean { return this.open; }

  async openMenu(): Promise<void> {
    pauseRuntime();
    this.open = false; // prevent mid-frame render

    const questMgr = PlayerQuestManager.getInstance();
    const activeIds = questMgr.getActiveQuests();

    const cache: TrackerRow[] = [];
    for (const qid of activeIds.slice(0, QuestTrackerMenu.ROW_CAP)) {
      const quest = questMgr.getQuest(qid);
      try {
        const icon = await resolveQuestIconSprite(quest.icon as QuestIconKey);
        const progressText = this.buildProgressText(questMgr, quest);
        cache.push({ quest, icon, progressText });
      } catch (e) {
        console.warn(`[QuestTrackerMenu] Failed to load icon for ${quest.id}:`, e);
      }
    }

    this.rows = cache;
    this.rowHeight = QUEST_ROW_BASE_HEIGHT * getUniformScaleFactor();
    this.open = true;

    this.resize();
    GlobalMenuReporter.getInstance().setMenuOpen('questTrackerMenu');
  }

  closeMenu(): void {
    resumeRuntime();
    this.open = false;
    GlobalMenuReporter.getInstance().setMenuClosed('questTrackerMenu');
  }

  destroy(): void {
    GlobalEventBus.off('quests:tracker:open', this.handleOpen);
    GlobalEventBus.off('quests:tracker:close', this.handleClose);
  }

  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW = this.cm.getCanvas('overlay').width;
    const vpH = this.cm.getCanvas('overlay').height;

    this.winW = 600 * scale;
    this.winH = 360 * scale;
    this.winX = (vpW - this.winW) / 2;
    this.winY = (vpH - this.winH) / 2 + 40 * scale;
  }

  update(): void {
    if (!this.open) return;
    if (this.input.wasActionJustPressed('cancel')) {
      this.closeMenu();
    }
  }

  render(): void {
    if (!this.open) return;

    const ctx = this.ctx;
    const scale = getUniformScaleFactor();

    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH,
      { alpha: 0.9 });

    drawLabel(ctx,
      this.winX + this.winW / 2,
      this.winY - 24 * scale,
      'Active Contracts',
      { font: `${14 * scale}px monospace`, align: 'center', glow: true });

    const startY = this.winY + 32 * scale + 16 * scale;
    let yCursor = startY;

    for (const row of this.rows) {
      // Icon
      const iconSize = 48 * scale;
      ctx.drawImage(row.icon, this.winX + 20 * scale, yCursor, iconSize, iconSize);

      // Title + subtitle
      drawLabel(ctx,
        this.winX + 80 * scale,
        yCursor + 16 * scale,
        row.quest.name,
        { font: `${14 * scale}px monospace`, align: 'left', glow: false });
      drawLabel(ctx,
        this.winX + 80 * scale,
        yCursor + 34 * scale,
        row.quest.description,
        { font: `${12 * scale}px monospace`, align: 'left', glow: false });

      // Progress
      drawLabel(ctx,
        this.winX + this.winW - 20 * scale,
        yCursor + 24 * scale,
        row.progressText,
        { font: `${12 * scale}px monospace`, align: 'right', glow: false });

      yCursor += this.rowHeight + 6 * scale;
    }
  }

  private buildProgressText(questMgr: PlayerQuestManager, quest: Quest): string {
    // Only handle first step (single-step quests) for now.
    const step = quest.steps[0];
    const current = questMgr['stepProgress'][step.kind] ?? 0;
    const goal = step.goal;

    if (typeof goal === 'number' && typeof current === 'number') {
      return `Progress: ${Math.min(current, goal)}/${goal}`;
    }
    if (typeof goal === 'boolean') {
      return current ? 'Completed' : 'In Progress';
    }
    if (typeof goal === 'string') {
      return current === goal ? 'Completed' : 'Pending';
    }
    return '';
  }
}
