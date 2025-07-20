// src/rendering/unified/passes/LightingPass.ts

import type { Camera } from '@/core/Camera';
import type { LightSOA } from '@/lighting/interfaces/LightSOA';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

import lightVertSrc from '@/rendering/unified/shaders/lightingPassInstanced.vert?raw';
import lightFragSrc from '@/rendering/unified/shaders/lightingPassInstanced.frag?raw';
import postVertSrc from '@/rendering/unified/shaders/lightingPassPost.vert?raw';
import postFragSrc from '@/rendering/unified/shaders/lightingPassPost.frag?raw';

const MAX_POINT_LIGHTS = 10000;
const FLOATS_PER_LIGHT = 12; // 3 vec4s: pos+radius, color+intensity, falloff
const LIGHTBLOCK_BINDING_INDEX = 2;

export class LightingPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly cameraUBO: WebGLBuffer;

  private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

  private readonly lightProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;

  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  // Double-buffered UBOs
  private lightUBOs: WebGLBuffer[] = [];
  private currentUBOIndex = 0;

  private readonly lightData: Float32Array;

  private framebuffer: WebGLFramebuffer;
  private colorTexture: WebGLTexture;

  private framebufferWidth = 0;
  private framebufferHeight = 0;
  private framebufferDirty = true;

  private compositeFramebuffer: WebGLFramebuffer;
  private compositeTexture: WebGLTexture;

  private readonly resolutionScale = 0.2;
  private readonly clearColor: [number, number, number, number] = [0, 0, 0, 0];
  private readonly maxBrightness = 1.0;

  private readonly colorCache = new Map<string, [number, number, number, number]>();

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.cameraUBO = cameraUBO;

    this.lightProgram = createProgramFromSources(gl, lightVertSrc, lightFragSrc);
    this.postProgram = createProgramFromSources(gl, postVertSrc, postFragSrc);

    this.quadBuffer = createQuadBuffer(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Prepare Float32Array for all lights
    this.lightData = new Float32Array(MAX_POINT_LIGHTS * FLOATS_PER_LIGHT);

    // --- Create double-buffered UBOs ---
    const NUM_UBOS = 2; // Increase to 3 if stalls still occur on your GPU
    for (let i = 0; i < NUM_UBOS; i++) {
      const ubo = gl.createBuffer()!;
      gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
      gl.bufferData(gl.UNIFORM_BUFFER, this.lightData.byteLength, gl.DYNAMIC_DRAW);
      this.lightUBOs.push(ubo);
    }
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);

    // Bind the first buffer to the binding index
    gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, this.lightUBOs[0]);

    const blockIndex = gl.getUniformBlockIndex(this.lightProgram, 'LightBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.lightProgram, blockIndex, LIGHTBLOCK_BINDING_INDEX);
    }

    // Framebuffer + textures
    this.colorTexture = gl.createTexture()!;
    this.framebuffer = gl.createFramebuffer()!;
    this.initializeFramebuffer();

    this.compositeTexture = gl.createTexture()!;
    this.compositeFramebuffer = gl.createFramebuffer()!;
    this.initializeCompositeFramebuffer();
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

  private initializeCompositeFramebuffer(): void {
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.compositeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebufferWidth, this.framebufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.compositeFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.compositeTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public generateLightBuffer(
    visible: { soa: LightSOA; indices: Uint16Array; count: number },
    camera: Camera
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

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);
    gl.bindVertexArray(this.vao);

    const { soa, indices, count } = visible;
    const maxCount = Math.min(count, MAX_POINT_LIGHTS);

    // === Populate CPU buffer directly from master SOA via visible indices ===
    for (let i = 0; i < maxCount; i++) {
      const idx = indices[i];
      const screen = camera.worldToScreen(soa.x[idx], soa.y[idx]);
      const sx = screen.x * this.resolutionScale;
      const sy = screen.y * this.resolutionScale;

      const base = i * FLOATS_PER_LIGHT;

      this.lightData[base + 0] = sx;
      this.lightData[base + 1] = sy;
      this.lightData[base + 2] = soa.radius[idx] * camera.getZoom() * this.resolutionScale;
      this.lightData[base + 3] = 0;

      this.lightData[base + 4] = soa.r[idx];
      this.lightData[base + 5] = soa.g[idx];
      this.lightData[base + 6] = soa.b[idx];
      this.lightData[base + 7] = soa.intensity[idx];

      this.lightData[base + 8]  = soa.animationPhase[idx];
      this.lightData[base + 9]  = 0;
      this.lightData[base + 10] = 0;
      this.lightData[base + 11] = 0;
    }

    // === Upload to GPU (ping-pong UBO) ===
    this.currentUBOIndex = (this.currentUBOIndex + 1) % this.lightUBOs.length;
    const currentUBO = this.lightUBOs[this.currentUBOIndex];

    gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, currentUBO);
    gl.bindBuffer(gl.UNIFORM_BUFFER, currentUBO);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.lightData.subarray(0, maxCount * FLOATS_PER_LIGHT));

    // === Draw all lights ===
    gl.useProgram(this.lightProgram);
    gl.uniform2f(
      gl.getUniformLocation(this.lightProgram, 'uResolution'),
      this.framebufferWidth,
      this.framebufferHeight
    );
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, maxCount);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return this.colorTexture;
  }

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
    gl.uniform1i(gl.getUniformLocation(this.postProgram, 'uTexture'), 0);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'uMaxBrightness'), this.maxBrightness);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  public setAmbientLight(value: [number, number, number]): void {
    this.ambientLight = value;
  }

  public getAmbientLight(): [number, number, number] {
    return this.ambientLight;
  }

  public resize(): void {
    this.framebufferDirty = true;
  }

  public destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.lightProgram);
    gl.deleteProgram(this.postProgram);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteTexture(this.colorTexture);
    gl.deleteVertexArray(this.vao);
    for (const ubo of this.lightUBOs) {
      gl.deleteBuffer(ubo);
    }
    this.lightUBOs = [];
    gl.deleteFramebuffer(this.compositeFramebuffer);
    gl.deleteTexture(this.compositeTexture);
  }

  private hexToRgbaVec4(hex: string): [number, number, number, number] {
    if (this.colorCache.has(hex)) {
      return this.colorCache.get(hex)!;
    }

    let h = hex;
    if (h.startsWith('#')) h = h.slice(1);

    const r = parseInt(h.slice(0, 2), 16) / 255;
    const g = parseInt(h.slice(2, 4), 16) / 255;
    const b = parseInt(h.slice(4, 6), 16) / 255;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;

    const rgba: [number, number, number, number] = [r, g, b, a];
    this.colorCache.set(hex, rgba);
    return rgba;
  }
}