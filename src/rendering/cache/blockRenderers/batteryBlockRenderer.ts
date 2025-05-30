export function renderBatteryModule(
  ctx: CanvasRenderingContext2D,
  blockSize: number,
  config?: {
    chassisStops?: [number, string][],
    cellGlowStops?: [number, string][],
    coreRadius?: number,
    terminalColor?: string,
    terminalSize?: number
  }
): void {
  const cx = blockSize / 2;
  const cy = blockSize / 2;

  // === Chassis Gradient (vertical)
  const chassisGradient = ctx.createLinearGradient(0, 0, 0, blockSize);
  (config?.chassisStops ?? [
    [0, '#222831'],
    [0.5, '#393E46'],
    [1, '#1E1E2F']
  ]).forEach(([stop, color]) => chassisGradient.addColorStop(stop, color));
  ctx.fillStyle = chassisGradient;
  ctx.fillRect(0, 0, blockSize, blockSize);

  // === Internal Charge Glow (central radial pulse)
  const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, config?.coreRadius ?? blockSize * 0.4);
  (config?.cellGlowStops ?? [
    [0, '#C8E6C9'],
    [0.5, '#81C784'],
    [1, 'rgba(129, 199, 132, 0)']
  ]).forEach(([stop, color]) => glowGradient.addColorStop(stop, color));
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(cx, cy, config?.coreRadius ?? blockSize * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // === Terminals (top/bottom nodes)
  ctx.fillStyle = config?.terminalColor ?? '#B0BEC5';
  const ts = config?.terminalSize ?? 3;
  ctx.fillRect(cx - ts / 2, 2, ts, 6); // top terminal
  ctx.fillRect(cx - ts / 2, blockSize - 8, ts, 6); // bottom terminal

  // === Inner Voltage Ring (capacitor visual)
  ctx.strokeStyle = '#A5D6A7';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, blockSize * 0.25, 0, Math.PI * 2);
  ctx.stroke();
}
