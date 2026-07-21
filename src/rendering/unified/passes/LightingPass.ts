// // src/rendering/unified/passes/LightingPass.ts

// import type { Camera } from '@/core/Camera';
// import type { LightSOA } from '@/lighting/interfaces/LightSOA';

// import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
// import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

// import lightVertSrc from '@/rendering/unified/shaders/lightingPassInstanced.vert?raw';
// import lightFragSrc from '@/rendering/unified/shaders/lightingPassInstanced.frag?raw';
// import postVertSrc from '@/rendering/unified/shaders/lightingPassPost.vert?raw';
// import postFragSrc from '@/rendering/unified/shaders/lightingPassPost.frag?raw';

// import { MAX_LIGHTS_GL, getSafeUniformCount } from '@/config/graphicsConfig';

// const FLOATS_PER_LIGHT = 12; // 3 vec4s: pos+radius, color+intensity, falloff/phase
// const LIGHTBLOCK_BINDING_INDEX = 2;

// // Number of UBO slots in the ring. 3–4 is typically enough to avoid reuse stalls.
// const RING_SLOTS = 4;

// type UboSlot = {
//   buffer: WebGLBuffer;
//   fence: WebGLSync | null;
// };

// export class LightingPass {
//   private readonly gl: WebGL2RenderingContext;
//   private readonly cameraUBO: WebGLBuffer;

//   private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

//   private readonly lightProgram: WebGLProgram;
//   private readonly postProgram: WebGLProgram;

//   private readonly vao: WebGLVertexArrayObject;
//   private readonly quadBuffer: WebGLBuffer;

//   // UBO ring to avoid reusing a buffer still in flight
//   private ring: UboSlot[] = [];
//   private ringIndex = 0;

//   // Cache to avoid redundant buffer base bindings
//   private lastBoundBuffer: WebGLBuffer | null = null;

//   // Cached uniform locations
//   private readonly lightResolutionLoc: WebGLUniformLocation;
//   private readonly lightCountLoc: WebGLUniformLocation;
//   private readonly postTextureLoc: WebGLUniformLocation;
//   private readonly postMaxBrightnessLoc: WebGLUniformLocation;

//   private maxPointLights: number = MAX_LIGHTS_GL;
//   private readonly lightData: Float32Array;

//   private framebuffer: WebGLFramebuffer;
//   private colorTexture: WebGLTexture;

//   private framebufferWidth = 0;
//   private framebufferHeight = 0;
//   private framebufferDirty = true;

//   // (Currently unused in your path, kept for parity with the original)
//   private compositeFramebuffer: WebGLFramebuffer;
//   private compositeTexture: WebGLTexture;

//   private readonly resolutionScale = 0.2;
//   private readonly clearColor: [number, number, number, number] = [0, 0, 0, 0];
//   private readonly maxBrightness = 1.0;

//   // Unused, retained in case you were planning to leverage it
//   private readonly colorCache = new Map<string, [number, number, number, number]>();

//   constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
//     this.gl = gl;
//     this.cameraUBO = cameraUBO;

//     this.lightProgram = createProgramFromSources(gl, lightVertSrc, lightFragSrc);
//     this.postProgram = createProgramFromSources(gl, postVertSrc, postFragSrc);

//     // Cache uniform locations once
//     this.lightResolutionLoc = gl.getUniformLocation(this.lightProgram, 'uResolution')!;
//     this.lightCountLoc = gl.getUniformLocation(this.lightProgram, 'uLightCount')!;
//     this.postTextureLoc = gl.getUniformLocation(this.postProgram, 'uTexture')!;
//     this.postMaxBrightnessLoc = gl.getUniformLocation(this.postProgram, 'uMaxBrightness')!;

//     // Respect platform UBO limits
//     this.maxPointLights = Math.min(MAX_LIGHTS_GL, getSafeUniformCount(gl));

//     this.quadBuffer = createQuadBuffer(gl);
//     this.vao = gl.createVertexArray()!;
//     gl.bindVertexArray(this.vao);
//     gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
//     gl.enableVertexAttribArray(0);
//     gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
//     gl.bindVertexArray(null);

//     // CPU staging for lights
//     this.lightData = new Float32Array(this.maxPointLights * FLOATS_PER_LIGHT);

//     // --- Create UBO ring (persistently sized; no per-frame bufferData) ---
//     const uBlockIndex = gl.getUniformBlockIndex(this.lightProgram, 'LightBlock');
//     if (uBlockIndex !== gl.INVALID_INDEX) {
//       gl.uniformBlockBinding(this.lightProgram, uBlockIndex, LIGHTBLOCK_BINDING_INDEX);
//     }

//     const bytesCapacity = this.lightData.byteLength;

//     this.ring = new Array(RING_SLOTS);
//     for (let i = 0; i < RING_SLOTS; i++) {
//       const buf = gl.createBuffer()!;
//       gl.bindBuffer(gl.UNIFORM_BUFFER, buf);
//       // Allocate once; STREAM_DRAW is the intended hint for one-shot uploads
//       gl.bufferData(gl.UNIFORM_BUFFER, bytesCapacity, gl.STREAM_DRAW);
//       this.ring[i] = { buffer: buf, fence: null };
//     }
//     gl.bindBuffer(gl.UNIFORM_BUFFER, null);

//     // Bind an initial slot
//     gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, this.ring[0].buffer);
//     this.lastBoundBuffer = this.ring[0].buffer;

//     // Framebuffer + textures
//     this.colorTexture = gl.createTexture()!;
//     this.framebuffer = gl.createFramebuffer()!;
//     this.initializeFramebuffer();

//     this.compositeTexture = gl.createTexture()!;
//     this.compositeFramebuffer = gl.createFramebuffer()!;
//     this.initializeCompositeFramebuffer();
//   }

//   private initializeFramebuffer(): void {
//     const gl = this.gl;

//     const width = Math.max(1, Math.floor(gl.drawingBufferWidth * this.resolutionScale));
//     const height = Math.max(1, Math.floor(gl.drawingBufferHeight * this.resolutionScale));
//     this.framebufferWidth = width;
//     this.framebufferHeight = height;

//     gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

//     gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
//     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);

//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//     gl.bindTexture(gl.TEXTURE_2D, null);
//   }

//   private initializeCompositeFramebuffer(): void {
//     const gl = this.gl;
//     gl.bindTexture(gl.TEXTURE_2D, this.compositeTexture);
//     gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebufferWidth, this.framebufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

//     gl.bindFramebuffer(gl.FRAMEBUFFER, this.compositeFramebuffer);
//     gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.compositeTexture, 0);

//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//     gl.bindTexture(gl.TEXTURE_2D, null);
//   }

//   // Attempt to acquire a UBO slot that is not in flight. If none are free, fall back to the next slot
//   // and rely on the driver to handle it (extremely rare). We do NOT call bufferData here.
//   private acquireRingSlot(): UboSlot {
//     const gl = this.gl;
//     for (let i = 0; i < this.ring.length; i++) {
//       const idx = (this.ringIndex + i) % this.ring.length;
//       const slot = this.ring[idx];
//       if (!slot.fence) {
//         this.ringIndex = idx;
//         return slot;
//       }
//       // Poll without blocking
//       const status = gl.clientWaitSync(slot.fence, 0, 0);
//       if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) {
//         gl.deleteSync(slot.fence);
//         slot.fence = null;
//         this.ringIndex = idx;
//         return slot;
//       }
//       // else TIMEOUT_EXPIRED: try next slot
//     }
//     // All busy: pick next in ring; extremely rare to hit if RING_SLOTS>=3
//     this.ringIndex = (this.ringIndex + 1) % this.ring.length;
//     const slot = this.ring[this.ringIndex];
//     // We intentionally do not block here; driver will handle hazard with internal double buffering.
//     return slot;
//   }

//   public generateLightBuffer(
//     visible: { soa: LightSOA; indices: Uint16Array; count: number },
//     camera: Camera
//   ): WebGLTexture {
//     const gl = this.gl;

//     if (this.framebufferDirty) {
//       this.initializeFramebuffer();
//       this.framebufferDirty = false;
//     }

//     gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
//     gl.viewport(0, 0, this.framebufferWidth, this.framebufferHeight);
//     gl.clearColor(...this.clearColor);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     gl.blendFunc(gl.ONE, gl.ONE);
//     gl.enable(gl.BLEND);
//     gl.bindVertexArray(this.vao);

//     const { soa, indices, count } = visible;
//     const maxCount = Math.min(count, this.maxPointLights);

//     if (maxCount === 0) {
//       // Nothing to upload; skip UBO work and draw a no-op strip
//       gl.useProgram(this.lightProgram);
//       gl.uniform1i(this.lightCountLoc, 0);
//       gl.uniform2f(this.lightResolutionLoc, this.framebufferWidth, this.framebufferHeight);
//       gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 0);
//       gl.disable(gl.BLEND);
//       gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//       gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
//       return this.colorTexture;
//     }

//     // === Populate CPU buffer directly from master SOA via visible indices ===
//     // Avoid GC churn; tight numeric path.
//     for (let i = 0; i < maxCount; i++) {
//       const idx = indices[i];
//       const s = camera.worldToScreen(soa.x[idx], soa.y[idx]);
//       const base = i * FLOATS_PER_LIGHT;

//       this.lightData[base + 0] = s.x * this.resolutionScale;
//       this.lightData[base + 1] = s.y * this.resolutionScale;
//       this.lightData[base + 2] = soa.radius[idx] * camera.getZoom() * this.resolutionScale;
//       this.lightData[base + 3] = 0.0;

//       this.lightData[base + 4] = soa.r[idx];
//       this.lightData[base + 5] = soa.g[idx];
//       this.lightData[base + 6] = soa.b[idx];
//       this.lightData[base + 7] = soa.intensity[idx];

//       this.lightData[base + 8]  = soa.animationPhase[idx];
//       this.lightData[base + 9]  = 0.0;
//       this.lightData[base + 10] = 0.0;
//       this.lightData[base + 11] = 0.0;
//     }

//     // === Upload to GPU using UBO ring (no bufferData on the hot path) ===
//     const slot = this.acquireRingSlot();
//     const buffer = slot.buffer;

//     if (this.lastBoundBuffer !== buffer) {
//       gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, buffer);
//       this.lastBoundBuffer = buffer;
//     }
//     gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);

//     // Upload only the used portion; use 5-arg overload to avoid subarray allocation
//     const usedFloats = maxCount * FLOATS_PER_LIGHT;
//     gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.lightData, 0, usedFloats);

//     // === Draw all lights ===
//     gl.useProgram(this.lightProgram);
//     gl.uniform1i(this.lightCountLoc, maxCount);
//     gl.uniform2f(this.lightResolutionLoc, this.framebufferWidth, this.framebufferHeight);

//     gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, maxCount);

//     // Insert a fence for this slot so we know when it's safe to reuse
//     if (slot.fence) gl.deleteSync(slot.fence);
//     slot.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);

//     gl.disable(gl.BLEND);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//     gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

//     return this.colorTexture;
//   }

//   public compositeLightingOverTarget(targetFramebuffer: WebGLFramebuffer | null): void {
//     const gl = this.gl;

//     gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
//     gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

//     gl.enable(gl.BLEND);
//     gl.blendFunc(gl.ONE, gl.ONE);

//     gl.useProgram(this.postProgram);
//     gl.bindVertexArray(this.vao);

//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
//     gl.uniform1i(this.postTextureLoc, 0);
//     gl.uniform1f(this.postMaxBrightnessLoc, this.maxBrightness);

//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

//     gl.disable(gl.BLEND);
//     gl.bindFramebuffer(gl.FRAMEBUFFER, null);
//   }

//   public setAmbientLight(value: [number, number, number]): void {
//     this.ambientLight = value;
//   }
//   public getAmbientLight(): [number, number, number] {
//     return this.ambientLight;
//   }

//   public resize(): void {
//     this.framebufferDirty = true;
//   }

//   public destroy(): void {
//     const gl = this.gl;
//     gl.deleteProgram(this.lightProgram);
//     gl.deleteProgram(this.postProgram);
//     gl.deleteBuffer(this.quadBuffer);
//     gl.deleteFramebuffer(this.framebuffer);
//     gl.deleteTexture(this.colorTexture);
//     gl.deleteVertexArray(this.vao);

//     for (const slot of this.ring) {
//       if (slot.fence) gl.deleteSync(slot.fence);
//       gl.deleteBuffer(slot.buffer);
//     }
//     this.ring.length = 0;
//     this.lastBoundBuffer = null;

//     gl.deleteFramebuffer(this.compositeFramebuffer);
//     gl.deleteTexture(this.compositeTexture);
//   }
// }



// src/rendering/unified/passes/LightingPassSafe.ts
import { Camera } from '@/core/Camera';
import type { LightSOA } from '@/lighting/interfaces/LightSOA';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

import { PlayerSettingsManager } from '@/game/player/PlayerSettingsManager';

import lightVertSrc from '@/rendering/unified/shaders/lightingPassInstanced.vert?raw';
import lightFragSrc from '@/rendering/unified/shaders/lightingPassInstanced.frag?raw';
import postVertSrc from '@/rendering/unified/shaders/lightingPassPost.vert?raw';
import postFragSrc from '@/rendering/unified/shaders/lightingPassPost.frag?raw';

import { MAX_LIGHTS_GL } from '@/config/graphicsConfig';

/**
 * Interleaved per-instance layout: 3 * vec4 per light.
 *   [pos.xy, radius, pad] | [rgb, intensity] | [phase, pad, pad, pad]
 */
const FLOATS_PER_LIGHT = 12;
const BYTES_PER_LIGHT = FLOATS_PER_LIGHT * 4;

// Vertex attribute locations (must match layout(location=N) in lightingPassInstanced.vert)
const ATTRIB_QUAD_POS = 0;
const ATTRIB_POS_RADIUS = 1;
const ATTRIB_COLOR_INTENSITY = 2;
const ATTRIB_FALLOFF = 3;

// Reduced light budget when advanced lighting is disabled.
const MAX_LIGHTS_BASIC = 1365;

// Ring size: 3–4 is a good sweet spot to avoid reuse hazards without wasting VRAM.
const RING_SLOTS = 4;

type RingSlot = {
  buffer: WebGLBuffer;
  vao: WebGLVertexArrayObject;
  fence: WebGLSync | null;
};

export class LightingPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly cameraUBO: WebGLBuffer;

  private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

  private readonly lightProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;

  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  // Instance-VBO ring and lightweight hazard management
  private ring: RingSlot[] = [];
  private ringIndex = 0;

  // Cached uniform locations
  private readonly lightResolutionLoc: WebGLUniformLocation;
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
    this.postTextureLoc       = gl.getUniformLocation(this.postProgram,  'uTexture')!;
    this.postMaxBrightnessLoc = gl.getUniformLocation(this.postProgram,  'uMaxBrightness')!;

    // Fullscreen quad VAO (post pass only; the light pass uses per-slot VAOs)
    this.quadBuffer = createQuadBuffer(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(ATTRIB_QUAD_POS);
    gl.vertexAttribPointer(ATTRIB_QUAD_POS, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Adopt GC-neutral camera projection if present (unbound; call with .call(camera,...))
    const maybeInto = (Camera.prototype as any).worldToScreenInto;
    this.worldToScreenInto = typeof maybeInto === 'function' ? maybeInto : null;

    const playerSettings = PlayerSettingsManager.getInstance();
    this.maxPointLights = playerSettings.isLightingEnabled() ? MAX_LIGHTS_GL : MAX_LIGHTS_BASIC;

    // CPU staging buffer sized to the absolute cap so runtime cap changes never reallocate.
    this.lightData = new Float32Array(MAX_LIGHTS_GL * FLOATS_PER_LIGHT);

    // Instance-VBO ring. Each slot gets its own VAO because instanced attribute
    // pointers capture the bound buffer.
    const bytesCapacity = this.lightData.byteLength;
    this.ring = new Array(RING_SLOTS);
    for (let i = 0; i < RING_SLOTS; i++) {
      const buf = gl.createBuffer()!;
      const vao = gl.createVertexArray()!;

      gl.bindVertexArray(vao);

      gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
      gl.enableVertexAttribArray(ATTRIB_QUAD_POS);
      gl.vertexAttribPointer(ATTRIB_QUAD_POS, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, bytesCapacity, gl.STREAM_DRAW);

      gl.enableVertexAttribArray(ATTRIB_POS_RADIUS);
      gl.vertexAttribPointer(ATTRIB_POS_RADIUS, 4, gl.FLOAT, false, BYTES_PER_LIGHT, 0);
      gl.vertexAttribDivisor(ATTRIB_POS_RADIUS, 1);

      gl.enableVertexAttribArray(ATTRIB_COLOR_INTENSITY);
      gl.vertexAttribPointer(ATTRIB_COLOR_INTENSITY, 4, gl.FLOAT, false, BYTES_PER_LIGHT, 16);
      gl.vertexAttribDivisor(ATTRIB_COLOR_INTENSITY, 1);

      gl.enableVertexAttribArray(ATTRIB_FALLOFF);
      gl.vertexAttribPointer(ATTRIB_FALLOFF, 1, gl.FLOAT, false, BYTES_PER_LIGHT, 32);
      gl.vertexAttribDivisor(ATTRIB_FALLOFF, 1);

      gl.bindVertexArray(null);
      this.ring[i] = { buffer: buf, vao, fence: null };
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Light-buffer FBO
    this.colorTexture = gl.createTexture()!;
    this.framebuffer  = gl.createFramebuffer()!;
    this.initializeFramebuffer();
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

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Acquire an instance-VBO slot that is not in flight (non-blocking). */
  private acquireRingSlot(): RingSlot {
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

    // === Upload via instance-VBO ring (no orphaning on the hot path) ===
    const slot = this.acquireRingSlot();
    gl.bindVertexArray(slot.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, slot.buffer);

    // Upload only the used portion; 5-arg overload avoids creating a subarray view.
    const usedFloats = maxCount * FLOATS_PER_LIGHT;
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.lightData, 0, usedFloats);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // === Draw all lights ===
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

  /** Optional cap override for debugging/tuning; obeys the staging/VBO capacity. */
  public setMaxLightsCap(cap: number): void {
    this.maxPointLights = Math.max(0, Math.min(MAX_LIGHTS_GL, cap | 0));
  }

  public setMaxLights(strict: boolean = false): void {
    this.maxPointLights = strict ? MAX_LIGHTS_BASIC : MAX_LIGHTS_GL;
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
      gl.deleteVertexArray(slot.vao);
      gl.deleteBuffer(slot.buffer);
    }
    this.ring.length = 0;
  }
}
