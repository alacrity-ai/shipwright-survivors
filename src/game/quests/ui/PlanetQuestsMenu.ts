// src/game/quests/ui/PlanetQuestsMenu.ts
// ─────────────────────────────────────────────────────────────────────────────
//  PlanetQuestsMenu                                                         o3
//  • Contract-style quest list with mouse + game-pad support.                •
//  • Robust nav-map: dynamic row height, any row count (≤ ROW_CAP).          •
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_CONFIG }                      from '@/config/ui';
import { CanvasManager }                       from '@/core/CanvasManager';
import { drawMinimalistWindow }                from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel }                           from '@/ui/primitives/UILabel';
import { drawButton, UIButton }                from '@/ui/primitives/UIButton';
import { isMouseOverRect }                     from '@/ui/menus/helpers/isMouseOverRect';
import { getUniformScaleFactor }               from '@/config/view';
import { GamepadMenuInteractionManager }       from '@/core/input/GamepadMenuInteractionManager';
import { audioManager }                        from '@/audio/Audio';

import { PlayerQuestManager }                  from '@/game/player/PlayerQuestManager';
import { resolveQuestIconSprite }              from '@/game/quests/cache/QuestIconCache';
import { drawQuestRow, QUEST_ROW_BASE_HEIGHT } from '@/game/quests/ui/helpers/drawQuestRow';

import { pauseRuntime, resumeRuntime }         from '@/core/interfaces/events/RuntimeReporter';
import { GlobalMenuReporter }                  from '@/core/GlobalMenuReporter';
import { GlobalEventBus }                      from '@/core/EventBus';

import type { InputManager }                   from '@/core/InputManager';
import type { Quest }                          from '@/game/quests/interfaces/Quest';
import type { QuestIconKey }                   from '@/game/quests/cache/QuestIconCache';

/* ───────────────────────────────────────────────
 *  Internal structures
 * ───────────────────────────────────────────── */
interface QuestRowRenderCache {
  quest   : Quest;
  icon    : HTMLImageElement | HTMLCanvasElement;
  hovered : boolean;
}

/* ═══════════════════════════════════════════════
 *  PlanetQuestsMenu
 * ═════════════════════════════════════════════ */
export class PlanetQuestsMenu {
  /* ---------- Dependencies ---------- */
  private readonly input      : InputManager;
  private readonly nav        : GamepadMenuInteractionManager;
  private readonly cm         = CanvasManager.getInstance();
  private readonly ctx        = this.cm.getContext('ui');

  /* ---------- Window geometry ---------- */
  private winX = 0; private winY = 0;
  private winW = 0; private winH = 0;

  /* ---------- Quest-row layout ---------- */
  private static readonly ROW_CAP = 4;
  private rowHeight = 0;

  /* ---------- State ---------- */
  private planetName: string | null = null;
  private rows      : QuestRowRenderCache[] = [];
  private open      = false;

  /* ---------- Cancel button ---------- */
  private readonly cancelBtn: UIButton = {
    x: 0, y: 0, width: 180, height: 42,
    label: 'Confirm',
    isHovered: false, wasHovered: false,
    onClick: () => this.closeMenu(),
    style: { textFont: `${13 * getUniformScaleFactor()}px monospace` },
    ...DEFAULT_CONFIG.button.style,
  };

  /* ─────────────────────────────────────────────
   *  Construction
   * ──────────────────────────────────────────── */
  constructor(input: InputManager) {
    this.input = input;
    this.nav   = new GamepadMenuInteractionManager(this.input);

    GlobalEventBus.on('quests:menu:open', this.handleOpenMenu);
  }

  /* ─────────────────────────────────────────────
   *  Event → open
   * ──────────────────────────────────────────── */
  private readonly handleOpenMenu = (p: { planetName: string }) =>
    this.openMenu(p.planetName);

  /* ═════════════════════════════════════════════
   *  Public API
   * ════════════════════════════════════════════ */
  isOpen(): boolean { return this.open; }

  async openMenu(planetName: string): Promise<void> {
    pauseRuntime();
    this.open       = false;        // guard against mid-render mutation
    this.planetName = planetName;

    /* — Assemble quest-row cache — */
    const quests = PlayerQuestManager.getInstance()
                     .getVisibleQuests(planetName)
                     .slice(0, PlanetQuestsMenu.ROW_CAP);

    const cache: QuestRowRenderCache[] = [];
    for (const q of quests) {
      try {
        const icon = await resolveQuestIconSprite(q.icon as QuestIconKey);
        cache.push({ quest: q, icon, hovered: false });
      } catch (e) {
        console.warn(`[PlanetQuestsMenu] failed to load icon for ${q.id}:`, e);
      }
    }
    this.rows = cache;

    /* — Geometry & nav-map — */
    this.rowHeight = QUEST_ROW_BASE_HEIGHT * getUniformScaleFactor();
    this.open      = true;

    this.resize();
    this.recomputeNavMap();
    GlobalMenuReporter.getInstance().setMenuOpen('planetQuestsMenu');
  }

  closeMenu(): void {
    audioManager.play('assets/sounds/sfx/ui/activate_00.wav', 'sfx');
    resumeRuntime();
    this.open = false;
    this.nav.clearNavMap();
    GlobalMenuReporter.getInstance().setMenuClosed('planetQuestsMenu');
  }

  destroy(): void {
    GlobalEventBus.off('quests:menu:open', this.handleOpenMenu);
  }

  /* ─────────────────────────────────────────────
   *  Layout
   * ──────────────────────────────────────────── */
  private resize(): void {
    const scale = getUniformScaleFactor();
    const vpW   = this.cm.getCanvas('ui').width;
    const vpH   = this.cm.getCanvas('ui').height;

    this.winW = 680 * scale;
    this.winH = 420 * scale;
    this.winX = (vpW - this.winW) / 2;
    this.winY = (vpH - this.winH) / 2 + 46 * scale;

    this.cancelBtn.width  = 180 * scale;
    this.cancelBtn.height = 42  * scale;
    this.cancelBtn.style!.textFont = `${13 * scale}px monospace`;
  }

  /** Build / rebuild the directional graph for GamepadMenuInteractionManager */
  private recomputeNavMap(): void {
    this.nav.clearNavMap();
    const nodes: any[] = [];

    const scale = getUniformScaleFactor();

    /* Quest rows */
    for (let i = 0; i < this.rows.length; i++) {
      nodes.push({
        gridX   : 0,
        gridY   : i,
        screenX : this.winX + (40 * scale),
        screenY : this.winY + (60 * scale) + (i * this.rowHeight) + (20 * scale),
        isEnabled: true,
      });
    }

    /* Cancel button sits one row below the last quest row */
    nodes.push({
      gridX   : 0,
      gridY   : this.rows.length,
      screenX : this.winX + this.winW / 2,
      screenY : this.winY + this.winH - (30 * scale),
      isEnabled: true,
    });

    this.nav.setNavMap(nodes);
  }

  /* ─────────────────────────────────────────────
   *  Frame lifecycle
   * ──────────────────────────────────────────── */
  update(_: number): void {
    if (!this.open) return;

    /* Game-pad focus */
    this.nav.update();

    const mouse   = this.input.getMousePosition();
    const clicked = this.input.wasMouseClicked();
    const { x: mx, y: my } = mouse ?? { x: -1, y: -1 };

    /* Hover / click detection on quest rows */
    const scale    = getUniformScaleFactor();
    const startY   = this.winY + 32 * scale + 20 * scale;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const rowY = startY + i * this.rowHeight;
      const rect = {
        x: this.winX + 16 * scale,
        y: rowY,
        width : this.winW - 32 * scale,
        height: this.rowHeight,
      };

      const isHover = isMouseOverRect(mx, my, rect, 1);
      row.hovered = isHover;

      if (isHover && clicked) {
        const questMgr = PlayerQuestManager.getInstance();
        const questId  = row.quest.id;

        // Toggle tracking status
        if (questMgr.getActiveQuests().includes(questId)) {
          questMgr.removeActiveQuest(questId);
          audioManager.play('assets/sounds/sfx/ui/planetselect_00.wav', 'sfx', { maxSimultaneous: 4 });
        } else {
          if (questMgr.addActiveQuest(questId)) {
            audioManager.play('assets/sounds/sfx/ui/start_00.wav', 'sfx', { maxSimultaneous: 4 });
          } else {
            audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx', { maxSimultaneous: 4 });
          }
        }
      }
    }

    /* Cancel button */
    this.cancelBtn.x = this.winX + (this.winW - this.cancelBtn.width) / 2;
    this.cancelBtn.y = this.winY + this.winH - this.cancelBtn.height - 16 * scale;

    this.cancelBtn.isHovered = isMouseOverRect(
      mx, my,
      { x: this.cancelBtn.x, y: this.cancelBtn.y, width: this.cancelBtn.width, height: this.cancelBtn.height },
      1,
    );

    if (clicked && this.cancelBtn.isHovered) this.cancelBtn.onClick();

    /* Global cancel */
    if (this.input.wasActionJustPressed('cancel')) this.closeMenu();
  }

  render(): void {
    if (!this.open) return;

    const scale = getUniformScaleFactor();
    const ctx   = this.ctx;

    /* Window + title */
    drawMinimalistWindow(ctx, this.winX, this.winY, this.winW, this.winH,
                         { ...DEFAULT_CONFIG.window.options, alpha: 0.9 });
    drawLabel(ctx,
      this.winX + this.winW / 2,
      this.winY - 24 * scale,
      'Planetary Contracts',
      { font: `${14 * scale}px monospace`, align: 'center', glow: true },
    );

    /* Quest rows */
    const rowsStartY = this.winY + 32 * scale + 20 * scale;
    let   yCursor    = rowsStartY;
    let   recompute  = false;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const h   = drawQuestRow({
        ctx,
        x      : this.winX + 16 * scale,
        y      : yCursor,
        width  : this.winW - 32 * scale,
        quest  : row.quest,
        icon   : row.icon,
        tracked: PlayerQuestManager.getInstance().getActiveQuests().includes(row.quest.id),
        hovered: row.hovered,
        scale,
      });

      if (i === 0 && h !== this.rowHeight) {
        this.rowHeight = h;
        recompute     = true;          // row-height became known / changed
      }
      yCursor += h + 6 * scale;
    }

    /* Cancel button */
    drawButton(ctx, this.cancelBtn, 1, 13 * scale);

    /* Late nav-map rebuild if first row-height was just measured */
    if (recompute) this.recomputeNavMap();
  }
}
