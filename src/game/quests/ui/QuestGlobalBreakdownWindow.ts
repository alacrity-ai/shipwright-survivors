// src/game/quests/ui/QuestBreakdownWindow.ts
// ────────────────────────────────────────────────────────────────────────────
//  QuestBreakdownWindow
//  • Read-only breakdown of quests, mirrored after the passive breakdown idiom.
//  • No per-frame churn: immutable quest list + precomputed filtered indices.
//  • Top-right anchoring; supports vertical offset to avoid overlapping UI.
//  • Enhancements:
//      (1) Completed quests do NOT show step progress (temporal steps).
//      (2) filterByMission(missionKey) to restrict to a mission module.
//      (3) Boss-tagged quests are sorted to the top and painted violet.
// ────────────────────────────────────────────────────────────────────────────

import { DEFAULT_CONFIG } from '@/config/ui';
import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';

import { QuestRegistry } from '@/game/quests/registry/QuestRegistry';
import type { Quest } from '@/game/quests/interfaces/Quest';
import type { QuestStep } from '@/game/quests/interfaces/QuestStep';

import { PlayerQuestManager } from '@/game/player/PlayerQuestManager';

// For mission mapping (so we can filter by module without changing registry):
import { mission1Quests } from '@/game/quests/registry/definitions/mission1Quests';
import { mission2Quests } from '@/game/quests/registry/definitions/mission2Quests';
import { mission3Quests } from '@/game/quests/registry/definitions/mission3Quests';
import { mission4Quests } from '@/game/quests/registry/definitions/mission4Quests';
import { mission5Quests } from '@/game/quests/registry/definitions/mission5Quests';

type MaybeProgress = number | boolean | string | undefined;

export class QuestBreakdownWindow {
  private _visible = true;

  // Geometry (logical px pre-scale)
  private readonly MARGIN = 16;
  private readonly WINDOW_WIDTH = 420;
  private readonly PADDING_X = 16;
  private readonly PADDING_Y = 14;
  private readonly TITLE_GAP = 6;
  private readonly TITLE_HEIGHT = 22;

  // Row (two-line entry)
  private readonly ROW_NAME_H = 18;
  private readonly ROW_DESC_H = 16;
  private readonly ROW_GAP = 8;

  // UX / symbols
  private readonly CHECK = '✓';
  private readonly DASH = '—';

  // Policy: show a compact description for completed quests (no step progress)
  private readonly SHOW_DESC_WHEN_COMPLETED = true;

  // Visual accent for boss quests
  // (Soft violet readable on dark UI; tweak to taste.)
  private readonly BOSS_NAME_COLOR = '#b68cff';

  // Snapshot of registry, sorted by priority then name (stable identity)
  private readonly quests: ReadonlyArray<Quest>;
  // Mission key per quest (aligned to quests[i])
  private readonly questMissionKey: ReadonlyArray<string>;

  // Optional step-progress accessor (if your manager provides it)
  private readonly getStepProgressFn:
    | ((kind: string) => MaybeProgress)
    | null;

  // Mission filter state and precomputed indices to render
  private missionFilter: string | null = null;
  private indices: number[] = [];          // [0..N-1]
  private filteredIndices: number[] = [];  // subset of indices based on filter

  constructor() {
    // Build mission map (id -> missionKey) once.
    const missionOfId: Record<string, string> = {};
    this.indexMission('mission1', mission1Quests, missionOfId);
    this.indexMission('mission2', mission2Quests, missionOfId);
    this.indexMission('mission3', mission3Quests, missionOfId);
    this.indexMission('mission4', mission4Quests, missionOfId);
    this.indexMission('mission5', mission5Quests, missionOfId);

    // Snapshot + priority sort once:
    //   1) Boss-tagged quests first
    //   2) Then case-insensitive name
    const isBoss = (q: Quest) => Array.isArray(q.tags) && q.tags.includes('boss') ? 0 : 1;
    const bucket: Quest[] = [];
    for (const id in QuestRegistry) bucket.push(QuestRegistry[id]);
    bucket.sort((a, b) => {
      const pa = isBoss(a);
      const pb = isBoss(b);
      if (pa !== pb) return pa - pb;
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });
    this.quests = bucket;

    // Align mission keys to sorted quests
    const mk: string[] = new Array(bucket.length);
    for (let i = 0; i < bucket.length; i++) {
      const q = bucket[i];
      mk[i] = missionOfId[q.id] || 'unknown';
    }
    this.questMissionKey = mk;

    // Optional getStepProgress hook
    const qm = PlayerQuestManager.getInstance() as unknown as {
      getStepProgress?: (kind: string) => MaybeProgress;
    };
    this.getStepProgressFn =
      typeof qm.getStepProgress === 'function' ? qm.getStepProgress!.bind(qm) : null;

    // Precompute index arrays
    const N = this.quests.length;
    this.indices = new Array(N);
    for (let i = 0; i < N; i++) this.indices[i] = i;

    // Default: no filter
    this.recomputeFiltered();
  }

  /** Internal: record mission membership into a flat map. */
  private indexMission(
    missionKey: string,
    src: Record<string, Quest>,
    out: Record<string, string>
  ): void {
    for (const id in src) out[id] = missionKey;
  }

  /** Public: show only quests from a given mission module (e.g., "mission3"). Pass null to clear. */
  public filterByMission(missionKey: string | null): void {
    this.missionFilter = missionKey ? String(missionKey) : null;
    this.recomputeFiltered();
  }

  private recomputeFiltered(): void {
    if (!this.missionFilter) {
      // No filter: render all (existing global sort preserves boss-first)
      this.filteredIndices = this.indices;
      return;
    }
    const want = this.missionFilter;
    const src = this.indices;
    const mk = this.questMissionKey;
    // Allocate once; size <= src.length
    const out: number[] = [];
    for (let i = 0; i < src.length; i++) {
      const idx = src[i];
      if (mk[idx] === want) out.push(idx);
    }
    // Note: order in `out` is the same as `indices` (i.e., boss-first within the mission)
    this.filteredIndices = out;
  }

  public setVisible(v: boolean): void { this._visible = v; }
  public isVisible(): boolean { return this._visible; }

  /**
   * Render anchored to top-right of overlay canvas.
   * @param ctx          Overlay 2D context
   * @param uiScale      UI scale factor (defaults to uniform)
   * @param topOffsetPx  Logical px offset (pre-scale) to avoid overlapping other windows
   */
  public render(
    ctx: CanvasRenderingContext2D,
    uiScale: number = getUniformScaleFactor(),
    topOffsetPx: number = 0
  ): void {
    if (!this._visible) return;

    const idxs = this.filteredIndices;
    const count = idxs.length;

    // Window height: two-line rows
    const rowH = this.ROW_NAME_H + this.ROW_DESC_H + this.ROW_GAP;
    const logicalH =
      this.PADDING_Y * 2 +
      this.TITLE_GAP + this.TITLE_HEIGHT +
      count * rowH;

    const w = Math.round(this.WINDOW_WIDTH * uiScale);
    const h = Math.round(logicalH * uiScale);
    const x = Math.round(6 * uiScale);
    const y = Math.round((this.MARGIN + topOffsetPx) * uiScale);

    // Chrome
    drawMinimalistWindow(ctx, x, y, w, h, {
      alpha: 0.6,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius * uiScale,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
    });

    // Content origin
    const contentX = x + Math.round(this.PADDING_X * uiScale);
    let cy = y + Math.round(this.PADDING_Y * uiScale);

    // Title
    const title = this.missionFilter ? `Quests Summary` : 'Quests';
    drawLabel(
      ctx, contentX, cy, title,
      { font: '14px monospace', color: DEFAULT_CONFIG.general.textColor, glow: true },
      uiScale
    );
    cy += Math.round((this.TITLE_GAP + this.TITLE_HEIGHT) * uiScale);

    // Precompute right edge + max text width
    const rightPadding = this.PADDING_X + 8;
    const rightX = x + Math.round((this.WINDOW_WIDTH - rightPadding) * uiScale);
    const maxTextWidth = Math.max(0, rightX - contentX);

    const questsMgr = PlayerQuestManager.getInstance();

    for (let k = 0; k < count; k++) {
      const i = idxs[k];
      const q = this.quests[i];

      const bossTagged = Array.isArray(q.tags) && q.tags.includes('boss');

      // Status (right-aligned)
      const completed = questsMgr.hasCompleted(q.id);
      const statusText = completed ? `${this.CHECK} Completed` : this.DASH;
      const statusColor = completed
        ? DEFAULT_CONFIG.general.statColor
        : DEFAULT_CONFIG.general.disabledColor;

      // Name (left) — boss quests receive a distinct violet accent
      const nameColor = bossTagged ? this.BOSS_NAME_COLOR : DEFAULT_CONFIG.general.textColor;
      drawLabel(
        ctx, contentX, cy, q.name,
        { font: '12px monospace', color: nameColor },
        uiScale
      );

      // Status (right)
      drawLabel(
        ctx, rightX, cy, statusText,
        { font: '12px monospace', color: statusColor, align: 'right' },
        uiScale
      );

      cy += Math.round(this.ROW_NAME_H * uiScale);

      // Objective line:
      //  • If completed: DO NOT show step progress (temporal). Show description (compact).
      //  • Else: show compact progress if single-step and readable; otherwise description.
      const objective = completed && this.SHOW_DESC_WHEN_COMPLETED
        ? q.description
        : this.composeObjective(q, completed);

      const descColor = completed
        ? DEFAULT_CONFIG.general.infoTextColor
        : (DEFAULT_CONFIG.general.disabledColor ?? DEFAULT_CONFIG.general.infoTextColor);

      const truncated = this.truncateToWidth(ctx, objective, maxTextWidth, '12px monospace', uiScale);

      drawLabel(
        ctx, contentX, cy, truncated,
        { font: '12px monospace', color: descColor },
        uiScale
      );

      cy += Math.round((this.ROW_DESC_H + this.ROW_GAP) * uiScale);
    }
  }

  // ────────────────────────── Objective composer ──────────────────────────

  /**
   * Produce a compact objective string when NOT completed.
   * Completed quests are handled by caller (description only).
   */
  private composeObjective(q: Quest, completed: boolean): string {
    if (completed) return q.description; // safety (should be handled by caller)

    const steps = q.steps;
    if (!steps || steps.length === 0) return q.description;

    // Prefer a single-step terse progress line if accessible
    if (steps.length === 1) {
      const s = steps[0] as QuestStep;
      const progress = this.readProgress(s);
      const compact = this.formatStepTerse(s, progress);
      if (compact) return compact;
    }

    return q.description;
  }

  /** Read current progress if accessor is present; otherwise undefined. */
  private readProgress(step: QuestStep): MaybeProgress {
    if (!this.getStepProgressFn) return undefined;
    try { return this.getStepProgressFn(step.kind as string); }
    catch { return undefined; }
  }

  /**
   * Compact single-line formatter (only for NOT completed quests):
   *  • number goals:   "progress/goal  (Kind)"
   *  • boolean goals:  "Done" / "Not done"
   *  • string goals:   "Target: <goal>"
   * Returns '' if not succinctly representable.
   */
  private formatStepTerse(step: QuestStep, progress: MaybeProgress): string {
    const kind = String(step.kind);

    if (typeof (step as any).goal === 'number') {
      const goal = (step as any).goal as number;
      const cur = typeof progress === 'number' ? progress : 0;
      return `${cur}/${goal}  (${this.prettyKind(kind)})`;
    }

    if (typeof (step as any).goal === 'boolean') {
      const done = typeof progress === 'boolean' ? progress : false;
      return done ? 'Done' : 'Not done';
    }

    if (typeof (step as any).goal === 'string') {
      return `Target: ${(step as any).goal}`;
    }

    return '';
  }

  /** Camel/snake → Title Case */
  private prettyKind(kind: string): string {
    const spaced = kind
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_:-]+/g, ' ');
    return spaced.trim().replace(/\b\w/g, c => c.toUpperCase());
  }

  // ────────────────────────── Text truncation ──────────────────────────

  private truncateToWidth(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string,
    uiScale: number
  ): string {
    if (maxWidth <= 0) return '';
    const prevFont = ctx.font;
    ctx.font = this.scaleFont(font, uiScale);

    const full = ctx.measureText(text).width;
    if (full <= maxWidth) { ctx.font = prevFont; return text; }

    const ellipsis = '…';
    const ellW = ctx.measureText(ellipsis).width;

    let lo = 0, hi = text.length, mid = 0;
    while (lo < hi) {
      mid = (lo + hi + 1) >>> 1;
      const w = ctx.measureText(text.slice(0, mid)).width + ellW;
      if (w <= maxWidth) lo = mid; else hi = mid - 1;
    }
    let cut = lo;
    while (cut > 0 && ctx.measureText(text.slice(0, cut)).width + ellW > maxWidth) cut--;

    const out = text.slice(0, Math.max(0, cut)) + ellipsis;
    ctx.font = prevFont;
    return out;
  }

  private scaleFont(font: string, uiScale: number): string {
    const m = /(\d+(\.\d+)?)px\s+(.+)/.exec(font);
    if (!m) return font;
    const size = parseFloat(m[1]) * uiScale;
    return `${size.toFixed(3)}px ${m[3]}`;
  }
}
