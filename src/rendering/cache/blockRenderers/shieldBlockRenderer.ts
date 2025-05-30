export function renderShieldGenerator(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    chassisStops?: [number, string][],
    emitterGlowStops?: [number, string][],
    emitterRadius?: number,
    ringColor?: string,
    terminalColor?: string
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;

  // === Outer Chassis (vertical gradient)
  const chassisGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  (config?.chassisStops ?? [
    [0, '#1A1A2E'],
    [0.5, '#16213E'],
    [1, '#0F3460']
  ]).forEach(([stop, color]) => chassisGradient.addColorStop(stop, color));
  ctx.fillStyle = chassisGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Central Shield Emitter Glow (radial core)
  const emitterGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, config?.emitterRadius ?? blockSize * 0.35);
  (config?.emitterGlowStops ?? [
    [0, '#BBDEFB'],
    [0.5, '#42A5F5'],
    [1, 'rgba(66, 165, 245, 0)']
  ]).forEach(([stop, color]) => emitterGradient.addColorStop(stop, color));
  ctx.fillStyle = emitterGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, config?.emitterRadius ?? blockSize * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // === Shield Projection Ring
  ctx.strokeStyle = config?.ringColor ?? '#90CAF9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, blockSize * 0.38, 0, Math.PI * 2);
  ctx.stroke();

  // === Terminals (emission ports or field nodes)
  ctx.fillStyle = config?.terminalColor ?? '#E3F2FD';
  ctx.fillRect(cx - 1.5, 2, 3, 5); // top
  ctx.fillRect(cx - 1.5, blockSize - 7, 3, 5); // bottom
  ctx.fillRect(2, cy - 1.5, 5, 3); // left
  ctx.fillRect(blockSize - 7, cy - 1.5, 5, 3); // right
}
