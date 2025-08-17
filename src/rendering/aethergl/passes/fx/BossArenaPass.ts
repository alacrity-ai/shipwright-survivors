// src/game/boss/rendering/BossArenaRenderer.ts

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

// Shaders (imported raw)
import bossArenaVertSrc from '@/rendering/unified/shaders/fx/bossArenaRenderer.vert?raw';
import bossArenaFragSrc from '@/rendering/unified/shaders/fx/bossArenaRenderer.frag?raw';

export class BossArenaPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  // Uniform locations
  private readonly timeLoc: WebGLUniformLocation | null;
  private readonly stateLoc: WebGLUniformLocation | null;
  private readonly formProgressLoc: WebGLUniformLocation | null;
  private readonly arenaCenterLoc: WebGLUniformLocation | null;
  private readonly arenaRadiusLoc: WebGLUniformLocation | null;
  private readonly thicknessLoc: WebGLUniformLocation | null;
  private readonly baseColorLoc: WebGLUniformLocation | null;
  private readonly pulseColorLoc: WebGLUniformLocation | null;
  private readonly streamColorLoc: WebGLUniformLocation | null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Compile and link shaders
    this.program = createProgramFromSources(this.gl, bossArenaVertSrc, bossArenaFragSrc);

    // Bind CameraMatrices UBO (binding point 0)
    const blockIndex = this.gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIndex !== this.gl.INVALID_INDEX) {
      this.gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // Setup quad VAO
    this.quadBuffer = createQuadBuffer(this.gl);
    this.vao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.enableVertexAttribArray(0); // layout(location = 0)
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.bindVertexArray(null);

    // Cache uniform locations
    this.timeLoc = gl.getUniformLocation(this.program, 'uTime');
    this.stateLoc = gl.getUniformLocation(this.program, 'uState');
    this.formProgressLoc = gl.getUniformLocation(this.program, 'uFormProgress');
    this.arenaCenterLoc = gl.getUniformLocation(this.program, 'uArenaCenter');
    this.arenaRadiusLoc = gl.getUniformLocation(this.program, 'uArenaRadius');
    this.thicknessLoc = gl.getUniformLocation(this.program, 'uWallThickness');
    this.baseColorLoc = gl.getUniformLocation(this.program, 'uBaseColor');
    this.pulseColorLoc = gl.getUniformLocation(this.program, 'uPulseColor');
    this.streamColorLoc = gl.getUniformLocation(this.program, 'uStreamColor');
  }

  /**
   * Render the boss arena wall (in world space).
   * @param state Arena render mode: 0 = idle, 1 = forming, 2 = pulsing
   * @param time Global time (seconds)
   * @param formProgress Progress [0, 1] for forming animation
   * @param arenaCenter World-space center of arena
   * @param arenaRadius Radius in world units
   * @param wallThickness Thickness of the energy ring (normalized)
   * @param baseColor Base RGB tone
   * @param pulseColor Pulse RGB tone
   * @param streamColor Accent stream RGB tone
   */
  render(
    state: number,
    time: number,
    formProgress: number,
    arenaCenter: [number, number],
    arenaRadius: number,
    wallThickness: number = 0.1,
    baseColor: [number, number, number] = [0.8, 0.2, 0.2],
    pulseColor: [number, number, number] = [1.0, 0.1, 0.1],
    streamColor: [number, number, number] = [1.0, 0.0, 0.3],
  ): void {
    const gl = this.gl;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Upload uniforms - note that uWallThickness is now used in both vertex and fragment shaders
    if (this.timeLoc) gl.uniform1f(this.timeLoc, time);
    if (this.stateLoc) gl.uniform1i(this.stateLoc, state);
    if (this.formProgressLoc) gl.uniform1f(this.formProgressLoc, formProgress);
    if (this.arenaCenterLoc) gl.uniform2f(this.arenaCenterLoc, arenaCenter[0], arenaCenter[1]);
    if (this.arenaRadiusLoc) gl.uniform1f(this.arenaRadiusLoc, arenaRadius);
    if (this.thicknessLoc) gl.uniform1f(this.thicknessLoc, wallThickness);
    if (this.baseColorLoc) gl.uniform3f(this.baseColorLoc, ...baseColor);
    if (this.pulseColorLoc) gl.uniform3f(this.pulseColorLoc, ...pulseColor);
    if (this.streamColorLoc) gl.uniform3f(this.streamColorLoc, ...streamColor);

    // Enable transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw unit quad (scaled in shader)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
  }
}