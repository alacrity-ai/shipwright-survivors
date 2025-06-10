import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from './lights/types';
import {
  VERT_SHADER_SRC,
  FRAG_SHADER_SRC,
  POST_VERT_SHADER_SRC,
  POST_FRAG_SHADER_SRC,
  BEAM_VERT_SHADER_SRC,
  BEAM_FRAG_SHADER_SRC,
} from './webgl/defaultShaders';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';

export class LightingRenderer {
  private readonly gl: WebGLRenderingContext;

  private lightProgram!: WebGLProgram;
  private postProgram!: WebGLProgram;
  private beamProgram!: WebGLProgram;

  private quadBuffer!: WebGLBuffer;

  private framebuffer!: WebGLFramebuffer;
  private colorTexture!: WebGLTexture;
  private framebufferWidth!: number;
  private framebufferHeight!: number;

  private resolutionScale: number = 0.2;
  private framebufferDirty: boolean = false;

  private clearColor: [number, number, number, number] = [0, 0, 0, 0];
  private maxBrightness: number = 1;

  private lightUniforms: Record<string, WebGLUniformLocation | null> = {};
  private beamUniforms: Record<string, WebGLUniformLocation | null> = {};
  private postUniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initializeGL();
    this.initializeFramebuffer();
  }

  private initializeGL(): void {
    const gl = this.gl;

    this.lightProgram = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.postProgram = createProgramFromSources(gl, POST_VERT_SHADER_SRC, POST_FRAG_SHADER_SRC);
    this.beamProgram = createProgramFromSources(gl, BEAM_VERT_SHADER_SRC, BEAM_FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);

    // Lighting shader uniforms (removed individual brightness capping)
    this.lightUniforms.uResolution = gl.getUniformLocation(this.lightProgram, 'uResolution');
    this.lightUniforms.uLightPosition = gl.getUniformLocation(this.lightProgram, 'uLightPosition');
    this.lightUniforms.uRadius = gl.getUniformLocation(this.lightProgram, 'uRadius');
    this.lightUniforms.uColor = gl.getUniformLocation(this.lightProgram, 'uColor');
    this.lightUniforms.uIntensity = gl.getUniformLocation(this.lightProgram, 'uIntensity');
    this.lightUniforms.uFalloff = gl.getUniformLocation(this.lightProgram, 'uFalloff');

    // Beam shader uniforms
    this.beamUniforms.uStart = gl.getUniformLocation(this.beamProgram, 'uStart');
    this.beamUniforms.uEnd = gl.getUniformLocation(this.beamProgram, 'uEnd');
    this.beamUniforms.uWidth = gl.getUniformLocation(this.beamProgram, 'uWidth');
    this.beamUniforms.uColor = gl.getUniformLocation(this.beamProgram, 'uColor');
    this.beamUniforms.uIntensity = gl.getUniformLocation(this.beamProgram, 'uIntensity');
    this.beamUniforms.uFalloff = gl.getUniformLocation(this.beamProgram, 'uFalloff');
    this.beamUniforms.uResolution = gl.getUniformLocation(this.beamProgram, 'uResolution');

    // Postprocessing shader uniforms (added maxBrightness)
    this.postUniforms.uTexture = gl.getUniformLocation(this.postProgram, 'uTexture');
    this.postUniforms.uMaxBrightness = gl.getUniformLocation(this.postProgram, 'uMaxBrightness');

    gl.enable(gl.BLEND);
  }

  private initializeFramebuffer(): void {
    const gl = this.gl;

    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    if (this.colorTexture) gl.deleteTexture(this.colorTexture);

    const width = gl.drawingBufferWidth * this.resolutionScale;
    const height = gl.drawingBufferHeight * this.resolutionScale;
    this.framebufferWidth = Math.max(1, Math.floor(width));
    this.framebufferHeight = Math.max(1, Math.floor(height));

    this.colorTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebufferWidth, this.framebufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.framebuffer = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTexture, 0);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  public render(lights: AnyLightInstance[], camera: Camera): void {
    const gl = this.gl;

    if (this.framebufferDirty) {
      this.initializeFramebuffer();
      this.framebufferDirty = false;
    }

    // === Pass 1: render lights to low-res framebuffer ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.framebufferWidth, this.framebufferHeight);
    gl.clearColor(...this.clearColor);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Changed blending function

    for (const light of lights) {
      if (light.type === 'point') {
        gl.useProgram(this.lightProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(this.lightUniforms.uResolution, this.framebufferWidth, this.framebufferHeight);
        // Removed uMaxBrightness uniform - no longer capping individual lights

        const screen = camera.worldToScreen(light.x, light.y);
        const scaledX = screen.x * this.resolutionScale;
        const scaledY = screen.y * this.resolutionScale;
        const rgba = this.hexToRgbaVec4(light.color);

        gl.uniform2f(this.lightUniforms.uLightPosition, scaledX, scaledY);
        gl.uniform1f(this.lightUniforms.uRadius, light.radius * camera.getZoom() * this.resolutionScale);
        gl.uniform4fv(this.lightUniforms.uColor, rgba);
        gl.uniform1f(this.lightUniforms.uIntensity, light.intensity);
        gl.uniform1f(this.lightUniforms.uFalloff, light.animationPhase ?? 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }

      else if (light.type === 'beam') {
        gl.useProgram(this.beamProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(this.beamUniforms.uResolution, this.framebufferWidth, this.framebufferHeight);

        const start = camera.worldToScreen(light.start.x, light.start.y);
        const end = camera.worldToScreen(light.end.x, light.end.y);

        const scaledStartX = start.x * this.resolutionScale;
        const scaledStartY = this.framebufferHeight - start.y * this.resolutionScale;
        const scaledEndX = end.x * this.resolutionScale;
        const scaledEndY = this.framebufferHeight - end.y * this.resolutionScale;

        gl.uniform2f(this.beamUniforms.uStart, scaledStartX, scaledStartY);
        gl.uniform2f(this.beamUniforms.uEnd, scaledEndX, scaledEndY);
        gl.uniform1f(this.beamUniforms.uWidth, light.width * camera.getZoom() * this.resolutionScale);
        gl.uniform4fv(this.beamUniforms.uColor, this.hexToRgbaVec4(light.color));
        gl.uniform1f(this.beamUniforms.uIntensity, light.intensity);
        gl.uniform1f(this.beamUniforms.uFalloff, light.animationPhase ?? 1.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // === Pass 2: apply brightness capping and render to screen ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    gl.useProgram(this.postProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(this.postUniforms.uTexture, 0);
    gl.uniform1f(this.postUniforms.uMaxBrightness, this.maxBrightness); // Cap total accumulated brightness

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public resize(): void {
    this.framebufferDirty = true;
  }

  public setResolutionScale(scale: number): void {
    if (scale <= 0 || scale > 1) throw new Error('[LightingRenderer] resolutionScale must be between 0 and 1');
    this.resolutionScale = scale;
    this.framebufferDirty = true;
  }

  public setMaxBrightness(value: number): void {
    this.maxBrightness = value;
  }

  public setClearColor(r: number, g: number, b: number, a: number): void {
    this.clearColor = [r, g, b, a];
  }

  private hexToRgbaVec4(hex: string): [number, number, number, number] {
    if (hex.startsWith('#')) hex = hex.slice(1);
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const a = hex.length === 8 ? parseInt(hex.substring(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }

  public destroy(): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.useProgram(null);

    if (gl.isProgram(this.lightProgram)) gl.deleteProgram(this.lightProgram);
    if (gl.isProgram(this.beamProgram)) gl.deleteProgram(this.beamProgram);
    if (gl.isProgram(this.postProgram)) gl.deleteProgram(this.postProgram);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isTexture(this.colorTexture)) gl.deleteTexture(this.colorTexture);
    if (gl.isFramebuffer(this.framebuffer)) gl.deleteFramebuffer(this.framebuffer);

    // Clear the canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    console.log('[LightingRenderer] Destroyed and cleared all GL state.');
  }
}
