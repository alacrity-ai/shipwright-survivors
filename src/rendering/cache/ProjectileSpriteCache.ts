interface ProjectileSprite {
  canvas: HTMLCanvasElement;
  size: number;
}

const projectileSprites: Map<string, ProjectileSprite> = new Map();

export function initializeProjectileSprites() {
  // Configuration per projectile type
  const definitions = {
    bullet: { size: 18, color: '#fff' },
    missile: { size: 14, color: '#f80' },
  };

  for (const [type, def] of Object.entries(definitions)) {
    const canvas = document.createElement('canvas');
    canvas.width = def.size;
    canvas.height = def.size;
    const ctx = canvas.getContext('2d')!;

  if (type === 'bullet') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(
      def.size / 2,         // center x
      def.size / 2,         // center y
      def.size / 2.5,       // radius
      0,
      Math.PI * 2
    );
    ctx.fill();
  } else if (type === 'missile') {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(def.size / 2, def.size / 2, def.size / 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    projectileSprites.set(type, {
      canvas,
      size: def.size,
    });
  }
}

export function getProjectileSprite(type: string): HTMLCanvasElement {
  const sprite = projectileSprites.get(type);
  if (!sprite) throw new Error(`Missing sprite for projectile type: ${type}`);
  return sprite.canvas;
}

export function getProjectileSize(type: string): number {
  const sprite = projectileSprites.get(type);
  if (!sprite) throw new Error(`Missing size for projectile type: ${type}`);
  return sprite.size;
}
