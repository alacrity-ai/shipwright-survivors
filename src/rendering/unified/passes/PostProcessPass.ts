import postVertSrc from '@/rendering/unified/shaders/postprocess/postprocess.vert?raw';
import bwFragSrc from '@/rendering/unified/shaders/postprocess/blackwhite.frag?raw';
import bloomFragSrc from '@/rendering/unified/shaders/postprocess/bloom.frag?raw';
import sepiaFragSrc from '@/rendering/unified/shaders/postprocess/sepia.frag?raw';
import passthroughFragSrc from '@/rendering/unified/shaders/postprocess/passthrough.frag?raw';
import chromaticAberrationFragSrc from '@/rendering/unified/shaders/postprocess/chromaticAberration.frag?raw';
import cinematicGradingFragSrc from '@/rendering/unified/shaders/postprocess/cinematicGrading.frag?raw';
import underwaterFragSrc from '@/rendering/unified/shaders/postprocess/underwater.frag?raw';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';

export type PostEffectName =
  | 'passthrough'
  | 'blackwhite'
  | 'sepia'
  | 'bloom'
  | 'chromaticAberration'
  | 'cinematicGrading'
  | 'underwater';

export interface CinematicGradingParams {
  exposure?: number;           // Default: 1.0
  contrast?: number;           // Default: 1.1
  saturation?: number;         // Default: 1.05
  temperature?: number;        // Default: 0.0, range: -1.0 to 1.0
  tint?: number;               // Default: 0.0, range: -1.0 to 1.0
  vignetteStrength?: number;   // Default: 0.3
  filmGrainStrength?: number;  // Default: 0.1
  shadowsLift?: number;        // Default: 0.0
  highlightsGain?: number;     // Default: 1.0
  cinematicIntensity?: number; // Default: 1.0
}

export interface UnderwaterParams {
  waveIntensity?: number;     // Default: 0.015
  waveSpeed?: number;         // Default: 1.0
  causticIntensity?: number;  // Default: 0.3
  depthTint?: number;         // Default: 0.6
  bubbleIntensity?: number;   // Default: 0.1
  distortionAmount?: number;  // Default: 0.008
}

export class PostProcessPass {
  private readonly gl: WebGL2RenderingContext;

  private readonly programs: Record<PostEffectName, WebGLProgram>;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private readonly fbos: WebGLFramebuffer[] = [];
  private readonly textures: WebGLTexture[] = [];
  private readonly width: number;
  private readonly height: number;

  private startTime: number = Date.now();

  constructor(gl: WebGL2RenderingContext, width: number, height: number) {
    this.gl = gl;
    this.width = width;
    this.height = height;

    this.programs = {
      passthrough: createProgramFromSources(gl, postVertSrc, passthroughFragSrc),
      blackwhite: createProgramFromSources(gl, postVertSrc, bwFragSrc),
      sepia: createProgramFromSources(gl, postVertSrc, sepiaFragSrc),
      bloom: createProgramFromSources(gl, postVertSrc, bloomFragSrc),
      chromaticAberration: createProgramFromSources(gl, postVertSrc, chromaticAberrationFragSrc),
      cinematicGrading: createProgramFromSources(gl, postVertSrc, cinematicGradingFragSrc),
      underwater: createProgramFromSources(gl, postVertSrc, underwaterFragSrc),
    };

    this.quadBuffer = createQuadBuffer2(gl);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    for (let i = 0; i < 2; i++) {
      const fbo = gl.createFramebuffer()!;
      const tex = gl.createTexture()!;

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

      this.fbos.push(fbo);
      this.textures.push(tex);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /**
   * Applies a chain of post-process effects and composites the final texture to screen.
   */
  public run(
    inputTexture: WebGLTexture,
    effectChain: { effect: PostEffectName; params?: CinematicGradingParams | UnderwaterParams }[]
  ): void {
    const gl = this.gl;
    let readTex = inputTexture;
    let writeIndex = 0;

    for (let i = 0; i < effectChain.length; i++) {
      const { effect, params } = effectChain[i];
      const program = this.programs[effect];
      const writeFbo = this.fbos[writeIndex];

      gl.bindFramebuffer(gl.FRAMEBUFFER, writeFbo);
      gl.viewport(0, 0, this.width, this.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);
      gl.bindVertexArray(this.vao);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, readTex);
      gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

      // === Effect-specific uniforms ===
      if (effect === 'bloom') {
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(program, 'uThreshold'), 0.92);
        gl.uniform1f(gl.getUniformLocation(program, 'uIntensity'), 1.2);
        gl.uniform1f(gl.getUniformLocation(program, 'uBlurSize'), 8.0);
      } else if (effect === 'chromaticAberration') {
        gl.uniform1f(gl.getUniformLocation(program, 'uStrength'), 0.003);
        gl.uniform1f(gl.getUniformLocation(program, 'uFalloff'), 1.8);
      } else if (effect === 'cinematicGrading') {
        const p = params as CinematicGradingParams ?? {};
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), (Date.now() - this.startTime) / 1000.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uExposure'), p.exposure ?? 1.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uContrast'), p.contrast ?? 1.1);
        gl.uniform1f(gl.getUniformLocation(program, 'uSaturation'), p.saturation ?? 1.05);
        gl.uniform1f(gl.getUniformLocation(program, 'uTemperature'), p.temperature ?? 0.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uTint'), p.tint ?? 0.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uVignetteStrength'), p.vignetteStrength ?? 0.3);
        gl.uniform1f(gl.getUniformLocation(program, 'uFilmGrainStrength'), p.filmGrainStrength ?? 0.1);
        gl.uniform1f(gl.getUniformLocation(program, 'uShadowsLift'), p.shadowsLift ?? 0.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uHighlightsGain'), p.highlightsGain ?? 1.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uCinematicIntensity'), p.cinematicIntensity ?? 1.0);
      } else if (effect === 'underwater') {
        const p = params as UnderwaterParams ?? {};
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), this.width, this.height);
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), (Date.now() - this.startTime) / 1000.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uWaveIntensity'), p.waveIntensity ?? 0.015);
        gl.uniform1f(gl.getUniformLocation(program, 'uWaveSpeed'), p.waveSpeed ?? 1.0);
        gl.uniform1f(gl.getUniformLocation(program, 'uCausticIntensity'), p.causticIntensity ?? 0.3);
        gl.uniform1f(gl.getUniformLocation(program, 'uDepthTint'), p.depthTint ?? 0.6);
        gl.uniform1f(gl.getUniformLocation(program, 'uBubbleIntensity'), p.bubbleIntensity ?? 0.1);
        gl.uniform1f(gl.getUniformLocation(program, 'uDistortionAmount'), p.distortionAmount ?? 0.008);
      }

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.bindVertexArray(null);
      gl.useProgram(null);

      readTex = this.textures[writeIndex];
      writeIndex = 1 - writeIndex;
    }

    // === Final composite to screen ===
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

    const program = this.programs['passthrough'];
    gl.useProgram(program);
    gl.bindVertexArray(this.vao);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, readTex);
    gl.uniform1i(gl.getUniformLocation(program, 'uTexture'), 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  public destroy(): void {
    const gl = this.gl;

    for (const key in this.programs) {
      const program = this.programs[key as PostEffectName];
      if (gl.isProgram(program)) {
        gl.deleteProgram(program);
      }
    }

    for (const fbo of this.fbos) {
      if (gl.isFramebuffer(fbo)) {
        gl.deleteFramebuffer(fbo);
      }
    }

    for (const tex of this.textures) {
      if (gl.isTexture(tex)) {
        gl.deleteTexture(tex);
      }
    }

    if (gl.isBuffer(this.quadBuffer)) {
      gl.deleteBuffer(this.quadBuffer);
    }

    if (gl.isVertexArray(this.vao)) {
      gl.deleteVertexArray(this.vao);
    }
  }
}
