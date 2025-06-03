import { addAlphaToHex } from '@/shared/colorUtils';

interface CRTBoxStyle {
  backgroundColor?: string;
  borderColor?: string;
  glow?: boolean;
  scanlineIntensity?: number; // 0 to 1
  cornerBevel?: boolean;
  chromaticAberration?: boolean;
}

export function drawCRTBox(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    style?: CRTBoxStyle;
  }
): void {
  const {
    x, y, width, height,
    style = {}
  } = opts;

  const {
    backgroundColor = '#0a0a0a',
    borderColor = '#00ff41',
    glow = true,
    scanlineIntensity = 0.3,
    cornerBevel = true,
    chromaticAberration = true,
  } = style;

  const bevelSize = Math.min(3, height * 0.2);

  ctx.save();

  // === Shape setup ===
  if (cornerBevel) {
    ctx.beginPath();
    ctx.moveTo(x + bevelSize, y);
    ctx.lineTo(x + width - bevelSize, y);
    ctx.lineTo(x + width, y + bevelSize);
    ctx.lineTo(x + width, y + height - bevelSize);
    ctx.lineTo(x + width - bevelSize, y + height);
    ctx.lineTo(x + bevelSize, y + height);
    ctx.lineTo(x, y + height - bevelSize);
    ctx.lineTo(x, y + bevelSize);
    ctx.closePath();
    ctx.clip();
  }

  // === Background ===
  const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
  bgGradient.addColorStop(0, addAlphaToHex(backgroundColor, 'ff'));
  bgGradient.addColorStop(0.5, addAlphaToHex(backgroundColor, 'cc'));
  bgGradient.addColorStop(1, addAlphaToHex(backgroundColor, 'ff'));
  ctx.fillStyle = bgGradient;
  ctx.fillRect(x, y, width, height);

  // === Scanlines ===
  if (scanlineIntensity > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${scanlineIntensity * 0.05})`;
    for (let i = 0; i < height; i += 2) {
      ctx.fillRect(x, y + i, width, 1);
    }
  }

  ctx.restore();

  // === Glow border ===
  if (glow) {
    ctx.save();
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    if (cornerBevel) {
      ctx.beginPath();
      ctx.moveTo(x + bevelSize, y);
      ctx.lineTo(x + width - bevelSize, y);
      ctx.lineTo(x + width, y + bevelSize);
      ctx.lineTo(x + width, y + height - bevelSize);
      ctx.lineTo(x + width - bevelSize, y + height);
      ctx.lineTo(x + bevelSize, y + height);
      ctx.lineTo(x, y + height - bevelSize);
      ctx.lineTo(x, y + bevelSize);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, width, height);
    }
    ctx.restore();
  }

  // === Chromatic Aberration Border Pass ===
  if (chromaticAberration) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1;

    ctx.strokeStyle = '#ff0000';
    ctx.strokeRect(x - 0.5, y, width, height);

    ctx.strokeStyle = '#0000ff';
    ctx.strokeRect(x + 0.5, y, width, height);

    ctx.restore();
  }

  // === Final overlay inner highlight ===
  ctx.save();
  ctx.strokeStyle = `${borderColor}40`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1, y + 1, width - 2, height - 2);
  ctx.restore();
}
