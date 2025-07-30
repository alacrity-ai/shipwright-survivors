// src/rendering/unified/passes/scene/GalaxyBackgroundRenderer.ts

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';

import galaxyBackgroundVertSrc from '@/rendering/unified/shaders/scene/galaxyBackground.vert?raw';
import galaxyBackgroundFragSrc from '@/rendering/unified/shaders/scene/galaxyBackground.frag?raw';

export class GalaxyBackgroundRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  private readonly uResolution: WebGLUniformLocation;
  private readonly uTime: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, galaxyBackgroundVertSrc, galaxyBackgroundFragSrc);
    this.quadBuffer = createQuadBuffer2(gl);
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.uResolution = gl.getUniformLocation(this.program, 'iResolution')!;
    this.uTime = gl.getUniformLocation(this.program, 'iTime')!;
  }

  render(timeSeconds: number): void {
    const { gl } = this;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.uniform2f(this.uResolution, canvas.width, canvas.height);
    gl.uniform1f(this.uTime, timeSeconds);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const { gl } = this;
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
  }
}
