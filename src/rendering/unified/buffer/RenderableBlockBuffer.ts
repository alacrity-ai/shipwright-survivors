// src/rendering/unified/buffer/RenderableBlockBuffer.ts

import type { Ship } from '@/game/ship/Ship';
import { BLOCK_SIZE } from '@/config/view';
import { getDamageLevel, getBlockAtlasUVOffset } from '@/rendering/cache/BlockSpriteCache';
import {
  createTranslationMatrixInPlace,
  createRotationMatrixInPlace,
  multiplyMatricesInPlace,
} from '@/rendering/gl/matrixUtils';

const tmpTranslation = new Float32Array(16);
const tmpRotation = new Float32Array(16);
const tmpModelMatrix = new Float32Array(16);

const BLOCK_CAPACITY = 10000;

export class RenderableBlockBuffer {
  private static readonly shipIds: string[] = new Array(BLOCK_CAPACITY);
  private static readonly modelMatrices: Float32Array[] = new Array(BLOCK_CAPACITY);
  private static readonly blockRotations = new Float32Array(BLOCK_CAPACITY);
  private static readonly blockPositions = new Float32Array(BLOCK_CAPACITY * 2);
  private static readonly baseUVs = new Float32Array(BLOCK_CAPACITY * 2);
  private static readonly overlayUVs = new Float32Array(BLOCK_CAPACITY * 2);
  private static readonly useOverlays = new Uint8Array(BLOCK_CAPACITY);
  private static readonly colorOverrides = new Float32Array(BLOCK_CAPACITY * 3);
  private static readonly colorIntensities = new Float32Array(BLOCK_CAPACITY);

  private static count = 0;

  // Preallocate all model matrices
  static {
    for (let i = 0; i < BLOCK_CAPACITY; i++) {
      this.modelMatrices[i] = new Float32Array(16);
    }
  }

  public static collectFromShip(ship: Ship): void {
    const transform = ship.getTransform();
    const pos = transform.position;
    const rot = transform.rotation;

    createTranslationMatrixInPlace(pos.x, pos.y, tmpTranslation);
    createRotationMatrixInPlace(rot, tmpRotation);
    multiplyMatricesInPlace(tmpTranslation, tmpRotation, tmpModelMatrix);

    const colorOverride = ship.getBlockColor?.();
    const r = colorOverride ? parseInt(colorOverride.slice(1, 3), 16) / 255 : 0;
    const g = colorOverride ? parseInt(colorOverride.slice(3, 5), 16) / 255 : 0;
    const b = colorOverride ? parseInt(colorOverride.slice(5, 7), 16) / 255 : 0;
    const intensity = ship.getBlockColorIntensity?.() ?? 0.5;

    ship.forEachBlock((coord, block) => {
      if (block.hidden) return;
      if (this.count >= BLOCK_CAPACITY) return;

      const index = this.count++;
      const modelMatrix = this.modelMatrices[index];
      modelMatrix.set(tmpModelMatrix);

      const [localX, localY] = [coord.x * BLOCK_SIZE, coord.y * BLOCK_SIZE];
      const blockRotation = (block.rotation ?? 0) * Math.PI / 180;
      const typeId = block.type.id;
      const maxHp = block.type.armor ?? 1;
      const damageLevel = getDamageLevel(block.hp, maxHp);
      const { baseUV, overlayUV } = getBlockAtlasUVOffset(typeId, damageLevel);

      this.shipIds[index] = ship.id;

      this.blockRotations[index] = blockRotation;
      this.blockPositions[index * 2] = localX;
      this.blockPositions[index * 2 + 1] = localY;

      this.baseUVs[index * 2] = baseUV[0];
      this.baseUVs[index * 2 + 1] = baseUV[1];

      this.overlayUVs[index * 2] = overlayUV?.[0] ?? 0;
      this.overlayUVs[index * 2 + 1] = overlayUV?.[1] ?? 0;

      this.useOverlays[index] = overlayUV ? 1 : 0;

      this.colorOverrides[index * 3 + 0] = r;
      this.colorOverrides[index * 3 + 1] = g;
      this.colorOverrides[index * 3 + 2] = b;

      this.colorIntensities[index] = intensity;
    });
  }

  public static getCount(): number {
    return this.count;
  }

  public static clear(): void {
    this.count = 0;
  }

  // Accessors (example for render loop)
  public static getModelMatrix(i: number): Float32Array {
    return this.modelMatrices[i];
  }

  public static getBlockRotation(i: number): number {
    return this.blockRotations[i];
  }

  public static getBlockPosition(i: number): [number, number] {
    return [this.blockPositions[i * 2], this.blockPositions[i * 2 + 1]];
  }

  public static getBaseUV(i: number): [number, number] {
    return [this.baseUVs[i * 2], this.baseUVs[i * 2 + 1]];
  }

  public static getOverlayUV(i: number): [number, number] {
    return [this.overlayUVs[i * 2], this.overlayUVs[i * 2 + 1]];
  }

  public static getColorOverride(i: number): [number, number, number] {
    return [
      this.colorOverrides[i * 3 + 0],
      this.colorOverrides[i * 3 + 1],
      this.colorOverrides[i * 3 + 2],
    ];
  }

  public static getColorIntensity(i: number): number {
    return this.colorIntensities[i];
  }

  public static getUseOverlay(i: number): boolean {
    return this.useOverlays[i] === 1;
  }
}
