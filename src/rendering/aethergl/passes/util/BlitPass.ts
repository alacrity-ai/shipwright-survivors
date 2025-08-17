import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

const blitVert = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 aCorner;

out vec2 vUV;

void main() {
  gl_Position = vec4(aCorner, 0.0, 1.0);
  vUV = aCorner * 0.5 + 0.5;
}
`;

const blitFrag = `#version 300 es
precision mediump float;

in vec2 vUV;
uniform sampler2D uInputTex;
out vec4 fragColor;

void main() {
  fragColor = texture(uInputTex, vUV);
}
`;

export class BlitPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly uInputTexLoc: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, blitVert, blitFrag);
    this.quadBuffer = createQuadBuffer(gl);
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.uInputTexLoc = gl.getUniformLocation(this.program, 'uInputTex')!;
  }

  /**
   * Draws the input texture to the currently bound framebuffer.
   */
  run(inputTex: WebGLTexture): void {
    const gl = this.gl;

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.uniform1i(this.uInputTexLoc, 0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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
