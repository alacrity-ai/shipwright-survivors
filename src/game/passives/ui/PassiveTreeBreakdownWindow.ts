// // src/game/passives/ui/PassiveTreeBreakdownWindow.ts

// import { DEFAULT_CONFIG } from '@/config/ui';
// import { getUniformScaleFactor } from '@/config/view';
// import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
// import { drawLabel } from '@/ui/primitives/UILabel';
// import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';
// import type { PassiveNodeMetadata } from '@/game/passives/interfaces/PassiveNodeMetadata';
// import { InputManager } from '@/core/InputManager';  // Injecting InputManager
// import { drawButton, UIButton } from '@/ui/primitives/UIButton';

// /**
//  * PassiveTreeBreakdownWindow
//  * - Read-only, GC-neutral readout of aggregated passive bonuses.
//  * - Shows *all* known passives, including zero-valued ones (greyed).
//  * - Owned by PassiveTreeUIController; call render() from the controller’s render().
//  */
// export class PassiveTreeBreakdownWindow {
//   private _visible = true;
//   private collapsed = false;  // Track collapsed state
//   private input: InputManager;  // InputManager injected for mouse handling

//   // Layout (logical px before uiScale)
//   private readonly MARGIN = 6;
//   private readonly WINDOW_WIDTH = 360;
//   private readonly PADDING_X = 16;
//   private readonly PADDING_Y = 14;
//   private readonly TITLE_GAP = 6;       // gap below the window title
//   private readonly TITLE_HEIGHT = 22;   // title row height
//   private readonly SECTION_GAP = 10;    // gap between sections
//   private readonly HEADER_HEIGHT = 20;  // section header row height
//   private readonly ROW_HEIGHT = 18;     // per-stat row height

//   private isHovered = false;

//   // Formatting
//   private readonly EPS = 1e-6;

//   // ---- Section order (stable, no per-frame allocation) ----
//   private static readonly OFFENSE_KEYS = [
//     'damage',
//     'fireRate',
//     'criticalChance',
//     'criticalMultiplier',
//     'stunChance',
//     'bossDamage',
//     'lifeStealChance',
//     'lifeStealAmount',
//   ] as const;

//   private static readonly DEFENSE_KEYS = [
//     'armor',
//     'mitigation',
//     'ignoreDamageChance',
//     'acclimatization',
//     'thermalInsulation',
//   ] as const;

//   private static readonly MOVEMENT_KEYS = [
//     'thrust',
//     'turnPower',
//     'explorer',
//   ] as const;

//   private static readonly UTILITY_KEYS = [
//     'entropiumPickupBonus',
//     'blockDropRate',
//     'harvestRange',
//     'attachTierUpChance',
//     'rareItemTradepostChance',
//     'powerSurge',
//     'epicInfusion',
//     'repairBounty',
//     'repairAmplification',
//   ] as const;

//   private static readonly ABILITY_KEYS = [
//     'abilityCooldown',
//     'abilityPower',
//   ] as const;

//   private static readonly INCIDENTS_KEYS = [
//     'incidentSpawnChance',
//   ] as const;

//   private static readonly VOID_KEYS = [
//     'voidIntensity',
//   ] as const;

//   // Precomputed static totals (no per-frame math)
//   private static readonly TOTAL_ROWS =
//     PassiveTreeBreakdownWindow.OFFENSE_KEYS.length +
//     PassiveTreeBreakdownWindow.DEFENSE_KEYS.length +
//     PassiveTreeBreakdownWindow.MOVEMENT_KEYS.length +
//     PassiveTreeBreakdownWindow.UTILITY_KEYS.length +
//     PassiveTreeBreakdownWindow.ABILITY_KEYS.length +
//     PassiveTreeBreakdownWindow.INCIDENTS_KEYS.length +
//     PassiveTreeBreakdownWindow.VOID_KEYS.length;

//   private static readonly TOTAL_SECTIONS = 7;

//   // ---- Human-readable labels ----
//   private static readonly LABEL: Record<string, string> = {
//     // Offense
//     damage: 'Weapon Damage',
//     fireRate: 'Fire Rate',
//     criticalChance: 'Crit Chance',
//     criticalMultiplier: 'Crit Multiplier',
//     stunChance: 'Stun Chance',
//     bossDamage: 'Boss Damage',
//     lifeStealChance: 'Life Steal Chance',
//     lifeStealAmount: 'Life Steal Amount',

//     // Defense
//     armor: 'Armor',
//     mitigation: 'Damage Mitigation',
//     ignoreDamageChance: 'Ignore Damage Chance',
//     acclimatization: 'Cold Resistance',
//     thermalInsulation: 'Heat Resistance',

//     // Movement
//     thrust: 'Thrust',
//     turnPower: 'Turn Power',
//     explorer: 'Exploration Move Speed',

//     // Utility
//     entropiumPickupBonus: 'Entropium Pickup Bonus',
//     blockDropRate: 'Block Drop Rate',
//     harvestRange: 'Harvest Radius',
//     attachTierUpChance: 'Attach Tier-Up Chance',
//     rareItemTradepostChance: 'Rare Tradepost Item Chance',
//     voidIntensity: 'Void Intensity',
//     powerSurge: 'Rare Powerup Chance',
//     epicInfusion: 'Epic Powerup Chance',
//     repairBounty: 'Repair Orb Drop Chance',
//     repairAmplification: 'Repair Orb Effectiveness',

//     // Ability
//     abilityCooldown: 'Ability Cooldown',
//     abilityPower: 'Ability Power',

//     // Incidents
//     incidentSpawnChance: 'Incident Spawn Chance',
//   };

//   // ---- Percentage keys (others treated as flat) ----
//   private static readonly PERCENT_KEYS = new Set<string>([
//     // Offense
//     'damage',
//     'fireRate',
//     'criticalChance',
//     'criticalMultiplier',
//     'stunChance',
//     'bossDamage',
//     'lifeStealChance',
//     'lifeStealAmount',
//     // Defense
//     'mitigation',
//     'ignoreDamageChance',
//     'acclimatization',
//     'thermalInsulation',
//     // Movement
//     'thrust',
//     'turnPower',
//     'explorer',
//     // Utility
//     'entropiumPickupBonus',
//     'blockDropRate',
//     'attachTierUpChance',
//     'rareItemTradepostChance',
//     'voidIntensity',
//     'powerSurge',
//     'epicInfusion',
//     'repairBounty',
//     'repairAmplification',
//     // Ability
//     'abilityCooldown',
//     'abilityPower',
//     // Incidents
//     'incidentSpawnChance',
//   ]);

//   public setVisible(v: boolean): void { this._visible = v; }
//   public isVisible(): boolean { return this._visible; }

//   /**
//    * Inject InputManager to handle mouse and input interactions.
//    * @param input InputManager instance
//    */
//   constructor(input: InputManager) {
//     this.input = input;
//   }

//   /**
//    * Render anchored to top-right of the overlay canvas.
//    * Always renders all sections/rows; zero-valued stats are greyed.
//    */
//   public render(ctx: CanvasRenderingContext2D, uiScale: number = getUniformScaleFactor()): void {
//     if (!this._visible) return;

//     const P = UnlockedPassiveAggregator.getAggregatedPassives();

//     const rows = this.collapsed ? 0 : PassiveTreeBreakdownWindow.TOTAL_ROWS;  // 1 row when collapsed
//     const sections = this.collapsed ? 1 : PassiveTreeBreakdownWindow.TOTAL_SECTIONS;

//     const logicalW = this.WINDOW_WIDTH;
//     const logicalH =
//       this.PADDING_Y * 2 +
//       this.TITLE_GAP + this.TITLE_HEIGHT +
//       (sections * this.HEADER_HEIGHT) +
//       rows * this.ROW_HEIGHT +
//       (sections > 1 ? (sections - 1) * this.SECTION_GAP : 0);

//     const w = Math.round(logicalW * uiScale);
//     const h = Math.round(logicalH * uiScale);
//     const x = Math.round(ctx.canvas.width - w - this.MARGIN * uiScale);
//     const y = Math.round(this.MARGIN * uiScale);

//     drawMinimalistWindow(ctx, x, y, w, h, {
//       alpha: 1.0,
//       borderRadius: DEFAULT_CONFIG.window.options.borderRadius,
//       borderColor: DEFAULT_CONFIG.window.options.borderColor,
//     });

//     const contentX = x + Math.round(this.PADDING_X * uiScale);
//     let cy = y + Math.round(this.PADDING_Y * uiScale);

//     // Title
//     drawLabel(
//       ctx,
//       contentX,
//       cy,
//       'Global Bonuses',
//       {
//         font: '14px monospace',
//         color: DEFAULT_CONFIG.general.textColor,
//         glow: true,
//       },
//       uiScale
//     );
//     cy += Math.round((this.TITLE_GAP + this.TITLE_HEIGHT) * uiScale);

//     // Collapse button
//     const collapseButton = this.createCollapseButton(x + w - (42 * uiScale), y + (10 * uiScale), uiScale);
//     this.handleButtonInteraction(collapseButton, uiScale);  // Handle button click interaction
//     drawButton(ctx, collapseButton, 1, 15 * uiScale);

//     // Draw sections if not collapsed
//     if (!this.collapsed) {
//       cy = this.drawSection(ctx, 'Offense', P, PassiveTreeBreakdownWindow.OFFENSE_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Defense', P, PassiveTreeBreakdownWindow.DEFENSE_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Movement', P, PassiveTreeBreakdownWindow.MOVEMENT_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Utility', P, PassiveTreeBreakdownWindow.UTILITY_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Ability', P, PassiveTreeBreakdownWindow.ABILITY_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Incidents', P, PassiveTreeBreakdownWindow.INCIDENTS_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Void', P, PassiveTreeBreakdownWindow.VOID_KEYS, contentX, cy, uiScale);
//     }
//   }

//   // ---------- Rendering helpers ----------

//   private drawSection(
//     ctx: CanvasRenderingContext2D,
//     header: string,
//     P: PassiveNodeMetadata,
//     keys: readonly string[],
//     x: number,
//     y: number,
//     uiScale: number
//   ): number {
//     // Header
//     drawLabel(
//       ctx,
//       x,
//       y,
//       header,
//       {
//         font: '12px monospace',
//         color: DEFAULT_CONFIG.general.infoTextColor,
//       },
//       uiScale
//     );
//     y += Math.round(this.HEADER_HEIGHT * uiScale);

//     // Rows (draw *all* keys, greying zeroes)
//     for (let i = 0; i < keys.length; i++) {
//       const k = keys[i];
//       const v = this.valueOrZero(P[k]); // missing → 0

//       const isZero = this.isZeroish(v);
//       const labelColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.textColor;
//       const valueColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.statColor;

//       // Left label
//       drawLabel(
//         ctx,
//         x,
//         y,
//         PassiveTreeBreakdownWindow.LABEL[k] ?? k,
//         {
//           font: '12px monospace',
//           color: labelColor,
//         },
//         uiScale
//       );

//       // Right value (right-aligned inside window)
//       const rightX =
//         x + Math.round((this.WINDOW_WIDTH - this.PADDING_X - 8) * uiScale);
//       const valueText = this.formatValue(k, v);

//       drawLabel(
//         ctx,
//         rightX,
//         y,
//         valueText,
//         {
//           font: '12px monospace',
//           color: valueColor,
//           align: 'right',
//         },
//         uiScale
//       );

//       y += Math.round(this.ROW_HEIGHT * uiScale);
//     }

//     // Gap to next section
//     y += Math.round(this.SECTION_GAP * uiScale);
//     return y;
//   }

//   // ---------- Numeric utils ----------

//   private valueOrZero(v: unknown): number {
//     return typeof v === 'number' && isFinite(v) ? (v as number) : 0;
//   }

//   private isZeroish(v: number): boolean {
//     return Math.abs(v) <= this.EPS;
//   }

//   // ---------- Value formatting ----------

//   private formatValue(key: string, value: number): string {
//     return PassiveTreeBreakdownWindow.PERCENT_KEYS.has(key)
//       ? this.formatPercent(value)
//       : this.formatFlat(value);
//   }

//   private formatPercent(v: number): string {
//     const sign = v > 0 ? '+' : v < 0 ? '' : ''; // + for positive, plain 0% otherwise
//     const pct = v * 100;
//     const abs = Math.abs(pct);
//     const body =
//       abs >= 10 ? pct.toFixed(1) :
//       abs >= 1  ? pct.toFixed(2) :
//                   pct.toFixed(3);
//     return `${sign}${body}%`;
//   }

//   private formatFlat(v: number): string {
//     const sign = v > 0 ? '+' : v < 0 ? '' : '';
//     const isIntish = Math.abs(v - Math.round(v)) < 1e-3;
//     return `${sign}${isIntish ? Math.round(v) : v.toFixed(2)}`;
//   }

//   // ---------- Collapse button helpers ----------

//   private createCollapseButton(x: number, y: number, uiScale: number): UIButton {
//     return {
//       x, y, width: 32 * uiScale, height: 32 * uiScale,
//       label: this.collapsed ? '↓' : '↑',  // Down arrow when collapsed, Up arrow when expanded
//       onClick: () => this.toggleCollapse(),
//       isHovered: false, // Initialize hover state
//     };
//   }

//   private toggleCollapse(): void {
//     this.collapsed = !this.collapsed;
//   }

//   private handleButtonInteraction(button: UIButton, uiScale: number): void {
//     const mouseX = this.input.getMousePosition()?.x ?? 0;
//     const mouseY = this.input.getMousePosition()?.y ?? 0;
//     const wasClicked = this.input.wasMouseClicked();

//     button.isHovered = this.isMouseOver(button, mouseX, mouseY, uiScale); // Update hover state

//     if (button.isHovered) {
//       this.isHovered = true;
//       if (wasClicked) {
//         button.onClick();
//       }
//     } else {
//       this.isHovered = false;
//     }
//   }

//   private isMouseOver(button: UIButton, mouseX: number, mouseY: number, uiScale: number): boolean {
//     const width = button.width * uiScale;
//     const height = button.height * uiScale;
//     return mouseX >= button.x && mouseX <= button.x + width &&
//            mouseY >= button.y && mouseY <= button.y + height;
//   }

//   // Public getter to check if collapse button is hovered
//   public get isCollapseButtonHovered(): boolean {
//     return this.isHovered;
//   }
// }

// src/game/passives/ui/PassiveTreeBreakdownWindow.ts
import { DEFAULT_CONFIG } from '@/config/ui';
import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';
import type { PassiveNodeMetadata } from '@/game/passives/interfaces/PassiveNodeMetadata';
import { InputManager } from '@/core/InputManager';
import { drawButton, UIButton } from '@/ui/primitives/UIButton';

/**
 * PassiveTreeBreakdownWindow
 * - Read-only, GC-neutral readout of aggregated passive bonuses.
 * - Now two columns: left (Offense/Defense/Movement/Utility), right (Ability/Incidents/Void).
 * - Zero-valued stats render grey; alignment preserved per-column.
 * - Owned by PassiveTreeUIController; call render() from the controller’s render().
 */
export class PassiveTreeBreakdownWindow {
  private _visible = true;
  private collapsed = true;
  private input: InputManager;

  // Layout (logical px before uiScale)
  private readonly MARGIN = 6;

  // Old width was 360; +75% ≈ 630 to accommodate two columns without feeling cramped
  private readonly WINDOW_WIDTH = 630;

  private readonly PADDING_X = 16;
  private readonly PADDING_Y = 14;
  private readonly TITLE_GAP = 6;
  private readonly TITLE_HEIGHT = 22;

  private readonly SECTION_GAP = 10;
  private readonly HEADER_HEIGHT = 20;
  private readonly ROW_HEIGHT = 18;

  // Column geometry
  private readonly COLUMN_GAP = 28; // whitespace between the two content columns
  // internal value gutter inside a column (reduces the big L/R gap from single-column era)
  private readonly VALUE_GUTTER = 6;

  private isHovered = false;

  // Formatting
  private readonly EPS = 1e-6;

  // ---- Section order (stable, no per-frame allocation) ----
  private static readonly OFFENSE_KEYS = [
    'damage',
    'fireRate',
    'criticalChance',
    'criticalMultiplier',
    'stunChance',
    'bossDamage',
    'lifeStealChance',
    'lifeStealAmount',
    'coldDuration',
    'igniteDamage',
  ] as const;

  private static readonly DEFENSE_KEYS = [
    'armor',
    'mitigation',
    'ignoreDamageChance',
    'acclimatization',
    'thermalInsulation',
    'ignoreStatusChance',
    'rammer',
  ] as const;

  private static readonly MOVEMENT_KEYS = [
    'thrust',
    'turnPower',
    'explorer',
    'kineticWard',
    'jumpcastSpeed',
    'globalJumpcast',
  ] as const;

  private static readonly UTILITY_KEYS = [
    'entropiumPickupBonus',
    'blockDropRate',
    'harvestRange',
    'attachTierUpChance',
    'rareItemTradepostChance',
    'powerSurge',
    'epicInfusion',
    'repairBounty',
    'repairAmplification',
    'coreBonus',
    'luckyDice',
    'doubleCombine',
    'alchemist',
  ] as const;

  private static readonly ESCORTS_KEYS = [
    'escortDamage',
    'escortSpeed',
    'escortArmor',
    'escortImmunity',
    'escortResurrectionSpeed',
  ] as const;

  private static readonly ABILITY_KEYS = [
    'abilityCooldown',
    'abilityPower',
  ] as const;

  private static readonly INCIDENTS_KEYS = [
    'incidentSpawnChance',
  ] as const;

  private static readonly VOID_KEYS = [
    'voidIntensity',
  ] as const;

  // Column section groupings
  private static readonly LEFT_GROUPS = [
    { title: 'Offense', keys: PassiveTreeBreakdownWindow.OFFENSE_KEYS },
    { title: 'Defense', keys: PassiveTreeBreakdownWindow.DEFENSE_KEYS },
    { title: 'Movement', keys: PassiveTreeBreakdownWindow.MOVEMENT_KEYS },
  ] as const;

  private static readonly RIGHT_GROUPS = [
    { title: 'Utility', keys: PassiveTreeBreakdownWindow.UTILITY_KEYS },
    { title: 'Escorts', keys: PassiveTreeBreakdownWindow.ESCORTS_KEYS },
    { title: 'Ability', keys: PassiveTreeBreakdownWindow.ABILITY_KEYS },
    { title: 'Incidents', keys: PassiveTreeBreakdownWindow.INCIDENTS_KEYS },
    { title: 'Void',     keys: PassiveTreeBreakdownWindow.VOID_KEYS },
  ] as const;

  // ---- Human-readable labels ----
  private static readonly LABEL: Record<string, string> = {
    // Offense
    damage: 'Weapon Damage',
    fireRate: 'Fire Rate',
    criticalChance: 'Crit Chance',
    criticalMultiplier: 'Crit Multiplier',
    stunChance: 'Stun Chance',
    bossDamage: 'Boss Damage',
    lifeStealChance: 'Life Steal Chance',
    lifeStealAmount: 'Life Steal Amount',
    coldDuration: 'Cold Duration',
    igniteDamage: 'Ignite Damage',

    // Defense
    armor: 'Armor',
    mitigation: 'Damage Mitigation',
    ignoreDamageChance: 'Ignore Damage Chance',
    acclimatization: 'Cold Resistance',
    thermalInsulation: 'Heat Resistance',
    ignoreStatusChance: 'Ignore Status Chance',
    rammer: 'Collision Damage Mitigation',

    // Movement
    thrust: 'Thrust',
    turnPower: 'Turn Power',
    explorer: 'Exploration Move Speed',
    kineticWard: 'Kinetic Ward',
    jumpcastSpeed: 'Jumpcast Speed',

    // Utility
    entropiumPickupBonus: 'Entropium Pickup Bonus',
    blockDropRate: 'Block Drop Rate',
    harvestRange: 'Harvest Radius',
    attachTierUpChance: 'Attach Tier-Up Chance',
    rareItemTradepostChance: 'Rare Tradepost Item Chance',
    powerSurge: 'Rare Powerup Chance',
    epicInfusion: 'Epic Powerup Chance',
    repairBounty: 'Repair Orb Drop Chance',
    repairAmplification: 'Repair Orb Effectiveness',
    coreBonus: 'Cores Awarded',
    luckyDice: 'Lucky Dice',
    doubleCombine: 'Double Combine',

    // Escorts
    escortDamage: 'Escort Damage',
    escortSpeed: 'Escort Speed',
    escortArmor: 'Escort Armor',
    escortImmunity: 'Escort Immunity',
    escortResurrectionSpeed: 'Escort Resurrection Speed',

    // Ability
    abilityCooldown: 'Ability Cooldown',
    abilityPower: 'Ability Power',

    // Incidents
    incidentSpawnChance: 'Incident Spawn Chance',

    // Void
    voidIntensity: 'Void Intensity',
  };

  // ---- Percentage keys (others treated as flat) ----
  private static readonly PERCENT_KEYS = new Set<string>([
    // Offense
    'damage',
    'fireRate',
    'criticalChance',
    'criticalMultiplier',
    'stunChance',
    'bossDamage',
    'lifeStealChance',
    'lifeStealAmount',
    'coldDuration',
    'igniteDamage',
    // Defense
    'mitigation',
    'ignoreDamageChance',
    'acclimatization',
    'thermalInsulation',
    'ignoreStatusChance',
    'rammer',
    // Movement
    'thrust',
    'turnPower',
    'explorer',
    'kineticWard',
    'jumpcastSpeed',
    // Utility
    'entropiumPickupBonus',
    'blockDropRate',
    'attachTierUpChance',
    'rareItemTradepostChance',
    'voidIntensity',
    'powerSurge',
    'epicInfusion',
    'repairBounty',
    'repairAmplification',
    'coreBonus',
    'luckyDice',
    'doubleCombine',
    // Escorts
    'escortDamage',
    'escortSpeed',
    'escortImmunity',
    'escortResurrectionSpeed',
    // Ability
    'abilityCooldown',
    'abilityPower',
    // Incidents
    'incidentSpawnChance',
  ]);

  public setVisible(v: boolean): void { this._visible = v; }
  public isVisible(): boolean { return this._visible; }

  constructor(input: InputManager) {
    this.input = input;
  }

  /**
   * Render anchored to top-right of the overlay canvas.
   * Two-column layout; height is the max of the two columns.
   */
  public render(ctx: CanvasRenderingContext2D, uiScale: number = getUniformScaleFactor()): void {
    if (!this._visible) return;

    const P = UnlockedPassiveAggregator.getAggregatedPassives();

    // Column width (logical, pre-scale): content width minus gap, divided evenly
    const contentW = this.WINDOW_WIDTH - this.PADDING_X * 2;
    const colW = Math.floor((contentW - this.COLUMN_GAP) / 2);

    // Compute per-column logical heights when expanded
    const leftHeight  = this.collapsed ? 0 : this.measureColumnHeight(PassiveTreeBreakdownWindow.LEFT_GROUPS);
    const rightHeight = this.collapsed ? 0 : this.measureColumnHeight(PassiveTreeBreakdownWindow.RIGHT_GROUPS);

    const logicalW = this.WINDOW_WIDTH;
    const logicalH =
      this.PADDING_Y * 2 +
      this.TITLE_GAP + this.TITLE_HEIGHT +
      Math.max(leftHeight, rightHeight);

    const w = Math.round(logicalW * uiScale);
    const h = Math.round(logicalH * uiScale);
    const x = Math.round(ctx.canvas.width - w - this.MARGIN * uiScale);
    const y = Math.round(this.MARGIN * uiScale);

    // Frame
    drawMinimalistWindow(ctx, x, y, w, h, {
      alpha: 1.0,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
    });

    const contentX = x + Math.round(this.PADDING_X * uiScale);
    const contentY = y + Math.round(this.PADDING_Y * uiScale);

    // Title
    drawLabel(
      ctx,
      contentX,
      contentY,
      'Global Bonuses',
      {
        font: '14px monospace',
        color: DEFAULT_CONFIG.general.textColor,
        glow: true,
      },
      uiScale
    );

    // Collapse button (top-right, within padding)
    const btnX = x + w - Math.round((this.PADDING_X + 32) * uiScale);
    const btnY = y + Math.round((this.PADDING_Y - 2) * uiScale);
    const collapseButton = this.createCollapseButton(btnX, btnY);
    this.handleButtonInteraction(collapseButton);
    drawButton(ctx, collapseButton, uiScale);

    // Early out if collapsed (title + chrome only)
    if (this.collapsed) return;

    // Column anchors
    const colsTop = contentY + Math.round((this.TITLE_GAP + this.TITLE_HEIGHT) * uiScale);

    const leftX  = contentX;
    const rightX = contentX + Math.round(colW * uiScale) + Math.round(this.COLUMN_GAP * uiScale);

    // Render columns
    let cyLeft = colsTop;
    let cyRight = colsTop;

    cyLeft = this.drawGroupsColumn(
      ctx,
      PassiveTreeBreakdownWindow.LEFT_GROUPS,
      P,
      leftX,
      cyLeft,
      colW,
      uiScale
    );
    cyRight = this.drawGroupsColumn(
      ctx,
      PassiveTreeBreakdownWindow.RIGHT_GROUPS,
      P,
      rightX,
      cyRight,
      colW,
      uiScale
    );
  }

  // ---------- Column/section rendering ----------

  private drawGroupsColumn(
    ctx: CanvasRenderingContext2D,
    groups: readonly { title: string; keys: readonly string[] }[],
    P: PassiveNodeMetadata,
    x: number,
    y: number,
    colLogicalWidth: number,
    uiScale: number
  ): number {
    const colRight = x + Math.round(colLogicalWidth * uiScale);
    const valueRight = colRight - Math.round(this.VALUE_GUTTER * uiScale);

    for (let g = 0; g < groups.length; g++) {
      // Header
      drawLabel(
        ctx,
        x,
        y,
        groups[g].title,
        {
          font: '12px monospace',
          color: DEFAULT_CONFIG.general.infoTextColor,
        },
        uiScale
      );
      y += Math.round(this.HEADER_HEIGHT * uiScale);

      // Rows
      const keys = groups[g].keys;
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const v = this.valueOrZero((P as any)[k]);

        const isZero = this.isZeroish(v);
        const labelColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.textColor;
        const valueColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.statColor;

        drawLabel(
          ctx,
          x,
          y,
          PassiveTreeBreakdownWindow.LABEL[k] ?? k,
          {
            font: '12px monospace',
            color: labelColor,
          },
          uiScale
        );

        drawLabel(
          ctx,
          valueRight,
          y,
          this.formatValue(k, v),
          {
            font: '12px monospace',
            color: valueColor,
            align: 'right',
          },
          uiScale
        );

        y += Math.round(this.ROW_HEIGHT * uiScale);
      }

      // Gap between sections
      y += Math.round(this.SECTION_GAP * uiScale);
    }

    return y;
  }

  private measureColumnHeight(
    groups: readonly { title: string; keys: readonly string[] }[]
  ): number {
    // Purely logical height (pre-scale)
    let h = 0;
    for (let g = 0; g < groups.length; g++) {
      h += this.HEADER_HEIGHT;
      h += groups[g].keys.length * this.ROW_HEIGHT;
      h += this.SECTION_GAP;
    }
    // remove the last SECTION_GAP if you prefer tighter bottom; keeping it symmetric is fine
    return h;
  }

  // ---------- Numeric utils ----------

  private valueOrZero(v: unknown): number {
    return typeof v === 'number' && isFinite(v) ? (v as number) : 0;
  }

  private isZeroish(v: number): boolean {
    return Math.abs(v) <= this.EPS;
  }

  // ---------- Value formatting ----------

  private formatValue(key: string, value: number): string {
    return PassiveTreeBreakdownWindow.PERCENT_KEYS.has(key)
      ? this.formatPercent(value)
      : this.formatFlat(value);
  }

  private formatPercent(v: number): string {
    const sign = v > 0 ? '+' : v < 0 ? '' : '';
    const pct = v * 100;
    const abs = Math.abs(pct);
    const body =
      abs >= 10 ? pct.toFixed(1) :
      abs >= 1  ? pct.toFixed(2) :
                  pct.toFixed(3);
    return `${sign}${body}%`;
  }

  private formatFlat(v: number): string {
    const sign = v > 0 ? '+' : v < 0 ? '' : '';
    const isIntish = Math.abs(v - Math.round(v)) < 1e-3;
    return `${sign}${isIntish ? Math.round(v) : v.toFixed(2)}`;
  }

  // ---------- Collapse button helpers ----------

  // Note: button dimensions are already scaled (pixel space), so hover checks DO NOT reapply uiScale.
  private createCollapseButton(x: number, y: number): UIButton {
    return {
      x, y,
      width: 32, height: 32, // already pixel-space
      label: this.collapsed ? '↓' : '↑',
      onClick: () => this.toggleCollapse(),
      isHovered: false,
    };
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }

  private handleButtonInteraction(button: UIButton): void {
    const pos = this.input.getMousePosition();
    const mouseX = pos ? pos.x : 0;
    const mouseY = pos ? pos.y : 0;
    const wasClicked = this.input.wasMouseClicked();

    button.isHovered = this.isMouseOver(button, mouseX, mouseY, getUniformScaleFactor());

    if (button.isHovered) {
      this.isHovered = true;
      if (wasClicked) button.onClick();
    } else {
      this.isHovered = false;
    }
  }

  private isMouseOver(button: UIButton, mouseX: number, mouseY: number, uiScale: number = 1.0): boolean {
    return mouseX >= button.x && mouseX <= button.x + button.width * uiScale &&
           mouseY >= button.y && mouseY <= button.y + button.height * uiScale;
  }

  // Public getter to check if collapse button is hovered
  public get isCollapseButtonHovered(): boolean {
    return this.isHovered;
  }
}
