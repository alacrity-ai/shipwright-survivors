// // src/game/passives/ui/PassiveTreeUIRenderer.ts

// import { DEFAULT_CONFIG } from '@/config/ui';
// import type { PassiveTree } from '@/game/passives/interfaces/PassiveTree';
// import type { PositionedPassiveNode } from '@/game/passives/interfaces/PositionedPassiveNode';
// import { resolvePassiveIconSprite } from '@/game/passives/icons/passiveIconCache';

// const NODE_SPACING = 64;          // pixels per grid cell (same as ship tree)
// const NODE_SIZE_FACTOR = 2.0;
// const NODE_RADIUS_MAJOR = 40;
// const NODE_RADIUS_MINOR = 28;

// export interface RenderStyle {
//   unlockedColor: string;
//   unlockableColor: string;
//   lockedColor: string;
//   connectionWidthPx: number;
// }

// export interface DrawContext {
//   ctx: CanvasRenderingContext2D;
//   tree: PassiveTree;
//   // camera (world->screen)
//   camX: number;
//   camY: number;
//   zoom: number;
//   // canvas dims
//   canvasW: number;
//   canvasH: number;
//   // interaction state
//   hoveredNodeId: string | null;
//   isUnlocked: (id: string) => boolean;
//   canUnlock: (id: string) => boolean;
// }

// const { general } = DEFAULT_CONFIG;
// const defaultStyle: RenderStyle = {
//   unlockedColor: general.accentColor,
//   unlockableColor: general.primaryColor,
//   lockedColor: general.disabledColor,
//   connectionWidthPx: 4
// };

// export class PassiveTreeUIRenderer {
//   // === Public

//   render(dc: DrawContext, style: RenderStyle = defaultStyle): void {
//     const { ctx, tree } = dc;
//     ctx.save();

//     // 1) Connections
//     for (const sq of tree.squares) {
//       const from = sq;
//       for (const targetId of from.connectedTo) {
//         const to = tree.squares.find(n => n.node.id === targetId);
//         if (!to) continue;

//         const fromUnlocked = dc.isUnlocked(from.node.id);
//         const toUnlocked = dc.isUnlocked(targetId);
//         const connColor = (fromUnlocked && toUnlocked)
//           ? style.unlockedColor
//           : ((fromUnlocked || toUnlocked) ? general.primaryColor : style.lockedColor);

//         const { x: x1, y: y1 } = this.nodeWorldToScreen(from, dc);
//         const { x: x2, y: y2 } = this.nodeWorldToScreen(to, dc);

//         const r1 = this.nodeRadius(from) * dc.zoom;
//         const r2 = this.nodeRadius(to) * dc.zoom;

//         this.drawConnectionLine(ctx, x1, y1, x2, y2, r1, r2, style.connectionWidthPx, connColor);
//       }
//     }

//     // 2) Nodes
//     for (const sq of tree.squares) {
//       const { x, y } = this.nodeWorldToScreen(sq, dc);
//       const id = sq.node.id;

//       // Frustum cull: expand by max radius
//       const maxR = this.nodeRadius(sq) * dc.zoom + 6;
//       if (x + maxR < 0 || y + maxR < 0 || x - maxR > dc.canvasW || y - maxR > dc.canvasH) continue;

//       const hovered = dc.hoveredNodeId === id;
//       const unlocked = dc.isUnlocked(id);
//       const unlockable = dc.canUnlock(id) && !unlocked;

//       this.drawPassiveNode(dc.ctx, sq, x, y, dc.zoom, hovered, unlocked, unlockable);
//     }

//     ctx.restore();
//   }

//   // === Hit testing (controller calls with world coords)
//   public getNodeAtWorld(tree: PassiveTree, worldX: number, worldY: number): string | null {
//     for (const sq of tree.squares) {
//       const cx = sq.x * NODE_SPACING;
//       const cy = sq.y * NODE_SPACING;
//       const r = this.nodeRadius(sq);
//       const dx = worldX - cx;
//       const dy = worldY - cy;
//       if (dx * dx + dy * dy <= r * r) return sq.node.id;
//     }
//     return null;
//   }

//   // === Helpers

//   private nodeRadius(sq: PositionedPassiveNode): number {
//     return sq.node.nodeSize === 'major' ? NODE_RADIUS_MAJOR : NODE_RADIUS_MINOR;
//   }

//   private nodeWorldToScreen(sq: PositionedPassiveNode, dc: DrawContext): { x: number; y: number } {
//     const wx = sq.x * NODE_SPACING;
//     const wy = sq.y * NODE_SPACING;
//     return {
//       x: (wx - dc.camX) * dc.zoom,
//       y: (wy - dc.camY) * dc.zoom
//     };
//   }

//   private drawConnectionLine(
//     ctx: CanvasRenderingContext2D,
//     x1: number, y1: number,
//     x2: number, y2: number,
//     r1: number, r2: number,
//     widthPx: number,
//     color: string
//   ): void {
//     const dx = x2 - x1;
//     const dy = y2 - y1;
//     const len = Math.hypot(dx, dy);
//     if (len === 0) return;

//     const ux = dx / len;
//     const uy = dy / len;

//     const sx = x1 + ux * r1;
//     const sy = y1 + uy * r1;
//     const ex = x2 - ux * r2;
//     const ey = y2 - uy * r2;

//     ctx.save();
//     ctx.strokeStyle = color;
//     ctx.lineWidth = widthPx;
//     ctx.beginPath();
//     ctx.moveTo(sx, sy);
//     ctx.lineTo(ex, ey);
//     ctx.stroke();
//     ctx.restore();
//   }

//   private drawPassiveNode(
//     ctx: CanvasRenderingContext2D,
//     sq: PositionedPassiveNode,
//     sx: number,
//     sy: number,
//     zoom: number,
//     hovered: boolean,
//     unlocked: boolean,
//     unlockable: boolean
//   ): void {
//     const r = this.nodeRadius(sq) * zoom;
//     const size = r * NODE_SIZE_FACTOR;
//     const { accentColor, primaryColor, disabledColor } = DEFAULT_CONFIG.general;

//     ctx.save();

//     if (hovered) {
//       ctx.strokeStyle = '#FFFFFF';
//       ctx.lineWidth = 5 * zoom;
//     } else if (unlocked) {
//       ctx.strokeStyle = accentColor;
//       ctx.lineWidth = 4 * zoom;
//     } else if (unlockable) {
//       ctx.strokeStyle = primaryColor;
//       ctx.lineWidth = 4 * zoom;
//     } else {
//       ctx.strokeStyle = disabledColor;
//       ctx.lineWidth = 3 * zoom;
//     }

//     ctx.beginPath();
//     ctx.arc(sx, sy, r, 0, Math.PI * 2);
//     ctx.stroke();

//     // Icon
//     const sprite = resolvePassiveIconSprite(sq.node.icon);
//     ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);

//     ctx.restore();
//   }
// }


// src/game/passives/ui/PassiveTreeUIRenderer.ts

import { DEFAULT_CONFIG } from '@/config/ui';
import type { PassiveTree } from '@/game/passives/interfaces/PassiveTree';
import type { PositionedPassiveNode } from '@/game/passives/interfaces/PositionedPassiveNode';
import { resolvePassiveIconSprite } from '@/game/passives/icons/passiveIconCache';

const NODE_SPACING = 64;          // pixels per grid cell (shared with controller)
const NODE_SIZE_FACTOR = 2.0;
const NODE_RADIUS_MAJOR = 40;
const NODE_RADIUS_MINOR = 28;

export interface RenderStyle {
  unlockedColor: string;
  unlockableColor: string;
  lockedColor: string;
  connectionWidthPx: number; // logical width at zoom=1; will be scaled by zoom
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  tree: PassiveTree;
  // camera (world->screen)
  camX: number;
  camY: number;
  zoom: number;
  // canvas dims
  canvasW: number;
  canvasH: number;
  // interaction state
  hoveredNodeId: string | null;
  isUnlocked: (id: string) => boolean;
  canUnlock: (id: string) => boolean;
}

const { general } = DEFAULT_CONFIG;
const defaultStyle: RenderStyle = {
  unlockedColor: general.accentColor,
  unlockableColor: general.primaryColor,
  lockedColor: general.disabledColor,
  connectionWidthPx: 4
};

export class PassiveTreeUIRenderer {
  // === Public ===

  render(dc: DrawContext, style: RenderStyle = defaultStyle): void {
    const { ctx, tree } = dc;
    ctx.save();

    // Build an O(1) id -> node index for edges & nodes
    const byId = new Map<string, PositionedPassiveNode>();
    for (const sq of tree.squares) byId.set(sq.node.id, sq);

    // 1) Connections (id-adjacency lists are canonicalized by the deserializer)
    for (const from of tree.squares) {
      const fromId = from.node.id;

      // Optional: draw only one direction to avoid double-drawing undirected edges
      for (const toId of from.connectedTo) {
        if (fromId > toId) continue;

        const to = byId.get(toId);
        if (!to) continue;

        const fromUnlocked = dc.isUnlocked(fromId);
        const toUnlocked = dc.isUnlocked(toId);
        const connColor =
          (fromUnlocked && toUnlocked)
            ? style.unlockedColor
            : ((fromUnlocked || toUnlocked) ? general.primaryColor : style.lockedColor);

        const { x: x1, y: y1 } = this.nodeWorldToScreen(from, dc);
        const { x: x2, y: y2 } = this.nodeWorldToScreen(to, dc);

        const r1 = this.nodeRadius(from) * dc.zoom;
        const r2 = this.nodeRadius(to) * dc.zoom;

        // Scale width by zoom for consistent perceived thickness
        this.drawConnectionLine(ctx, x1, y1, x2, y2, r1, r2, style.connectionWidthPx * dc.zoom, connColor);
      }
    }

    // 2) Nodes
    for (const sq of tree.squares) {
      const { x, y } = this.nodeWorldToScreen(sq, dc);
      const id = sq.node.id;

      // Frustum cull: expand by max radius
      const maxR = this.nodeRadius(sq) * dc.zoom + 6;
      if (x + maxR < 0 || y + maxR < 0 || x - maxR > dc.canvasW || y - maxR > dc.canvasH) continue;

      const hovered = dc.hoveredNodeId === id;
      const unlocked = dc.isUnlocked(id);
      const unlockable = dc.canUnlock(id) && !unlocked;

      this.drawPassiveNode(dc.ctx, sq, x, y, dc.zoom, hovered, unlocked, unlockable);
    }

    ctx.restore();
  }

  // === Hit testing (controller calls with world coords) ===
  public getNodeAtWorld(tree: PassiveTree, worldX: number, worldY: number): string | null {
    for (const sq of tree.squares) {
      const cx = sq.x * NODE_SPACING;
      const cy = sq.y * NODE_SPACING;
      const r = this.nodeRadius(sq);
      const dx = worldX - cx;
      const dy = worldY - cy;
      if (dx * dx + dy * dy <= r * r) return sq.node.id;
    }
    return null;
  }

  // === Helpers ===

  private nodeRadius(sq: PositionedPassiveNode): number {
    return sq.node.nodeSize === 'major' ? NODE_RADIUS_MAJOR : NODE_RADIUS_MINOR;
  }

  private nodeWorldToScreen(sq: PositionedPassiveNode, dc: DrawContext): { x: number; y: number } {
    const wx = sq.x * NODE_SPACING;
    const wy = sq.y * NODE_SPACING;
    return {
      x: (wx - dc.camX) * dc.zoom,
      y: (wy - dc.camY) * dc.zoom
    };
  }

  private drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    r1: number, r2: number,
    widthPx: number,
    color: string
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;

    const ux = dx / len;
    const uy = dy / len;

    // Trim to the per-node circle edges
    const sx = x1 + ux * r1;
    const sy = y1 + uy * r1;
    const ex = x2 - ux * r2;
    const ey = y2 - uy * r2;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx; // already scaled by zoom by caller
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  private drawPassiveNode(
    ctx: CanvasRenderingContext2D,
    sq: PositionedPassiveNode,
    sx: number,
    sy: number,
    zoom: number,
    hovered: boolean,
    unlocked: boolean,
    unlockable: boolean
  ): void {
    const r = this.nodeRadius(sq) * zoom;
    const size = r * NODE_SIZE_FACTOR;
    const { accentColor, primaryColor, disabledColor } = DEFAULT_CONFIG.general;

    ctx.save();

    if (hovered) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5 * zoom;
    } else if (unlocked) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * zoom;
    } else if (unlockable) {
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4 * zoom;
    } else {
      ctx.strokeStyle = disabledColor;
      ctx.lineWidth = 3 * zoom;
    }

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Icon
    const sprite = resolvePassiveIconSprite(sq.node.icon);
    ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);

    ctx.restore();
  }
}
