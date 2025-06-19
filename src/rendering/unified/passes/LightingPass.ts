// src/rendering/unified/passes/LightingPass.ts

import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

import lightVertSrc from '@/rendering/unified/shaders/lightingPassInstanced.vert?raw';
import lightFragSrc from '@/rendering/unified/shaders/lightingPassInstanced.frag?raw';
import beamVertSrc from '@/rendering/unified/shaders/lightingPassBeam.vert?raw';
import beamFragSrc from '@/rendering/unified/shaders/lightingPassBeam.frag?raw';
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
  private readonly beamProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;

  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly lightUBO: WebGLBuffer;
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

  constructor(gl: WebGL2RenderingContext, cameraUBO: WebGLBuffer) {
    this.gl = gl;
    this.cameraUBO = cameraUBO;

    this.lightProgram = createProgramFromSources(gl, lightVertSrc, lightFragSrc);
    this.beamProgram = createProgramFromSources(gl, beamVertSrc, beamFragSrc);
    this.postProgram = createProgramFromSources(gl, postVertSrc, postFragSrc);

    this.quadBuffer = createQuadBuffer(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.lightUBO = gl.createBuffer()!;
    this.lightData = new Float32Array(MAX_POINT_LIGHTS * FLOATS_PER_LIGHT);
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.lightUBO);
    gl.bufferData(gl.UNIFORM_BUFFER, this.lightData.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, LIGHTBLOCK_BINDING_INDEX, this.lightUBO);

    const blockIndex = gl.getUniformBlockIndex(this.lightProgram, 'LightBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.lightProgram, blockIndex, LIGHTBLOCK_BINDING_INDEX);
    }

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

  public generateLightBuffer(lights: AnyLightInstance[], camera: Camera): WebGLTexture {
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

    let pointLightCount = 0;
    for (const light of lights) {
      if (light.type !== 'point') continue;
      if (pointLightCount >= MAX_POINT_LIGHTS) break;

      const screen = camera.worldToScreen(light.x, light.y);
      const sx = screen.x * this.resolutionScale;
      const sy = screen.y * this.resolutionScale;

      const base = pointLightCount * FLOATS_PER_LIGHT;
      const [r, g, b, a] = this.hexToRgbaVec4(light.color);

      // vec4[0] = [x, y, radius, unused]
      this.lightData[base + 0] = sx;
      this.lightData[base + 1] = sy;
      this.lightData[base + 2] = light.radius * camera.getZoom() * this.resolutionScale;
      this.lightData[base + 3] = 0;

      // vec4[1] = [r, g, b, intensity]
      this.lightData[base + 4] = r;
      this.lightData[base + 5] = g;
      this.lightData[base + 6] = b;
      this.lightData[base + 7] = light.intensity;

      // vec4[2] = [falloff, unused, unused, unused]
      this.lightData[base + 8] = light.animationPhase ?? 1.0;
      this.lightData[base + 9] = 0;
      this.lightData[base + 10] = 0;
      this.lightData[base + 11] = 0;

      pointLightCount++;
    }

    gl.bindBuffer(gl.UNIFORM_BUFFER, this.lightUBO);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.lightData.subarray(0, pointLightCount * FLOATS_PER_LIGHT));

    gl.useProgram(this.lightProgram);
    gl.uniform2f(gl.getUniformLocation(this.lightProgram, 'uResolution'), this.framebufferWidth, this.framebufferHeight);

    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, pointLightCount);

    for (const light of lights) {
      if (light.type !== 'beam') continue;

      gl.useProgram(this.beamProgram);
      gl.uniform2f(gl.getUniformLocation(this.beamProgram, 'uResolution'), this.framebufferWidth, this.framebufferHeight);

      const start = camera.worldToScreen(light.start.x, light.start.y);
      const end = camera.worldToScreen(light.end.x, light.end.y);
      const sx0 = start.x * this.resolutionScale;
      const sy0 = this.framebufferHeight - start.y * this.resolutionScale;
      const sx1 = end.x * this.resolutionScale;
      const sy1 = this.framebufferHeight - end.y * this.resolutionScale;

      gl.uniform2f(gl.getUniformLocation(this.beamProgram, 'uStart'), sx0, sy0);
      gl.uniform2f(gl.getUniformLocation(this.beamProgram, 'uEnd'), sx1, sy1);
      gl.uniform1f(gl.getUniformLocation(this.beamProgram, 'uWidth'), light.width * camera.getZoom() * this.resolutionScale);
      gl.uniform4fv(gl.getUniformLocation(this.beamProgram, 'uColor'), this.hexToRgbaVec4(light.color));
      gl.uniform1f(gl.getUniformLocation(this.beamProgram, 'uIntensity'), light.intensity);
      gl.uniform1f(gl.getUniformLocation(this.beamProgram, 'uFalloff'), light.animationPhase ?? 1.0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return this.colorTexture;
  }

  public compositeLightingOverTarget(targetFramebuffer: WebGLFramebuffer): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, targetFramebuffer);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(this.postProgram);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(gl.getUniformLocation(this.postProgram, 'uTexture'), 0);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'uMaxBrightness'), this.maxBrightness);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
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
    gl.deleteProgram(this.beamProgram);
    gl.deleteProgram(this.postProgram);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteFramebuffer(this.framebuffer);
    gl.deleteTexture(this.colorTexture);
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.lightUBO);
    gl.deleteFramebuffer(this.compositeFramebuffer);
    gl.deleteTexture(this.compositeTexture);
  }

  private hexToRgbaVec4(hex: string): [number, number, number, number] {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
}
