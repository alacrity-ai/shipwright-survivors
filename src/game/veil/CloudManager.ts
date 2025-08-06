// src/systems/fx/CloudManager.ts

import { setCloudParamsFront, setCloudParamsBack } from '@/core/interfaces/events/SpecialFxReporter';
import { reportDialogueLine, clearDialogueEvents } from '@/core/interfaces/events/DialogueReporter';
import { flags } from '@/game/player/PlayerFlagManager';

export type Vec2 = { x: number; y: number };

export type CloudParams = {
  speed?: number;
  density?: number;
  quantity?: number;
  scale?: number;
  alpha?: number;
  color?: [number, number, number];
};

export type CloudRegion = {
  id: string;
  center: Vec2;
  radius: number;
  frontParams: CloudParams;
  backParams: CloudParams;
};

function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class CloudManager {
  private readonly ship: { getTransform: () => { position: Vec2 } };
  private readonly regions: CloudRegion[];

  private readonly regionCoordsBuffer: { x: number; y: number; radius: number }[] = [];

  private currentRegion: CloudRegion | null = null;

  private alphaFront: number = 0;
  private alphaBack: number = 0;

  private lastEmittedFrontAlpha: number = -1;
  private lastEmittedBackAlpha: number = -1;

  private readonly FADE_SPEED = 2.0;
  private static readonly EPSILON = 0.001;
  private dialoguePlayed = false;

  constructor(ship: { getTransform: () => { position: Vec2 } }, regions: CloudRegion[]) {
    this.ship = ship;
    this.regions = regions;
    if (flags.has('veil.intro-dialogue.played')) {
      this.dialoguePlayed = true;
    }
  }

  update(dt: number): void {
    const position = this.ship.getTransform().position;

    let matchingRegion: CloudRegion | null = null;
    let matchingDistance: number = Infinity;

    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[i];
      const d = distance(position, region.center);
      if (d <= region.radius) {
        matchingRegion = region;
        matchingDistance = d;
        break;
      }
    }

    this.currentRegion = matchingRegion;

    let alphaFactor = 0;

    if (this.currentRegion) {
      const halfRadius = this.currentRegion.radius * 0.5;

      if (matchingDistance <= halfRadius) {
        alphaFactor = 1.0;
      } else {
        const t = 1.0 - (matchingDistance - halfRadius) / halfRadius;
        alphaFactor = Math.max(0, Math.min(1, t));
      }
    }

    const targetAlphaFront = (this.currentRegion?.frontParams.alpha ?? 0) * alphaFactor;
    const targetAlphaBack = (this.currentRegion?.backParams.alpha ?? 0) * alphaFactor;

    const fadeT = 1 - Math.exp(-this.FADE_SPEED * dt);
    this.alphaFront = lerp(this.alphaFront, targetAlphaFront, fadeT);
    this.alphaBack = lerp(this.alphaBack, targetAlphaBack, fadeT);

    // === Clamp near-zero to 0 ===
    if (this.alphaFront < CloudManager.EPSILON) this.alphaFront = 0;
    if (this.alphaBack < CloudManager.EPSILON) this.alphaBack = 0;

    // === Emit if alpha changed significantly ===
    if (Math.abs(this.alphaFront - this.lastEmittedFrontAlpha) > CloudManager.EPSILON) {
      const base = this.currentRegion?.frontParams ?? {};
      setCloudParamsFront({ ...base, alpha: this.alphaFront });
      this.lastEmittedFrontAlpha = this.alphaFront;
    }

    if (Math.abs(this.alphaBack - this.lastEmittedBackAlpha) > CloudManager.EPSILON) {
      const base = this.currentRegion?.backParams ?? {};
      setCloudParamsBack({ ...base, alpha: this.alphaBack });
      this.lastEmittedBackAlpha = this.alphaBack;
    }
  }

  // == Public API ==

  getRegionCoords(): readonly { x: number; y: number; radius: number }[] {
    const buf = this.regionCoordsBuffer;
    buf.length = 0;

    for (let i = 0; i < this.regions.length; i++) {
      const r = this.regions[i];
      buf.push({ x: r.center.x, y: r.center.y, radius: r.radius });
    }

    return buf;
  }

  isShipInCloud(): boolean {
    // Compare against a perceptual epsilon, not strict > 0
    const inCloud = this.alphaFront > CloudManager.EPSILON;
    if (inCloud) {
      if (!this.dialoguePlayed) {
        this.initialDialogue();
      }
    }
    return inCloud;
  }

  initialDialogue(): void {
    reportDialogueLine(
      'carl',
      'Be careful Shipwright.  Strange things happen in the Veil...',
    );
    this.dialoguePlayed = true;
    flags.set('veil.intro-dialogue.played');
    setTimeout(() => {
      clearDialogueEvents();
    }, 5000);
  }
}

