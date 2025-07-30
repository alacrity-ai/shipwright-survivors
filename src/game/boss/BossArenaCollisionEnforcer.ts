import { GlobalEventBus } from '@/core/EventBus';
import { ShipRegistry } from '@/game/ship/ShipRegistry';
import type { BossArenaOptions } from '@/rendering/unified/controllers/BossArenaRenderingController';

export class BossArenaCollisionEnforcer {
  private center: [number, number] = [0, 0];
  private radius: number = 0;
  private isActive: boolean = false;

  // Reused scratch position (avoids object churn)
  private readonly scratchPosition = { x: 0, y: 0 };

  constructor() {
    GlobalEventBus.on('bossArena:spawn', this.handleArenaSpawn);
  }

  private handleArenaSpawn = (opts: BossArenaOptions): void => {
    this.center = opts.center;
    this.radius = opts.radius;
    this.isActive = true;
  };

  public update(dt: number): void {
    console.log('[BossArenaCollisionEnforcer] Updating...');
    if (!this.isActive) return;

    const playerShip = ShipRegistry.getInstance().getPlayerShip();
    if (!playerShip) return;

    console.log('[BossArenaCollisionEnforcer] Player ship found.');
    const transform = playerShip.getTransform();
    const pos = transform.position;
    const dx = pos.x - this.center[0];
    const dy = pos.y - this.center[1];
    const distSq = dx * dx + dy * dy;
    const radiusSq = this.radius * this.radius;

    if (distSq > radiusSq) {
      console.log('[BossArenaCollisionEnforcer] Player ship outside arena.');
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      // Write directly into scratchPosition
      this.scratchPosition.x = this.center[0] + nx * (this.radius - 1);
      this.scratchPosition.y = this.center[1] + ny * (this.radius - 1);

      // Mutate transform before passing to setter (optional)
      transform.position.x = this.scratchPosition.x;
      transform.position.y = this.scratchPosition.y;

      playerShip.setTransform(transform); // No new allocation
    }
  }

  public disable(): void {
    this.isActive = false;
  }

  public destroy(): void {
    GlobalEventBus.off('bossArena:spawn', this.handleArenaSpawn);
  }
}
