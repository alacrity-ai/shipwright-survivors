import type { Camera } from '@/core/Camera';
import type { AnyLightInstance } from './lights/types';
import { createProgramFromSources } from './webgl/shaderUtils';
import { createQuadBuffer } from './webgl/bufferUtils';
import { VERT_SHADER_SRC, FRAG_SHADER_SRC } from './webgl/defaultShaders';
import { POST_VERT_SHADER_SRC, POST_FRAG_SHADER_SRC, BEAM_VERT_SHADER_SRC, BEAM_FRAG_SHADER_SRC } from './webgl/defaultShaders';

export class LightingRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly canvas: HTMLCanvasElement;

  private lightProgram!: WebGLProgram;
  private postProgram!: WebGLProgram;

  private beamProgram!: WebGLProgram;
  private beamUniforms: Record<string, WebGLUniformLocation | null> = {};

  private quadBuffer!: WebGLBuffer;

  private framebuffer!: WebGLFramebuffer;
  private colorTexture!: WebGLTexture;
  private framebufferWidth!: number;
  private framebufferHeight!: number;

  private resolutionScale: number = 0.1;
  private framebufferDirty: boolean = false;

  private clearColor: [number, number, number, number] = [0, 0, 0, 0];
  private maxBrightness: number = 0.8;

  private lightUniforms: Record<string, WebGLUniformLocation | null> = {};
  private postUniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    this.canvas = canvas;
    this.initializeGL();
    this.initializeFramebuffer();
  }

  private initializeGL(): void {
    const gl = this.gl;

    this.lightProgram = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.postProgram = createProgramFromSources(gl, POST_VERT_SHADER_SRC, POST_FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);

    // Lighting shader uniforms
    this.lightUniforms.uResolution = gl.getUniformLocation(this.lightProgram, 'uResolution');
    this.lightUniforms.uLightPosition = gl.getUniformLocation(this.lightProgram, 'uLightPosition');
    this.lightUniforms.uRadius = gl.getUniformLocation(this.lightProgram, 'uRadius');
    this.lightUniforms.uColor = gl.getUniformLocation(this.lightProgram, 'uColor');
    this.lightUniforms.uIntensity = gl.getUniformLocation(this.lightProgram, 'uIntensity');
    this.lightUniforms.uFalloff = gl.getUniformLocation(this.lightProgram, 'uFalloff');
    this.lightUniforms.uMaxBrightness = gl.getUniformLocation(this.lightProgram, 'uMaxBrightness');

    // Beam shader uniforms
    this.beamProgram = createProgramFromSources(gl, BEAM_VERT_SHADER_SRC, BEAM_FRAG_SHADER_SRC);
    this.beamUniforms.uStart = gl.getUniformLocation(this.beamProgram, 'uStart');
    this.beamUniforms.uEnd = gl.getUniformLocation(this.beamProgram, 'uEnd');
    this.beamUniforms.uWidth = gl.getUniformLocation(this.beamProgram, 'uWidth');
    this.beamUniforms.uColor = gl.getUniformLocation(this.beamProgram, 'uColor');
    this.beamUniforms.uIntensity = gl.getUniformLocation(this.beamProgram, 'uIntensity');
    this.beamUniforms.uFalloff = gl.getUniformLocation(this.beamProgram, 'uFalloff');
    this.beamUniforms.uResolution = gl.getUniformLocation(this.beamProgram, 'uResolution'); // Add this line

    // Postprocessing shader uniforms
    this.postUniforms.uTexture = gl.getUniformLocation(this.postProgram, 'uTexture');

    gl.enable(gl.BLEND);
  }

  private initializeFramebuffer(): void {
    const gl = this.gl;

    if (this.framebuffer) gl.deleteFramebuffer(this.framebuffer);
    if (this.colorTexture) gl.deleteTexture(this.colorTexture);

    const width = this.canvas.width * this.resolutionScale;
    const height = this.canvas.height * this.resolutionScale;
    this.framebufferWidth = Math.max(1, Math.floor(width));
    this.framebufferHeight = Math.max(1, Math.floor(height));

    // Create render texture
    this.colorTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.framebufferWidth,
      this.framebufferHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Create framebuffer
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

    gl.blendFunc(gl.ONE, gl.ONE); // additive blending

    for (const light of lights) {
      if (light.type === 'point') {
        gl.useProgram(this.lightProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.uniform2f(this.lightUniforms.uResolution, this.framebufferWidth, this.framebufferHeight);
        gl.uniform1f(this.lightUniforms.uMaxBrightness, this.maxBrightness);

        const screen = camera.worldToScreen(light.x, light.y);
        const scaledX = screen.x * this.resolutionScale;
        const scaledY = screen.y * this.resolutionScale;

        const rgba = this.hexToRgbaVec4(light.color);
        const radius = light.radius * camera.zoom * this.resolutionScale;
        const intensity = light.intensity;
        const falloff = light.animationPhase ?? 1.0;

        gl.uniform2f(this.lightUniforms.uLightPosition, scaledX, scaledY);
        gl.uniform1f(this.lightUniforms.uRadius, radius);
        gl.uniform4fv(this.lightUniforms.uColor, rgba);
        gl.uniform1f(this.lightUniforms.uIntensity, intensity);
        gl.uniform1f(this.lightUniforms.uFalloff, falloff);

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
        const scaledStartY = start.y * this.resolutionScale;
        const scaledEndX = end.x * this.resolutionScale;
        const scaledEndY = end.y * this.resolutionScale;

        // === Apply Y-flip to match WebGL framebuffer space ===
        const flippedStartY = this.framebufferHeight - scaledStartY;
        const flippedEndY = this.framebufferHeight - scaledEndY;

        const rgba = this.hexToRgbaVec4(light.color);
        const width = light.width * camera.zoom * this.resolutionScale;
        const intensity = light.intensity;
        const falloff = light.animationPhase ?? 1.0;

        gl.uniform2f(this.beamUniforms.uStart, scaledStartX, flippedStartY);
        gl.uniform2f(this.beamUniforms.uEnd, scaledEndX, flippedEndY);
        gl.uniform1f(this.beamUniforms.uWidth, width);
        gl.uniform4fv(this.beamUniforms.uColor, rgba);
        gl.uniform1f(this.beamUniforms.uIntensity, intensity);
        gl.uniform1f(this.beamUniforms.uFalloff, falloff);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    // === Pass 2: stretch to canvas ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.postProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture);
    gl.uniform1i(this.postUniforms.uTexture, 0);

    gl.blendFunc(gl.ONE, gl.ONE); // maintain additive blending
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.framebufferDirty = true;
  }

  public setResolutionScale(scale: number): void {
    if (scale <= 0 || scale > 1) {
      throw new Error('[LightingRenderer] resolutionScale must be between 0 and 1');
    }
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
    let r = 1, g = 1, b = 1, a = 1;
    if (hex.startsWith('#')) hex = hex.slice(1);
    if (hex.length === 6 || hex.length === 8) {
      r = parseInt(hex.substring(0, 2), 16) / 255;
      g = parseInt(hex.substring(2, 4), 16) / 255;
      b = parseInt(hex.substring(4, 6), 16) / 255;
      if (hex.length === 8) {
        a = parseInt(hex.substring(6, 8), 16) / 255;
      }
    }
    return [r, g, b, a];
  }

  public destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.lightProgram);
    gl.deleteProgram(this.beamProgram);
    gl.deleteProgram(this.postProgram);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteTexture(this.colorTexture);
    gl.deleteFramebuffer(this.framebuffer);
  }
}
