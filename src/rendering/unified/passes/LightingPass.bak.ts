// src/rendering/unified/passes/LightingPass.ts

import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from '@/lighting/lights/types';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

import lightVertSrc from '@/rendering/unified/shaders/lightingPass.vert?raw';
import lightFragSrc from '@/rendering/unified/shaders/lightingPass.frag?raw';
import beamVertSrc from '@/rendering/unified/shaders/lightingPassBeam.vert?raw';
import beamFragSrc from '@/rendering/unified/shaders/lightingPassBeam.frag?raw';
import postVertSrc from '@/rendering/unified/shaders/lightingPassPost.vert?raw';
import postFragSrc from '@/rendering/unified/shaders/lightingPassPost.frag?raw';

export class LightingPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly cameraUBO: WebGLBuffer;

  private ambientLight: [number, number, number] = [0.2, 0.2, 0.25];

  private readonly lightProgram: WebGLProgram;
  private readonly beamProgram: WebGLProgram;
  private readonly postProgram: WebGLProgram;

  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private framebuffer: WebGLFramebuffer;
  private colorTexture: WebGLTexture;

  private framebufferWidth = 0;
  private framebufferHeight = 0;
  private framebufferDirty = true;

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

    this.colorTexture = gl.createTexture()!;
    this.framebuffer = gl.createFramebuffer()!;

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

  // Generates the lighting FBO texture, but does NOT composite it
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
    
    // This was used to prevent crazily bright lights
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.enable(gl.BLEND);

    gl.bindVertexArray(this.vao);

    for (const light of lights) {
      if (light.type === 'point') {
        gl.useProgram(this.lightProgram);
        gl.uniform2f(gl.getUniformLocation(this.lightProgram, 'uResolution'), this.framebufferWidth, this.framebufferHeight);

        const screen = camera.worldToScreen(light.x, light.y);
        const sx = screen.x * this.resolutionScale;
        const sy = screen.y * this.resolutionScale;

        gl.uniform2f(gl.getUniformLocation(this.lightProgram, 'uLightPosition'), sx, sy);
        gl.uniform1f(gl.getUniformLocation(this.lightProgram, 'uRadius'), light.radius * camera.getZoom() * this.resolutionScale);
        gl.uniform4fv(gl.getUniformLocation(this.lightProgram, 'uColor'), this.hexToRgbaVec4(light.color));
        gl.uniform1f(gl.getUniformLocation(this.lightProgram, 'uIntensity'), light.intensity);
        gl.uniform1f(gl.getUniformLocation(this.lightProgram, 'uFalloff'), light.animationPhase ?? 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else if (light.type === 'beam') {
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
    }

    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    return this.colorTexture;
  }

  // Composites light texture over the main screen with additive blending
  public compositeLightingOverScene(): void {
    const gl = this.gl;

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.postProgram);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(gl.getUniformLocation(this.postProgram, 'uTexture'), 0);
    gl.uniform1f(gl.getUniformLocation(this.postProgram, 'uMaxBrightness'), this.maxBrightness);

    gl.blendFunc(gl.ONE, gl.ONE); // additive
    gl.enable(gl.BLEND);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
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
