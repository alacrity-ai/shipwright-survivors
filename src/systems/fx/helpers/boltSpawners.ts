// ────────────────────────────────────────────────────────────────────────────────
//  src/systems/fx/helpers/boltSpawners.ts
//  GC-neutral chain-lightning & laser prefabs – event-driven version.
// ────────────────────────────────────────────────────────────────────────────────
import { spawnLightningBolt } from '@/core/interfaces/events/SpecialFxReporter';

/* module-private scratch */
const vStart = { x: 0, y: 0 };
const vEnd   = { x: 0, y: 0 };
const faintRGBA: [number, number, number, number] = [0, 0, 0, 0.35];

/**
 * Emit a primary lightning bolt plus two faint secondaries with zero allocations.
 */
export function spawnBolts1(
  x1  : number,
  y1  : number,
  x2  : number,
  y2  : number,
  rgba: Readonly<[number, number, number, number]> = [0.25, 0.9, 1.0, 1.0],
): void {
  vStart.x = x1; vStart.y = y1;
  vEnd.x   = x2; vEnd.y   = y2;

  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  faintRGBA[0] = rgba[0];
  faintRGBA[1] = rgba[1];
  faintRGBA[2] = rgba[2];

  /* ─── primary bolt ─── */
  spawnLightningBolt({
    start: vStart,
    end:   vEnd,
    opts: {
      lifetime      : 0.40,
      thickness     : 4.0,
      subdivision   : 5,
      color         : rgba as [number, number, number, number],
      jitter        : 0.15,
      lightRadius   : len,
      lightIntensity: 1.6,
    },
  });

  /* ─── secondary bolts ─── */
  for (let i = 0; i < 2; ++i) {
    spawnLightningBolt({
      start: vStart,
      end:   vEnd,
      opts: {
        lifetime      : 0.35 + Math.random() * 0.05,
        thickness     : 2.5,
        subdivision   : 5,
        color         : faintRGBA,
        jitter        : 0.1 + Math.random() * 0.1,
        lightRadius   : len * 0.8,
        lightIntensity: 0.6,
      },
    });
  }
}

/**
 * Emits a focused laser-like bolt: narrow, straight, and short-lived.
 * Suitable for beam weapons or high-precision tech visuals.
 */
export function spawnLaserBeam(
  x1  : number,
  y1  : number,
  x2  : number,
  y2  : number,
  rgba: Readonly<[number, number, number, number]> = [0.25, 0.9, 1.0, 1.0],
): void {
  vStart.x = x1; vStart.y = y1;
  vEnd.x   = x2; vEnd.y   = y2;

  const dx  = x2 - x1;
  const dy  = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  faintRGBA[0] = rgba[0];
  faintRGBA[1] = rgba[1];
  faintRGBA[2] = rgba[2];

  /* ───── primary beam ───── */
  spawnLightningBolt({
    start: vStart,
    end:   vEnd,
    opts: {
      lifetime      : 0.25,
      thickness     : 5.0,
      subdivision   : 2,
      color         : rgba as [number, number, number, number],
      jitter        : 0.03,
      lightRadius   : len * 0.9,
      lightIntensity: 1.6,
    },
  });

  /* ───── faint afterimage ───── */
  for (let i = 0; i < 2; ++i) {
    spawnLightningBolt({
      start: vStart,
      end:   vEnd,
      opts: {
        lifetime      : 0.20 + Math.random() * 0.02,
        thickness     : 2.0,
        subdivision   : 4,
        color         : faintRGBA,
        jitter        : 0.01 + Math.random() * 0.02,
        lightRadius   : len * 0.6,
        lightIntensity: 0.6,
      },
    });
  }
}
