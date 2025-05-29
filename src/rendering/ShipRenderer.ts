// import { Ship } from '@/game/ship/Ship'; 
// import { getBlockSprite } from '@/rendering/cache/BlockSpriteCache'; 
// import { BLOCK_SIZE } from '@/game/blocks/BlockRegistry'; 
// import { CanvasManager } from '@/core/CanvasManager'; 
// import { Camera } from '@/core/Camera'; 
// import { getMousePosition } from '@/core/Input'; 
// import type { BlockInstance } from '@/game/interfaces/entities/BlockInstance';
 
// interface RenderOptions { 
//   worldPosition: { x: number; y: number }; // world coordinates 
//   rotation?: number;                       // radians (pivot around cockpit) 
// } 

// interface DamageEffect {
//   opacity: number;     // 0.0 to 1.0
//   tint: string;        // color overlay
//   shake: number;       // shake intensity 0-1
// }

// export class ShipRenderer { 
//   private ctx: CanvasRenderingContext2D; 
 
//   constructor( 
//     canvasManager: CanvasManager, 
//     private readonly camera: Camera 
//   ) { 
//     this.ctx = canvasManager.getContext('entities'); 
//   }

//   /**
//    * Calculate damage effects based on block health percentage
//    */
//   private calculateDamageEffect(block: BlockInstance): DamageEffect | null {
//     const maxHp = block.type.armor ?? 1;
//     const healthPercent = Math.max(0, block.hp / maxHp);
    
//     // No damage effects if above 75% health
//     if (healthPercent > 0.75) {
//       return null;
//     }
    
//     // Calculate damage intensity (0 = healthy, 1 = near death)
//     const damageIntensity = 1 - healthPercent;
    
//     return {
//       opacity: Math.max(0.3, 1 - damageIntensity * 0.7), // Fade from 1.0 to 0.3
//       tint: `rgba(255, 0, 0, ${damageIntensity * 0.4})`, // Red overlay gets stronger
//       shake: damageIntensity * 2 // Shake up to 2 pixels when near death
//     };
//   }

//   /**
//    * Apply damage visual effects to the canvas context
//    */
//   private applyDamageEffects(effect: DamageEffect, time: number = Date.now()): void {
//     // Apply opacity fade
//     this.ctx.globalAlpha *= effect.opacity;
    
//     // Apply shake effect (subtle random offset)
//     if (effect.shake > 0) {
//       const shakeX = (Math.sin(time * 0.01) * effect.shake);
//       const shakeY = (Math.cos(time * 0.007) * effect.shake);
//       this.ctx.translate(shakeX, shakeY);
//     }
    
//     // Apply color tint overlay (will be applied after drawing)
//     this.ctx.globalCompositeOperation = 'source-over';
//   }

//   /**
//    * Draw damage overlay effects (cracks, sparks, etc.)
//    */
//   private renderDamageOverlay(effect: DamageEffect, blockSize: number): void {
//     const damageIntensity = 1 - effect.opacity;
    
//     // Draw crack patterns for heavily damaged blocks
//     if (damageIntensity > 0.5) {
//       this.ctx.strokeStyle = 'rgba(60, 60, 60, 0.8)';
//       this.ctx.lineWidth = 1;
//       this.ctx.beginPath();
      
//       // Diagonal cracks
//       const halfSize = blockSize / 2;
//       this.ctx.moveTo(-halfSize * 0.8, -halfSize * 0.6);
//       this.ctx.lineTo(halfSize * 0.6, halfSize * 0.8);
//       this.ctx.moveTo(-halfSize * 0.6, halfSize * 0.8);
//       this.ctx.lineTo(halfSize * 0.8, -halfSize * 0.6);
      
//       this.ctx.stroke();
//     }
    
//     // Red damage tint overlay
//     this.ctx.fillStyle = effect.tint;
//     this.ctx.fillRect(-blockSize / 2, -blockSize / 2, blockSize, blockSize);
//   }
 
//   render(ship: Ship, options: RenderOptions) { 
//     const rotation = options.rotation ?? 0; 
//     const currentTime = Date.now();
 
//     const screen = this.camera.worldToScreen( 
//       options.worldPosition.x, 
//       options.worldPosition.y 
//     ); 
 
//     this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height); 
 
//     this.ctx.save(); 
//     this.ctx.translate(screen.x, screen.y); 
//     this.ctx.scale(this.camera.zoom, this.camera.zoom); 
//     this.ctx.rotate(rotation); 
 
//     // First pass: render base blocks with damage effects
//     for (const [coord, block] of ship.getAllBlocks()) { 
//       const sprite = getBlockSprite(block.type.id); 
//       const px = coord.x * BLOCK_SIZE; 
//       const py = coord.y * BLOCK_SIZE; 
//       const blockRotation = (block.rotation ?? 0) * (Math.PI / 180); 
//       const damageEffect = this.calculateDamageEffect(block);
 
//       this.ctx.save(); 
//       this.ctx.translate(px, py); 
//       this.ctx.rotate(blockRotation); 
      
//       // Apply damage effects if block is damaged
//       if (damageEffect) {
//         this.applyDamageEffects(damageEffect, currentTime);
//       }
      
//       // Draw the base block
//       this.ctx.drawImage( 
//         sprite.base, 
//         -BLOCK_SIZE / 2, 
//         -BLOCK_SIZE / 2, 
//         BLOCK_SIZE, 
//         BLOCK_SIZE 
//       ); 
      
//       // Draw damage overlay effects
//       if (damageEffect) {
//         this.renderDamageOverlay(damageEffect, BLOCK_SIZE);
//       }
      
//       this.ctx.restore(); 
//     } 
 
//     // Second pass: overlays (turret barrels) - also with damage effects
//     const mouseScreen = getMousePosition(); 
//     const mouseWorld = this.camera.screenToWorld(mouseScreen.x, mouseScreen.y); 
 
//     for (const [coord, block] of ship.getAllBlocks()) { 
//       const sprite = getBlockSprite(block.type.id); 
//       if (!sprite.overlay) continue; 
      
//       const damageEffect = this.calculateDamageEffect(block);
 
//       const localX = coord.x * BLOCK_SIZE; 
//       const localY = coord.y * BLOCK_SIZE; 
 
//       const worldX = options.worldPosition.x + coord.x * BLOCK_SIZE; 
//       const worldY = options.worldPosition.y + coord.y * BLOCK_SIZE; 
 
//       const dx = mouseWorld.x - worldX; 
//       const dy = mouseWorld.y - worldY; 
//       const globalAngle = Math.atan2(dy, dx); 
//       const localAngle = globalAngle - rotation + Math.PI / 2; 
 
//       this.ctx.save(); 
//       this.ctx.translate(localX, localY); 
//       this.ctx.rotate(localAngle); 
      
//       // Apply damage effects to overlay as well
//       if (damageEffect) {
//         this.applyDamageEffects(damageEffect, currentTime);
//       }
      
//       this.ctx.drawImage( 
//         sprite.overlay, 
//         -BLOCK_SIZE / 2, 
//         -BLOCK_SIZE / 2, 
//         BLOCK_SIZE, 
//         BLOCK_SIZE 
//       ); 
//       this.ctx.restore(); 
//     } 
 
//     this.ctx.restore(); 
//   } 
// }