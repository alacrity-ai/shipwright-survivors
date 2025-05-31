export function renderHarvester(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    intakeColor?: string;
    casingStops?: [number, string][];
    vortexColor?: string;
    ringColor?: string;
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;
  const r = blockSize * 0.45;

  // === Outer Casing ===
  const casingGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  (config?.casingStops ?? [
    [0, '#3E3E3E'],
    [0.5, '#555555'],
    [1, '#222222']
  ]).forEach(([stop, color]) => casingGradient.addColorStop(stop, color));

  ctx.fillStyle = casingGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Vortex Core Glow (faint suction pulse)
  const vortexGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.8);
  vortexGradient.addColorStop(0, config?.vortexColor ?? '#66ccff');
  vortexGradient.addColorStop(1, 'rgba(102, 204, 255, 0)');
  ctx.fillStyle = vortexGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // === Central Intake Core
  ctx.fillStyle = config?.intakeColor ?? '#00B8D4';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // === Intake Rings (implies suction)
  ctx.strokeStyle = config?.ringColor ?? 'rgba(0, 200, 255, 0.4)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * (0.4 + 0.15 * i), 0, Math.PI * 2);
    ctx.stroke();
  }
}
