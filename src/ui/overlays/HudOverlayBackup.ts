// import type { Ship } from '@/game/ship/Ship';
// import type { CanvasManager } from '@/core/CanvasManager';

// import { drawWindow } from '@/ui/primitives/WindowBox';
// import { drawLabel } from '@/ui/primitives/UILabel';
// import { drawUIResourceBar } from '@/ui/primitives/UIResourceBar';
// import { drawUIVerticalResourceBar } from '@/ui/primitives/UIVerticalResourceBar';
// import { drawFiringModeToggle } from '@/ui/primitives/UIFiringModeToggle';
// import { PlayerResources } from '@/game/player/PlayerResources';
// import { BlockPreviewRenderer } from '@/ui/components/BlockPreviewRenderer';
// import { getBlockType } from '@/game/blocks/BlockRegistry';

// import { getUniformScaleFactor } from '@/config/view';

// export class HudOverlay {
//   private playerResources: PlayerResources;
//   private currency: number = 0;
//   private disposer: (() => void) | null = null;
//   private blockPreviewRenderer: BlockPreviewRenderer;

//   // Mini block preview dimensions
//   private readonly MINI_BLOCK_SIZE = 16;
//   private readonly MINI_BLOCK_SPIN_SPEED = 0.5;

//   constructor(
//     private readonly canvasManager: CanvasManager,
//     private readonly ship: Ship
//   ) {
//     this.playerResources = PlayerResources.getInstance();
//     this.currency = this.playerResources.getCurrency();

//     this.disposer = this.playerResources.onCurrencyChange((newValue) => {
//       this.currency = newValue;
//     });

//     // Initialize mini block preview with hull0
//     const hullBlockType = getBlockType('hull0');
//     this.blockPreviewRenderer = new BlockPreviewRenderer(
//       hullBlockType!, 
//       this.MINI_BLOCK_SPIN_SPEED, 
//       this.MINI_BLOCK_SPIN_SPEED * 1.5
//     );
//   }

//   render(dt: number): void {
//     const scale = getUniformScaleFactor();

//     const ctx = this.canvasManager.getContext('ui');
//     const { velocity } = this.ship.getTransform();

//     const blocks = this.ship.getAllBlocks();
//     const mass = blocks.reduce((sum, [_, b]) => sum + b.type.mass, 0);
//     const currentHp = Math.floor(this.ship.getCockpitHp() ?? 0);
//     const maxHp = Math.floor(this.ship.getCockpit()?.type.armor ?? 1);
//     const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);

//     const energyComponent = this.ship.getEnergyComponent();
//     const energy = Math.floor(energyComponent?.getCurrent() ?? 0);
//     const maxEnergy = Math.floor(energyComponent?.getMax() ?? 0);

//     const canvas = ctx.canvas;
//     const barWidth = Math.floor(180 * scale);
//     const barHeight = Math.floor(12 * scale);
//     const spacing = Math.floor(20 * scale);
//     const totalWidth = barWidth * 2 + spacing;

//     const baseX = Math.floor((canvas.width - totalWidth) / 2);
//     const y = canvas.height - Math.floor(24 * scale);

//     // === Update and render mini block preview ===
//     this.blockPreviewRenderer.update(dt);
    
//     // === Draw Health Bar ===
//     drawUIResourceBar(ctx, {
//       x: baseX,
//       y,
//       width: barWidth,
//       height: barHeight,
//       value: maxHp > 0 ? currentHp / maxHp : 0,
//       label: `${currentHp} / ${maxHp}`,
//       style: {
//         barColor: '#c33',
//         borderColor: '#f66',
//         backgroundColor: '#200',
//         glow: true,
//         textColor: '#f88',
//         font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
//         scanlineIntensity: 0.3,
//         chromaticAberration: true,
//         phosphorDecay: true,
//         cornerBevel: true,
//         warningThreshold: 0.3,
//         criticalThreshold: 0.15,
//         warningColor: '#ffaa00',
//         criticalColor: '#ff0040',
//         animated: true,
//       }
//     }, performance.now());

//     // === Draw Energy Bar ===
//     drawUIResourceBar(ctx, {
//       x: baseX + barWidth + spacing,
//       y,
//       width: barWidth,
//       height: barHeight,
//       value: maxEnergy > 0 ? energy / maxEnergy : 1,
//       label: `${Math.round(energy)} / ${maxEnergy}`,
//       style: {
//         barColor: '#0af',
//         borderColor: '#6cf',
//         backgroundColor: '#003',
//         glow: true,
//         textColor: '#9cf',
//         font: `${Math.floor(11 * scale)}px "Courier New", monospace`,
//         scanlineIntensity: 0.25,
//         chromaticAberration: true,
//         phosphorDecay: true,
//         cornerBevel: true,
//         warningThreshold: 0.25,
//         criticalThreshold: 0.1,
//         warningColor: '#ffaa00',
//         criticalColor: '#ff0040',
//         animated: true,
//       }
//     }, performance.now());

//     // === Draw Speed Bar (Vertical) ===
//     const speedBarHeight = Math.floor(120 * scale);
//     const speedBarWidth = Math.floor(12 * scale);
//     const speedBarX = Math.floor(32 * scale);
//     const speedBarY = y - speedBarHeight + Math.floor(14 * scale);
    
//     drawUIVerticalResourceBar(ctx, {
//       x: speedBarX,
//       y: speedBarY,
//       width: speedBarWidth,
//       height: speedBarHeight,
//       value: speed,
//       maxValue: 2000,
//       style: {
//         barColor: '#00ff41',             // Classic green phosphor
//         backgroundColor: '#001100',      // Deep green-black CRT background
//         borderColor: '#00aa33',          // Dimmer border for retro casing feel
//         glow: true,
//         textColor: '#00ff88',            // Softer green for readouts
//         showLabel: true,
//         unit: 'm/s',
//       }
//     });

//     // === Draw Firing Mode Toggle ===
//     const toggleWidth = Math.floor(120 * scale);
//     const toggleHeight = Math.floor(24 * scale);
//     const toggleX = Math.floor(64 * scale);
//     const toggleY = y - Math.floor(12 * scale);
    
//     drawFiringModeToggle(ctx, {
//       x: toggleX,
//       y: toggleY,
//       mode: this.ship.getFiringMode(),
//       style: {
//         width: toggleWidth,
//         height: toggleHeight,
//         backgroundColor: '#000a00',      // Dark green background like minimap
//         borderColor: '#00ff41',          // Bright CRT green
//         activeColor: '#00ff41',          // Consistent green for active state
//         inactiveColor: '#001a00',        // Darker green for inactive
//         textColor: '#00ff41',            // CRT green text
//         glowColor: '#00ff41',            // Green glow
//         font: `${Math.floor(10 * scale)}px "Courier New", monospace`,
//         glow: true,
//         animated: true,
//         scanlineIntensity: 0.3,          // Slightly more visible scanlines
//         chromaticAberration: false,      // Disabled for cleaner CRT look
//       }
//     }, performance.now());

//     // === Additional Metrics: Mass & Entropium ===
//     let infoY = toggleY;
//     const infoX = Math.floor(900 * scale);
//     const lineHeight = Math.floor(16 * scale);

//     drawLabel(ctx, infoX, infoY, `Mass: ${mass.toFixed(1)} kg`, {}, scale); infoY += lineHeight;
//     drawLabel(ctx, infoX, infoY, `Entropium: ${this.currency}`, {}, scale); infoY += lineHeight;

//     // BEGIN BLOCK QUEUE RENDERING LOGIC
    
//     // === Block Queue (Inventory of blocks gathered):
//     // == MAIN WINDOW CONTAINER: Draw the window which encompasses all the Block Preview Cards
//     const blockCount = this.playerResources.getBlockCount();
//     const distanceFromBottom = Math.floor(80 * scale);

//     const centerScreenXPos = Math.floor(canvas.width / 2);

//     const miniBlockWindowWidth = Math.floor(196 * scale);
//     const miniBlockWindowHeight = Math.floor(44 * scale);
//     const miniBlockWindowX = centerScreenXPos - (miniBlockWindowWidth / 2); // Center screen
//     const miniBlockWindowY = canvas.height - distanceFromBottom;
//     const miniBlockWindowMarginX = Math.floor(6 * scale);
//     const miniBlockWindowMarginY = Math.floor(6 * scale);

//     // Set color to dark green if has blocks, otherwise dark grey
//     const miniBlockWindowBorderColor = blockCount > 0 ? '#00ff00' : '#003400';

//     drawWindow({
//       ctx,
//       x: miniBlockWindowX,
//       y: miniBlockWindowY,
//       width: miniBlockWindowWidth,
//       height: miniBlockWindowHeight,
//       options: {
//         alpha: 0.5,
//         borderRadius: 12,
//         borderColor: miniBlockWindowBorderColor,
//         backgroundColor: '#00000000', // Transparent
//       }
//     });

//     // Label for the Container
//     const miniBlockWindowLabelColor = blockCount > 0 ? '#00ff00' : '#003400';
//     drawLabel(ctx, miniBlockWindowX, miniBlockWindowY - (14 * scale), `Blocks: ${blockCount}`, { align: 'left', color: miniBlockWindowLabelColor }, scale);
//     ctx.restore();

//     // == INDIVIDUAL BLOCK PREVIEW CARDS ===
//     // (Note this is currently only rendering one card, showing the last gathered block, this will change to overlapping cards, with the most recent card on top, and to the leftmost position)
//     // Block Card:
//     // == A card body outlining a spinning preview block
//     const miniBlockCardWidth = Math.floor(32 * scale);
//     const miniBlockCardHeight = Math.floor(32 * scale);
//     const miniBlockCardX = miniBlockWindowX + miniBlockWindowMarginX;
//     const miniBlockCardY = miniBlockWindowY + miniBlockWindowMarginY;
//     const miniBlockCardBorderColor = blockCount > 0 ? '#00ff00' : '#003400';
//     const miniBlockCardMarginX = Math.floor(8 * scale);
//     const miniBlockCardMarginY = Math.floor(8 * scale);

//     drawWindow({
//       ctx,
//       x: miniBlockCardX,
//       y: miniBlockCardY,
//       width: miniBlockCardWidth,
//       height: miniBlockCardHeight,
//       options: {
//         alpha: 0.5,
//         borderRadius: 12,
//         borderColor: miniBlockCardBorderColor,
//         backgroundGradient: {
//           type: 'linear',
//           stops: [
//             { offset: 0, color: '#002200' },
//             { offset: 1, color: '#001500' }
//           ]
//         }
//       }
//     });

//     // == A spinning preview block
//     const miniBlockPreviewSize = Math.floor(this.MINI_BLOCK_SIZE * scale);
//     const miniBlockPreviewX = miniBlockCardX + miniBlockCardMarginX;
//     const miniBlockPreviewY = miniBlockCardY + miniBlockCardMarginY;

//     const blockToPreview = this.playerResources.getLastGatheredBlock(); // Will be replaced to just render the blocktype pased in
//     const miniBlockAlpha = blockCount > 0 ? 1.0 : 0.3;

//     this.blockPreviewRenderer.render(
//       ctx,
//       miniBlockPreviewX,
//       miniBlockPreviewY,
//       miniBlockPreviewSize,
//       miniBlockPreviewSize,
//       miniBlockAlpha,
//       blockToPreview
//     );
//   // END BLOCK PREVIEW RENDERING LOGIC

//   }

//   destroy(): void {
//     this.disposer?.();
//   }
// }