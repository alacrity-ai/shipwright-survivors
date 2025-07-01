const SIZE = 32;
const CENTER = SIZE / 2;

export function drawShipBlueprint(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // === Blueprint background ===
  const bgGradient = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, CENTER);
  bgGradient.addColorStop(0.0, '#002244');
  bgGradient.addColorStop(1.0, '#001122');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // === Cyan grid overlay ===
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
  ctx.lineWidth = 0.5;
  for (let i = 4; i < SIZE; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(SIZE, i);
    ctx.stroke();
  }

  // === Lithography circuit pattern ===
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 4;

  // Outer ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 10, 0, Math.PI * 2);
  ctx.stroke();

  // Radial branches
  for (let i = 0; i < 6; i++) {
    const angle = i * (Math.PI / 3);
    const x = CENTER + Math.cos(angle) * 10;
    const y = CENTER + Math.sin(angle) * 10;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Inner glyph lines
  ctx.beginPath();
  ctx.moveTo(CENTER - 4, CENTER - 4);
  ctx.lineTo(CENTER + 4, CENTER - 4);
  ctx.lineTo(CENTER + 4, CENTER + 4);
  ctx.lineTo(CENTER - 4, CENTER + 4);
  ctx.closePath();
  ctx.stroke();

  // Diagonal cross
  ctx.beginPath();
  ctx.moveTo(CENTER - 4, CENTER - 4);
  ctx.lineTo(CENTER + 4, CENTER + 4);
  ctx.moveTo(CENTER + 4, CENTER - 4);
  ctx.lineTo(CENTER - 4, CENTER + 4);
  ctx.stroke();

  ctx.shadowBlur = 0;

  return canvas;
}
