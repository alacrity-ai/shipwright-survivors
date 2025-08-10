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
//   ] as const;

//   private static readonly DEFENSE_KEYS = [
//     'armor',
//     'mitigation',
//     'ignoreDamageChance',
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
//     'voidIntensity',
//   ] as const;

//   private static readonly ABILITY_KEYS = [
//     'abilityCooldown',
//     'abilityPower',
//   ] as const;

//   private static readonly INCIDENTS_KEYS = [
//     'incidentSpawnChance',
//   ] as const;

//   // Precomputed static totals (no per-frame math)
//   private static readonly TOTAL_ROWS =
//     PassiveTreeBreakdownWindow.OFFENSE_KEYS.length +
//     PassiveTreeBreakdownWindow.DEFENSE_KEYS.length +
//     PassiveTreeBreakdownWindow.MOVEMENT_KEYS.length +
//     PassiveTreeBreakdownWindow.UTILITY_KEYS.length +
//     PassiveTreeBreakdownWindow.ABILITY_KEYS.length +
//     PassiveTreeBreakdownWindow.INCIDENTS_KEYS.length;

//   private static readonly TOTAL_SECTIONS = 6;

//   // ---- Human-readable labels ----
//   private static readonly LABEL: Record<string, string> = {
//     // Offense
//     damage: 'Weapon Damage',
//     fireRate: 'Fire Rate',
//     criticalChance: 'Crit Chance',
//     criticalMultiplier: 'Crit Multiplier',
//     stunChance: 'Stun Chance',
//     bossDamage: 'Boss Damage',

//     // Defense
//     armor: 'Armor',
//     mitigation: 'Damage Mitigation',
//     ignoreDamageChance: 'Ignore Damage Chance',

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
//     // Defense
//     'mitigation',
//     'ignoreDamageChance',
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
//     drawButton(ctx, collapseButton, 1, 15 * uiScale);
//     this.handleButtonInteraction(collapseButton, uiScale);  // Handle button click interaction

//     // Draw sections if not collapsed
//     if (!this.collapsed) {
//       cy = this.drawSection(ctx, 'Offense', P, PassiveTreeBreakdownWindow.OFFENSE_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Defense', P, PassiveTreeBreakdownWindow.DEFENSE_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Movement', P, PassiveTreeBreakdownWindow.MOVEMENT_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Utility', P, PassiveTreeBreakdownWindow.UTILITY_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Ability', P, PassiveTreeBreakdownWindow.ABILITY_KEYS, contentX, cy, uiScale);
//       cy = this.drawSection(ctx, 'Incidents', P, PassiveTreeBreakdownWindow.INCIDENTS_KEYS, contentX, cy, uiScale);
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

//     };
//   }

//   private toggleCollapse(): void {
//     this.collapsed = !this.collapsed;
//   }

//   private handleButtonInteraction(button: UIButton, uiScale: number): void {
//     const mouseX = this.input.getMousePosition()?.x ?? 0;
//     const mouseY = this.input.getMousePosition()?.y ?? 0;
//     const wasClicked = this.input.wasMouseClicked();
//     if (wasClicked && this.isMouseOver(button, mouseX, mouseY, uiScale)) {
//       button.onClick();
//     }
//   }

//   private isMouseOver(button: UIButton, mouseX: number, mouseY: number, uiScale: number): boolean {
//     const width = button.width * uiScale;
//     const height = button.height * uiScale;
//     return mouseX >= button.x && mouseX <= button.x + width &&
//            mouseY >= button.y && mouseY <= button.y + height;
//   }
// }


import { DEFAULT_CONFIG } from '@/config/ui';
import { getUniformScaleFactor } from '@/config/view';
import { drawMinimalistWindow } from '@/ui/primitives/UIMinimalistWindow';
import { drawLabel } from '@/ui/primitives/UILabel';
import { UnlockedPassiveAggregator } from '@/game/passives/runtime/UnlockedPassiveAggregator';
import type { PassiveNodeMetadata } from '@/game/passives/interfaces/PassiveNodeMetadata';
import { InputManager } from '@/core/InputManager';  // Injecting InputManager
import { drawButton, UIButton } from '@/ui/primitives/UIButton';

/**
 * PassiveTreeBreakdownWindow
 * - Read-only, GC-neutral readout of aggregated passive bonuses.
 * - Shows *all* known passives, including zero-valued ones (greyed).
 * - Owned by PassiveTreeUIController; call render() from the controller’s render().
 */
export class PassiveTreeBreakdownWindow {
  private _visible = true;
  private collapsed = false;  // Track collapsed state
  private input: InputManager;  // InputManager injected for mouse handling

  // Layout (logical px before uiScale)
  private readonly MARGIN = 6;
  private readonly WINDOW_WIDTH = 360;
  private readonly PADDING_X = 16;
  private readonly PADDING_Y = 14;
  private readonly TITLE_GAP = 6;       // gap below the window title
  private readonly TITLE_HEIGHT = 22;   // title row height
  private readonly SECTION_GAP = 10;    // gap between sections
  private readonly HEADER_HEIGHT = 20;  // section header row height
  private readonly ROW_HEIGHT = 18;     // per-stat row height

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
  ] as const;

  private static readonly DEFENSE_KEYS = [
    'armor',
    'mitigation',
    'ignoreDamageChance',
  ] as const;

  private static readonly MOVEMENT_KEYS = [
    'thrust',
    'turnPower',
    'explorer',
  ] as const;

  private static readonly UTILITY_KEYS = [
    'entropiumPickupBonus',
    'blockDropRate',
    'harvestRange',
    'attachTierUpChance',
    'rareItemTradepostChance',
    'voidIntensity',
  ] as const;

  private static readonly ABILITY_KEYS = [
    'abilityCooldown',
    'abilityPower',
  ] as const;

  private static readonly INCIDENTS_KEYS = [
    'incidentSpawnChance',
  ] as const;

  // Precomputed static totals (no per-frame math)
  private static readonly TOTAL_ROWS =
    PassiveTreeBreakdownWindow.OFFENSE_KEYS.length +
    PassiveTreeBreakdownWindow.DEFENSE_KEYS.length +
    PassiveTreeBreakdownWindow.MOVEMENT_KEYS.length +
    PassiveTreeBreakdownWindow.UTILITY_KEYS.length +
    PassiveTreeBreakdownWindow.ABILITY_KEYS.length +
    PassiveTreeBreakdownWindow.INCIDENTS_KEYS.length;

  private static readonly TOTAL_SECTIONS = 6;

  // ---- Human-readable labels ----
  private static readonly LABEL: Record<string, string> = {
    // Offense
    damage: 'Weapon Damage',
    fireRate: 'Fire Rate',
    criticalChance: 'Crit Chance',
    criticalMultiplier: 'Crit Multiplier',
    stunChance: 'Stun Chance',
    bossDamage: 'Boss Damage',

    // Defense
    armor: 'Armor',
    mitigation: 'Damage Mitigation',
    ignoreDamageChance: 'Ignore Damage Chance',

    // Movement
    thrust: 'Thrust',
    turnPower: 'Turn Power',
    explorer: 'Exploration Move Speed',

    // Utility
    entropiumPickupBonus: 'Entropium Pickup Bonus',
    blockDropRate: 'Block Drop Rate',
    harvestRange: 'Harvest Radius',
    attachTierUpChance: 'Attach Tier-Up Chance',
    rareItemTradepostChance: 'Rare Tradepost Item Chance',
    voidIntensity: 'Void Intensity',

    // Ability
    abilityCooldown: 'Ability Cooldown',
    abilityPower: 'Ability Power',

    // Incidents
    incidentSpawnChance: 'Incident Spawn Chance',
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
    // Defense
    'mitigation',
    'ignoreDamageChance',
    // Movement
    'thrust',
    'turnPower',
    'explorer',
    // Utility
    'entropiumPickupBonus',
    'blockDropRate',
    'attachTierUpChance',
    'rareItemTradepostChance',
    'voidIntensity',
    // Ability
    'abilityCooldown',
    'abilityPower',
    // Incidents
    'incidentSpawnChance',
  ]);

  public setVisible(v: boolean): void { this._visible = v; }
  public isVisible(): boolean { return this._visible; }

  /**
   * Inject InputManager to handle mouse and input interactions.
   * @param input InputManager instance
   */
  constructor(input: InputManager) {
    this.input = input;
  }

  /**
   * Render anchored to top-right of the overlay canvas.
   * Always renders all sections/rows; zero-valued stats are greyed.
   */
  public render(ctx: CanvasRenderingContext2D, uiScale: number = getUniformScaleFactor()): void {
    if (!this._visible) return;

    const P = UnlockedPassiveAggregator.getAggregatedPassives();

    const rows = this.collapsed ? 0 : PassiveTreeBreakdownWindow.TOTAL_ROWS;  // 1 row when collapsed
    const sections = this.collapsed ? 1 : PassiveTreeBreakdownWindow.TOTAL_SECTIONS;

    const logicalW = this.WINDOW_WIDTH;
    const logicalH =
      this.PADDING_Y * 2 +
      this.TITLE_GAP + this.TITLE_HEIGHT +
      (sections * this.HEADER_HEIGHT) +
      rows * this.ROW_HEIGHT +
      (sections > 1 ? (sections - 1) * this.SECTION_GAP : 0);

    const w = Math.round(logicalW * uiScale);
    const h = Math.round(logicalH * uiScale);
    const x = Math.round(ctx.canvas.width - w - this.MARGIN * uiScale);
    const y = Math.round(this.MARGIN * uiScale);

    drawMinimalistWindow(ctx, x, y, w, h, {
      alpha: 1.0,
      borderRadius: DEFAULT_CONFIG.window.options.borderRadius,
      borderColor: DEFAULT_CONFIG.window.options.borderColor,
    });

    const contentX = x + Math.round(this.PADDING_X * uiScale);
    let cy = y + Math.round(this.PADDING_Y * uiScale);

    // Title
    drawLabel(
      ctx,
      contentX,
      cy,
      'Global Bonuses',
      {
        font: '14px monospace',
        color: DEFAULT_CONFIG.general.textColor,
        glow: true,
      },
      uiScale
    );
    cy += Math.round((this.TITLE_GAP + this.TITLE_HEIGHT) * uiScale);

    // Collapse button
    const collapseButton = this.createCollapseButton(x + w - (42 * uiScale), y + (10 * uiScale), uiScale);
    this.handleButtonInteraction(collapseButton, uiScale);  // Handle button click interaction
    drawButton(ctx, collapseButton, 1, 15 * uiScale);

    // Draw sections if not collapsed
    if (!this.collapsed) {
      cy = this.drawSection(ctx, 'Offense', P, PassiveTreeBreakdownWindow.OFFENSE_KEYS, contentX, cy, uiScale);
      cy = this.drawSection(ctx, 'Defense', P, PassiveTreeBreakdownWindow.DEFENSE_KEYS, contentX, cy, uiScale);
      cy = this.drawSection(ctx, 'Movement', P, PassiveTreeBreakdownWindow.MOVEMENT_KEYS, contentX, cy, uiScale);
      cy = this.drawSection(ctx, 'Utility', P, PassiveTreeBreakdownWindow.UTILITY_KEYS, contentX, cy, uiScale);
      cy = this.drawSection(ctx, 'Ability', P, PassiveTreeBreakdownWindow.ABILITY_KEYS, contentX, cy, uiScale);
      cy = this.drawSection(ctx, 'Incidents', P, PassiveTreeBreakdownWindow.INCIDENTS_KEYS, contentX, cy, uiScale);
    }
  }

  // ---------- Rendering helpers ----------

  private drawSection(
    ctx: CanvasRenderingContext2D,
    header: string,
    P: PassiveNodeMetadata,
    keys: readonly string[],
    x: number,
    y: number,
    uiScale: number
  ): number {
    // Header
    drawLabel(
      ctx,
      x,
      y,
      header,
      {
        font: '12px monospace',
        color: DEFAULT_CONFIG.general.infoTextColor,
      },
      uiScale
    );
    y += Math.round(this.HEADER_HEIGHT * uiScale);

    // Rows (draw *all* keys, greying zeroes)
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = this.valueOrZero(P[k]); // missing → 0

      const isZero = this.isZeroish(v);
      const labelColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.textColor;
      const valueColor = isZero ? DEFAULT_CONFIG.general.disabledColor : DEFAULT_CONFIG.general.statColor;

      // Left label
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

      // Right value (right-aligned inside window)
      const rightX =
        x + Math.round((this.WINDOW_WIDTH - this.PADDING_X - 8) * uiScale);
      const valueText = this.formatValue(k, v);

      drawLabel(
        ctx,
        rightX,
        y,
        valueText,
        {
          font: '12px monospace',
          color: valueColor,
          align: 'right',
        },
        uiScale
      );

      y += Math.round(this.ROW_HEIGHT * uiScale);
    }

    // Gap to next section
    y += Math.round(this.SECTION_GAP * uiScale);
    return y;
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
    const sign = v > 0 ? '+' : v < 0 ? '' : ''; // + for positive, plain 0% otherwise
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

  private createCollapseButton(x: number, y: number, uiScale: number): UIButton {
    return {
      x, y, width: 32 * uiScale, height: 32 * uiScale,
      label: this.collapsed ? '↓' : '↑',  // Down arrow when collapsed, Up arrow when expanded
      onClick: () => this.toggleCollapse(),
      isHovered: false, // Initialize hover state
    };
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }

  private handleButtonInteraction(button: UIButton, uiScale: number): void {
    const mouseX = this.input.getMousePosition()?.x ?? 0;
    const mouseY = this.input.getMousePosition()?.y ?? 0;
    const wasClicked = this.input.wasMouseClicked();

    button.isHovered = this.isMouseOver(button, mouseX, mouseY, uiScale); // Update hover state

    if (button.isHovered) {
      this.isHovered = true;
      if (wasClicked) {
        button.onClick();
      }
    } else {
      this.isHovered = false;
    }
  }

  private isMouseOver(button: UIButton, mouseX: number, mouseY: number, uiScale: number): boolean {
    const width = button.width * uiScale;
    const height = button.height * uiScale;
    return mouseX >= button.x && mouseX <= button.x + width &&
           mouseY >= button.y && mouseY <= button.y + height;
  }

  // Public getter to check if collapse button is hovered
  public get isCollapseButtonHovered(): boolean {
    return this.isHovered;
  }
}
