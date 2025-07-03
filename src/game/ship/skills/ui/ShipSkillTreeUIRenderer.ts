import { DEFAULT_CONFIG } from '@/config/ui';

import type { StarterShipSkillTree } from '@/game/ship/skills/interfaces/StarterShipSkillTree';
import type { PositionedSkillNode } from '@/game/ship/skills/interfaces/PositionedSkillNode';
import type { NavPoint } from '@/core/input/interfaces/NavMap';

import { resolveSkillTreeIconSprite } from '@/game/ship/skills/icons/StarterShipSkillIconSpriteCache';
import { PlayerShipSkillTreeManager } from '@/game/player/PlayerShipSkillTreeManager';

const NODE_SPACING = 64; // pixels per grid cell
const NODE_SIZE_FACTOR = 2.0;
const NODE_RADIUS_MAJOR = 40;
const NODE_RADIUS_MINOR = 28;

export class ShipSkillTreeUIRenderer {
  renderTree(
    ctx: CanvasRenderingContext2D,
    tree: StarterShipSkillTree,
    selectedNodeSet: Set<string>,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    scale: number,
    hoveredNodeId: string | null,
    shipId: string
  ): void {
    ctx.save();
    const skillTreeManager = PlayerShipSkillTreeManager.getInstance();

    const selectedCount = skillTreeManager.getSelectedCount(shipId);
    const maxReached = selectedCount >= tree.maxSelectableNodes;

    // === Render edges ===
    for (const positionedNode of tree.nodes) {
      const fromNode = positionedNode.node;
      const fromUnlocked = skillTreeManager.hasNode(shipId, fromNode.id);
      const start = this.getNodeScreenPosition(positionedNode, x1, y1, scale);

      for (const targetId of positionedNode.connectedTo) {
        const targetNode = tree.nodes.find(n => n.node.id === targetId);
        if (!targetNode) continue;

        const end = this.getNodeScreenPosition(targetNode, x1, y1, scale);
        const toUnlocked = skillTreeManager.hasNode(shipId, targetId);

        const style = this.resolveConnectionStyle(fromUnlocked, toUnlocked, maxReached);

        const fromRadius = fromNode.nodeSize === 'major'
          ? NODE_RADIUS_MAJOR * scale
          : NODE_RADIUS_MINOR * scale;

        const toRadius = targetNode.node.nodeSize === 'major'
          ? NODE_RADIUS_MAJOR * scale
          : NODE_RADIUS_MINOR * scale;

        this.drawConnectionLine(
          ctx,
          start.x,
          start.y,
          end.x,
          end.y,
          scale,
          style,
          fromRadius,
          toRadius
        );
      }
    }

    // === Render nodes ===
    for (const positionedNode of tree.nodes) {
      const { node } = positionedNode;
      const screen = this.getNodeScreenPosition(positionedNode, x1, y1, scale);
      const isSelected = selectedNodeSet.has(node.id);
      const isHovered = node.id === hoveredNodeId;
      const isUnlocked = skillTreeManager.hasNode(shipId, node.id);
      const isUnlockable = skillTreeManager.canAcquireNode(shipId, node.id);

      this.drawSkillNode(ctx, node, screen.x, screen.y, scale, {
        selected: isSelected,
        hovered: isHovered,
        unlocked: isUnlocked,
        unlockable: isUnlockable && !isUnlocked,
      });
    }

    ctx.restore();
  }

  getHoveredNodeId(
    mouseX: number,
    mouseY: number,
    tree: StarterShipSkillTree,
    x1: number,
    y1: number,
    scale: number
  ): string | null {
    for (const positionedNode of tree.nodes) {
      const { node } = positionedNode;
      const { x, y } = this.getNodeScreenPosition(positionedNode, x1, y1, scale);
      const radius = node.nodeSize === 'major'
        ? NODE_RADIUS_MAJOR * scale
        : NODE_RADIUS_MINOR * scale;

      const dx = mouseX - x;
      const dy = mouseY - y;
      if (dx * dx + dy * dy <= radius * radius) {
        return node.id;
      }
    }

    return null;
  }

  getNodeScreenPosition(
    positionedNode: PositionedSkillNode,
    x1: number,
    y1: number,
    scale: number
  ): { x: number; y: number } {
    return {
      x: x1 + positionedNode.x * NODE_SPACING * scale,
      y: y1 + positionedNode.y * NODE_SPACING * scale,
    };
  }

  public getNavPoints(
    tree: StarterShipSkillTree,
    x1: number,
    y1: number,
    scale: number
  ): NavPoint[] {
    return tree.nodes.map((positionedNode) => {
      const { node, x, y } = positionedNode;

      const screenPos = this.getNodeScreenPosition(positionedNode, x1, y1, scale);

      return {
        gridX: x,
        gridY: y,
        screenX: screenPos.x,
        screenY: screenPos.y,
        isEnabled: true,
      };
    });
  }

  private resolveConnectionStyle(
    fromUnlocked: boolean,
    toUnlocked: boolean,
    maxReached: boolean
  ): { color: string; widthMultiplier: number } {
    const { primaryColor, hoverColor, accentColor, disabledColor } = DEFAULT_CONFIG.general;

    if (fromUnlocked && toUnlocked) {
      // Always green if both ends are unlocked
      return { color: accentColor, widthMultiplier: 4 };
    }

    if ((fromUnlocked || toUnlocked) && !maxReached) {
      // White if partially unlocked and player can still unlock more
      return { color: primaryColor, widthMultiplier: 4 };
    }

    // Otherwise (locked-locked, or max reached): gray
    return { color: disabledColor, widthMultiplier: 4 };
  }

  private drawConnectionLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    scale: number,
    style: { color: string; widthMultiplier: number },
    radius1: number,
    radius2: number
  ): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;

    const ux = dx / len;
    const uy = dy / len;

    const sx = x1 + ux * radius1;
    const sy = y1 + uy * radius1;
    const ex = x2 - ux * radius2;
    const ey = y2 - uy * radius2;

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.widthMultiplier * scale;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
  }

  private drawSkillNode(
    ctx: CanvasRenderingContext2D,
    node: PositionedSkillNode['node'],
    x: number,
    y: number,
    scale: number,
    {
      selected,
      hovered,
      unlocked,
      unlockable,
    }: {
      selected: boolean;
      hovered: boolean;
      unlocked: boolean;
      unlockable: boolean;
    }
  ): void {
    const sprite = resolveSkillTreeIconSprite(node.icon);
    const radius = node.nodeSize === 'major'
      ? NODE_RADIUS_MAJOR * scale
      : NODE_RADIUS_MINOR * scale;
    const size = radius * NODE_SIZE_FACTOR;
    const { hoverColor, accentColor, primaryColor, disabledColor } = DEFAULT_CONFIG.general;

    ctx.save();

    if (hovered) {
      ctx.strokeStyle = hoverColor;
      ctx.lineWidth = 4 * scale;
    } else if (unlocked) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * scale;
    } else if (selected) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * scale;
    } else if (unlockable) {
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 4 * scale;
    } else {
      ctx.strokeStyle = disabledColor;
      ctx.lineWidth = 4 * scale;
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.drawImage(
      sprite,
      x - size / 2,
      y - size / 2,
      size,
      size
    );
  }
}
