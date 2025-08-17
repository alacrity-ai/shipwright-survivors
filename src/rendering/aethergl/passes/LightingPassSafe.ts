
// src/rendering/unified/passes/LightingPassSafe.ts
import { Camera } from '@/core/Camera';
import type { LightSOA } from '@/lighting/interfaces/LightSOA';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

import lightVertSrc from '@/rendering/unified/shaders/lightingPassInstanced.vert?raw';
import lightFragSrc from '@/rendering/unified/shaders/lightingPassInstanced.frag?raw';
import postVertSrc from '@/rendering/unified/shaders/lightingPassPost.vert?raw';
import postFragSrc from '@/rendering/unified/shaders/lightingPassPost.frag?raw';

import { MAX_LIGHTS_GL, getSafeUniformCount } from '@/config/graphicsConfig';

/**
 * Std140 layout: this pack is 3 * vec4 per light.
 *   [pos.xy, radius, pad] | [rgb, intensity] | [phase, pad, pad, pad]
 */
const FLOATS_PER_LIGHT = 12;
const BYTES_PER_LIGHT = FLOATS_PER_LIGHT * 4;

const LIGHTBLOCK_BINDING_INDEX = 2;

// Ring size: 3–4 is a good sweet spot to avoid reuse hazards without wasting VRAM.
const RING_SLOTS = 4;

type UboSlot = {
  buffer: WebGLBuffer;
  fence: WebGLSync | null;
};

export class LightingPassSafe {
  private readonly gl: WebGL2RenderingContext;
  private readonly cameraUBO: WebGLBuffer;

  private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

  private readonly lightProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;

  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  // UBO ring and lightweight hazard management
  private ring: UboSlot[] = [];
  private ringIndex = 0;
  private lastBoundBuffer: WebGLBuffer | null = null;

  // Cached uniform locations
  private readonly lightResolutionLoc: WebGLUniformLocation;
  private readonly lightCountLoc: WebGLUniformLocation;
  private readonly postTextureLoc: WebGLUniformLocation;
  private readonly postMaxBrightnessLoc: WebGLUniformLocation;

  private maxPointLights = 0;
  private readonly lightData: Float32Array;

  private framebuffer: WebGLFramebuffer;
  private colorTexture: WebGLTexture;

  private framebufferWidth = 0;
  private framebufferHeight = 0;
  private framebufferDirty = true;

  // Tunables
  private resolutionScale = 0.2; // dynamic-resolution for light buffer
  private readonly clearColor: [number, number, number, number] = [0, 0, 0, 0];
  private maxBrightness = 1.0;

  // Scratch to avoid per-light object allocation if Camera lacks an out-parameter API.
  private readonly scratch2D = { x: 0, y: 0 };
  private readonly worldToScreenInto:
    | ((x: number, y: number, out: { x: number; y: number }) => void)
    | null = null;

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.cameraUBO = cameraUBO;

    // Programs
    this.lightProgram = createProgramFromSources(gl, lightVertSrc, lightFragSrc);
    this.postProgram  = createProgramFromSources(gl, postVertSrc,  postFragSrc);

    // Uniform locations
    this.lightResolutionLoc   = gl.getUniformLocation(this.lightProgram, 'uResolution')!;
    this.lightCountLoc        = gl.getUniformLocation(this.lightProgram, 'uLightCount')!;
    this.postTextureLoc       = gl.getUniformLocation(this.postProgram,  'uTexture')!;
    this.postMaxBrightnessLoc = gl.getUniformLocation(this.postProgram,  'uMaxBrightness')!;

    // Fullscreen quad VAO
    this.quadBuffer = createQuadBuffer(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Adopt GC-neutral camera projection if present (unbound; call with .call(camera,...))
    const maybeInto = (Camera.prototype as any).worldToScreenInto;
    this.worldToScreenInto = typeof maybeInto === 'function' ? maybeInto : null;

    // LightBlock binding index and compiled block size
    const uBlockIndex = gl.getUniformBlockIndex(this.lightProgram, 'LightBlock');
    if (uBlockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.lightProgram, uBlockIndex, LIGHTBLOCK_BINDING_INDEX);
    }
    const requiredBytes =
      uBlockIndex !== gl.INVALID_INDEX
        ? (gl.getActiveUniformBlockParameter(
            this.lightProgram,
            uBlockIndex,
            gl.UNIFORM_BLOCK_DATA_SIZE,
          ) as number)
        : 0;

    // Shader-declared capacity (from compiled block size) and soft cap (driver/config).
    const shaderLights = requiredBytes > 0 ? Math.floor(requiredBytes / BYTES_PER_LIGHT) : 0;
    const softCap      = this.computeMaxLights(gl);

    // Final runtime cap: never exceed what the shader compiled with.
    this.maxPointLights = shaderLights > 0 ? Math.min(softCap, shaderLights) : softCap;

    // CPU staging buffer sized to runtime cap.
    this.lightData = new Float32Array(this.maxPointLights * FLOATS_PER_LIGHT);

    // UBO ring sized to the compiled block size (fallback to staging size if unknown).
    const bytesCapacity = requiredBytes || this.lightData.byteLength;
    this.ring = new Array(RING_SLOTS);
    for (let i = 0; i < RING_SLOTS; i++) {
      const buf = gl.createBuffer()!;
      gl.bindBuffer(gl.UNIFORM_BUFFER, buf);
      gl.bufferData(gl.UNIFORM_BUFFER, bytesCapacity, gl.STREAM_DRAW);
      this.ring[i] = { buffer: buf, fence: null };
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Bind the first slot to the LightBlock binding point.
    gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, this.ring[0].buffer);
    this.lastBoundBuffer = this.ring[0].buffer;

    // Light-buffer FBO
    this.colorTexture = gl.createTexture()!;
    this.framebuffer  = gl.createFramebuffer()!;
    this.initializeFramebuffer();
  }

  // /** Compute a conservative light cap respecting driver limits (std140 block size). */
  // private computeMaxLights(gl: WebGL2RenderingContext): number {
  //   const soft = Math.min(MAX_LIGHTS_GL, getSafeUniformCount(gl));
  //   // If the block is optimized out, we can't query meaningful limits here—fall back to soft.
  //   const blockIndex = gl.getUniformBlockIndex(
  //     // The block only exists in lightProgram.
  //     this.lightProgram,
  //     'LightBlock',
  //   );
  //   if (blockIndex === gl.INVALID_INDEX) return soft | 0;

  //   const maxBlockBytes = gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE) as number;
  //   const byBlock = Math.max(0, Math.floor(maxBlockBytes / BYTES_PER_LIGHT));
  //   // Use the lesser of our config-safe cap and the uniform-block byte budget.
  //   return Math.max(0, Math.min(soft, byBlock) | 0);
  // }

  private computeMaxLights(gl: WebGL2RenderingContext): number {
    // Just use the soft limit, ignore block size restrictions
    return Math.min(MAX_LIGHTS_GL, getSafeUniformCount(gl));
  }

  private initializeFramebuffer(): void {
    const gl = this.gl;

    const width = Math.max(1, Math.floor(gl.drawingBufferWidth * this.resolutionScale));
    const height = Math.max(1, Math.floor(gl.drawingBufferHeight * this.resolutionScale));
    this.framebufferWidth = width;
    this.framebufferHeight = height;

    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);

    // Optional: assert completeness in dev builds
    // const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    // if (status !== gl.FRAMEBUFFER_COMPLETE) {
    //   console.warn('[LightingPass] Light FBO incomplete:', status.toString(16));
    // }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Acquire a UBO slot that is not in flight (non-blocking). */
  private acquireRingSlot(): UboSlot {
    const gl = this.gl;
    for (let i = 0; i < this.ring.length; i++) {
      const idx = (this.ringIndex + i) % this.ring.length;
      const slot = this.ring[idx];
      if (!slot.fence) {
        this.ringIndex = idx;
        return slot;
      }
      // Poll without blocking; if signaled, reclaim.
      const status = gl.clientWaitSync(slot.fence, 0, 0);
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
        gl.deleteSync(slot.fence);
        slot.fence = null;
        this.ringIndex = idx;
        return slot;
      }
    }
    // Worst-case: all are busy—advance (driver should internally double-buffer to avoid stalls).
    this.ringIndex = (this.ringIndex + 1) % this.ring.length;
    return this.ring[this.ringIndex];
  }

  /**
   * Render all visible lights into the low-resolution light buffer and return the texture handle.
   */
  public generateLightBuffer(
    visible: { soa: LightSOA; indices: Uint16Array; count: number },
    camera: Camera,
  ): WebGLTexture {
    const gl = this.gl;

    if (this.framebufferDirty) {
      this.initializeFramebuffer();
      this.framebufferDirty = false;
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.framebufferWidth, this.framebufferHeight);

    gl.clearColor(...this.clearColor);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Additive light accumulation
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.lightProgram);
    gl.bindVertexArray(this.vao);

    const { soa, indices, count } = visible;
    const maxCount = Math.min(count, this.maxPointLights);

    if (maxCount === 0) {
      // Fast path: no upload, no draw
      gl.disable(gl.BLEND);
      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      return this.colorTexture;
    }

    // === Populate CPU buffer from SOA ===
    // Avoid object churn from Camera.worldToScreen by using an out-parameter if available.
    const useInto = this.worldToScreenInto;
    const zoom = camera.getZoom();
    const scale = this.resolutionScale;

    for (let i = 0; i < maxCount; i++) {
      const idx = indices[i];

      if (useInto) {
        useInto.call(camera, soa.x[idx], soa.y[idx], this.scratch2D);
      } else {
        const s = camera.worldToScreen(soa.x[idx], soa.y[idx]);
        this.scratch2D.x = s.x;
        this.scratch2D.y = s.y;
      }

      const base = i * FLOATS_PER_LIGHT;
      this.lightData[base + 0] = this.scratch2D.x * scale;
      this.lightData[base + 1] = this.scratch2D.y * scale;
      this.lightData[base + 2] = soa.radius[idx] * zoom * scale; // world→screen→lowres
      this.lightData[base + 3] = 0.0;

      this.lightData[base + 4] = soa.r[idx];
      this.lightData[base + 5] = soa.g[idx];
      this.lightData[base + 6] = soa.b[idx];
      this.lightData[base + 7] = soa.intensity[idx];

      this.lightData[base + 8]  = soa.animationPhase[idx];
      this.lightData[base + 9]  = 0.0;
      this.lightData[base + 10] = 0.0;
      this.lightData[base + 11] = 0.0;
    }

    // === Upload via UBO ring (no orphaning on the hot path) ===
    const slot = this.acquireRingSlot();
    const buffer = slot.buffer;

    if (this.lastBoundBuffer !== buffer) {
      gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, buffer);
      this.lastBoundBuffer = buffer;
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);

    // Upload only the used portion; 5-arg overload avoids creating a subarray view.
    const usedFloats = maxCount * FLOATS_PER_LIGHT;
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.lightData, 0, usedFloats);

    // === Draw all lights ===
    gl.uniform1i(this.lightCountLoc, maxCount);
    gl.uniform2f(this.lightResolutionLoc, this.framebufferWidth, this.framebufferHeight);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, maxCount);

    // Fence the slot so we don't reuse storage still in flight.
    if (slot.fence) this.gl.deleteSync(slot.fence);
    slot.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

    // Restore state minimally
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return this.colorTexture;
  }

  /**
   * Additively composite the light buffer onto the target (typically the main scene FBO or null).
   */
  public compositeLightingOverTarget(targetFramebuffer: WebGLFramebuffer | null): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.postProgram);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(this.postTextureLoc, 0);
    gl.uniform1f(this.postMaxBrightnessLoc, this.maxBrightness);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ── Controls ────────────────────────────────────────────────────────────

  public setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }
  public getAmbientLight(): [number, number, number] {
    return this.ambientLight;
  }

  /** Adjust light-buffer dynamic resolution (0.05–1.0). Triggers FBO reallocation on next frame. */
  public setResolutionScale(scale: number): void {
    const clamped = Math.max(0.05, Math.min(1.0, scale));
    if (clamped !== this.resolutionScale) {
      this.resolutionScale = clamped;
      this.framebufferDirty = true;
    }
  }

  /** Optional cap override for debugging/tuning; obeys hardware limit. */
  public setMaxLightsCap(cap: number): void {
    const hw = this.computeMaxLights(this.gl);
    const next = Math.max(0, Math.min(hw, cap | 0));
    if (next !== this.maxPointLights) {
      this.maxPointLights = next;
      // No need to reallocate lightData unless you want to shrink memory.
      // If you do, uncomment:
      // (this.lightData as any) = new Float32Array(this.maxPointLights * FLOATS_PER_LIGHT);
    }
  }

  public setMaxBrightness(value: number): void {
    this.maxBrightness = Math.max(0, value);
  }

  public resize(): void {
    this.framebufferDirty = true;
  }

  public destroy(): void {
    const gl = this.gl;

    gl.deleteProgram(this.lightProgram);
    gl.deleteProgram(this.postProgram);

    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);

    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteTexture(this.colorTexture);

    for (const slot of this.ring) {
      if (slot.fence) gl.deleteSync(slot.fence);
      gl.deleteBuffer(slot.buffer);
    }
    this.ring.length = 0;
    this.lastBoundBuffer = null;
  }
}
