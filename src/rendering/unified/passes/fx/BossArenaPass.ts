// src/game/boss/rendering/BossArenaRenderer.ts

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import { CanvasManager } from '@/core/CanvasManager';

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

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Compile/link shaders
    this.program = createProgramFromSources(this.gl, bossArenaVertSrc, bossArenaFragSrc);

    // Bind CameraMatrices UBO (projection + view)
    const blockIndex = this.gl.getUniformBlockIndex(this.program, 'CameraMatrices');
    if (blockIndex !== this.gl.INVALID_INDEX) {
      this.gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // Create unit quad (-1..1) in local space
    this.quadBuffer = createQuadBuffer(this.gl);
    this.vao = this.gl.createVertexArray()!;

    this.gl.bindVertexArray(this.vao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    this.gl.enableVertexAttribArray(0); // layout(location = 0)
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.bindVertexArray(null);

    // Cache uniform locations
    this.timeLoc = this.gl.getUniformLocation(this.program, 'uTime');
    this.stateLoc = this.gl.getUniformLocation(this.program, 'uState');
    this.formProgressLoc = this.gl.getUniformLocation(this.program, 'uFormProgress');
    this.arenaCenterLoc = this.gl.getUniformLocation(this.program, 'uArenaCenter');
    this.arenaRadiusLoc = this.gl.getUniformLocation(this.program, 'uArenaRadius');
  }

  /**
   * Render the boss arena wall (in world space).
   * @param state 0 = idle, 1 = forming, 2 = pulsing
   * @param time Global time (seconds)
   * @param formProgress Progress [0,1] for forming animation (used only in forming state)
   * @param arenaCenter [x, y] in world coordinates
   * @param arenaRadius Radius in world units
   */
  render(
    state: number,
    time: number,
    formProgress: number,
    arenaCenter: [number, number],
    arenaRadius: number
  ): void {
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Upload uniforms
    if (this.timeLoc) gl.uniform1f(this.timeLoc, time);
    if (this.stateLoc) gl.uniform1i(this.stateLoc, state);
    if (this.formProgressLoc) gl.uniform1f(this.formProgressLoc, formProgress);
    if (this.arenaCenterLoc) gl.uniform2f(this.arenaCenterLoc, arenaCenter[0], arenaCenter[1]);
    if (this.arenaRadiusLoc) gl.uniform1f(this.arenaRadiusLoc, arenaRadius);

    // Enable alpha blending (transparent ring)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Draw single quad (scaled/positioned in vertex shader)
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
