import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';
import type { GridCoord } from '@/game/interfaces/types/GridCoord';

interface Explosion {
  position: { x: number; y: number };
  size: number;
  maxSize: number;
  life: number;
  maxLife: number;
  color: string;
  sparks: Spark[];
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

export class ExplosionSystem {
  private explosions: Explosion[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly camera: Camera
  ) {
    this.ctx = canvasManager.getContext('fx');
  }

  // Create an explosion at the given world position
  createExplosion(position: { x: number; y: number }, size: number = 60, life: number = 0.6): void {
    const sparks = this.generateSparks(position, size * 0.8, 10 + Math.floor(size / 10));
    
    this.explosions.push({
      position: { ...position },
      size: 1, // Start small and grow
      maxSize: size,
      life,
      maxLife: life,
      color: this.getRandomExplosionColor(),
      sparks
    });
  }

  // Create an explosion at a block's position within a ship
  createBlockExplosion(
    shipPosition: { x: number; y: number },
    shipRotation: number,
    blockCoord: GridCoord,
    size: number = 70, // Increased size
    life: number = 0.7  // Increased life
  ): void {
    const BLOCK_SIZE = 32;
    
    // Calculate block position in local ship space
    const localX = blockCoord.x * BLOCK_SIZE;
    const localY = blockCoord.y * BLOCK_SIZE;
    
    // Rotate to match ship orientation
    const cos = Math.cos(shipRotation);
    const sin = Math.sin(shipRotation);
    const rotatedX = localX * cos - localY * sin;
    const rotatedY = localX * sin + localY * cos;
    
    // Convert to world position
    const worldX = shipPosition.x + rotatedX;
    const worldY = shipPosition.y + rotatedY;
    
    // Create the explosion
    this.createExplosion({ x: worldX, y: worldY }, size, life);
  }

  // Generate sparks for an explosion
  private generateSparks(position: { x: number; y: number }, maxDistance: number, count: number): Spark[] {
    const sparks: Spark[] = [];
    const sparkColors = ['#ffff00', '#ff9900', '#ff6600', '#ff3300', '#ffffff'];
    
    for (let i = 0; i < count; i++) {
      // Random angle and distance
      const angle = Math.random() * Math.PI * 2;
      const distance = maxDistance * (0.3 + Math.random() * 0.7);
      
      // Calculate velocity
      const speed = 50 + Math.random() * 150;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      // Random life and size
      const life = 0.3 + Math.random() * 0.7;
      const size = 1 + Math.random() * 3;
      
      sparks.push({
        x: position.x,
        y: position.y,
        vx,
        vy,
        size,
        life,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)]
      });
    }
    
    return sparks;
  }

  update(dt: number): void {
    for (const explosion of this.explosions) {
      // Update life
      explosion.life -= dt;
      
      // Grow the explosion until it reaches max size
      const progress = 1 - (explosion.life / explosion.maxLife);
      if (progress < 0.5) {
        // Grow phase (0-50% of life)
        explosion.size = explosion.maxSize * (progress * 2);
      } else {
        // Shrink phase (50-100% of life)
        explosion.size = explosion.maxSize * (1 - (progress - 0.5) * 2);
      }
      
      // Update sparks
      for (const spark of explosion.sparks) {
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.life -= dt;
        
        // Add gravity effect to sparks
        spark.vy += 50 * dt;
      }
      
      // Remove dead sparks
      explosion.sparks = explosion.sparks.filter(s => s.life > 0);
    }
    
    // Remove dead explosions
    this.explosions = this.explosions.filter(e => e.life > 0);
  }

  render(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.camera.zoom, this.camera.zoom);
    
    for (const explosion of this.explosions) {
      const screen = this.camera.worldToScreen(explosion.position.x, explosion.position.y);
      const x = screen.x / this.camera.zoom;
      const y = screen.y / this.camera.zoom;
      
      // Create a radial gradient for the explosion
      const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, explosion.size
      );
      
      // Calculate alpha based on remaining life
      const alpha = explosion.life / explosion.maxLife;
      
      gradient.addColorStop(0, `rgba(255, 255, 200, ${alpha})`);
      gradient.addColorStop(0.2, `${explosion.color}`);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, explosion.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Render sparks
      for (const spark of explosion.sparks) {
        const sparkScreen = this.camera.worldToScreen(spark.x, spark.y);
        const sparkX = sparkScreen.x / this.camera.zoom;
        const sparkY = sparkScreen.y / this.camera.zoom;
        
        const sparkAlpha = spark.life * 0.8;
        ctx.globalAlpha = sparkAlpha;
        ctx.fillStyle = spark.color;
        
        // Draw spark as a small circle
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, spark.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add a glow effect
        const sparkGlow = ctx.createRadialGradient(
          sparkX, sparkY, 0,
          sparkX, sparkY, spark.size * 2
        );
        sparkGlow.addColorStop(0, `rgba(255, 255, 200, ${sparkAlpha * 0.7})`);
        sparkGlow.addColorStop(1, 'rgba(255, 255, 200, 0)');
        
        ctx.fillStyle = sparkGlow;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, spark.size * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    ctx.restore();
  }

  private getRandomExplosionColor(): string {
    const colors = [
      'rgba(255, 100, 0, 0.8)',  // Orange
      'rgba(255, 50, 0, 0.8)',   // Red-orange
      'rgba(255, 200, 0, 0.8)',  // Yellow-orange
      'rgba(200, 0, 0, 0.8)'     // Deep red
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
}
