// import type { CanvasManager } from '@/core/CanvasManager';
// import type { Camera } from '@/core/Camera';

// export interface ThrusterParticle {
//   position: { x: number; y: number };
//   velocity: { x: number; y: number };
//   color: string;
//   size: number;
//   life: number;
// }

// export class ThrusterParticleSystem {
//   private particles: ThrusterParticle[] = [];
//   private ctx: CanvasRenderingContext2D;

//   constructor(
//     canvasManager: CanvasManager,
//     private readonly camera: Camera
//   ) {
//     this.ctx = canvasManager.getContext('fx');
//   }

//   spawn(p: ThrusterParticle) {
//     this.particles.push({ ...p });
//   }

//   update(dt: number) {
//     for (const p of this.particles) {
//       p.position.x += p.velocity.x * dt;
//       p.position.y += p.velocity.y * dt;
//       p.life -= dt;
//     }

//     this.particles = this.particles.filter(p => p.life > 0);
//   }

//   render() {
//     const ctx = this.ctx;
//     ctx.save();
//     ctx.globalAlpha = 1;
//     ctx.scale(this.camera.zoom, this.camera.zoom);

//     for (const p of this.particles) {
//       const screen = this.camera.worldToScreen(p.position.x, p.position.y);
//       // Divide size by zoom so size stays visually consistent
//       const radius = p.size;

//       ctx.fillStyle = p.color;
//       ctx.beginPath();
//       ctx.arc(screen.x / this.camera.zoom, screen.y / this.camera.zoom, radius, 0, Math.PI * 2);
//       ctx.fill();
//     }

//     ctx.restore();
//   }
// }

// export function randomFlameColor(): string {
//   return Math.random() < 0.3 ? '#fff' : Math.random() < 0.5 ? '#f90' : '#ff0';
// }
