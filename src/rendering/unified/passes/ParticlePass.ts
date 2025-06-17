// src/rendering/unified/passes/ParticlePass.ts

import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Camera } from '@/core/Camera';
import { createOrthographicMatrix, createTranslationMatrix } from '@/rendering/gl/matrixUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

import particleVertSrc from '@/rendering/unified/shaders/particlePass.vert?raw';
import particleFragSrc from '@/rendering/unified/shaders/particlePass.frag?raw';

function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('#')) hex = hex.slice(1);
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  return [r, g, b];
}

export class ParticlePass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private readonly uProjectionMatrix: WebGLUniformLocation;
  private readonly uViewMatrix: WebGLUniformLocation;

  constructor(gl: WebGL2RenderingContext, _cameraUBO: WebGLBuffer) {
    this.gl = gl;

    this.program = createProgramFromSources(gl, particleVertSrc, particleFragSrc);
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // === Static quad vertex attribute ===
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0); // aPosition
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0); // not instanced

    // === Instance attributes (buffer will be updated per frame) ===
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    const stride = 7 * 4; // 7 floats per instance, 4 bytes each

    // aParticlePos: vec2
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(1, 1);

    // aSize: float
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(2, 1);

    // aLifeRatio: float
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 12);
    gl.vertexAttribDivisor(3, 1);

    // aColor: vec3
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(4, 1);

    gl.bindVertexArray(null);

    this.uProjectionMatrix = gl.getUniformLocation(this.program, 'uProjectionMatrix')!;
    this.uViewMatrix = gl.getUniformLocation(this.program, 'uViewMatrix')!;
  }

  render(particles: Particle[], camera: Camera): void {
    const gl = this.gl;
    if (particles.length === 0) return;

    const stride = 7;
    const data = new Float32Array(particles.length * stride);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const base = i * stride;
      const [r, g, b] = hexToRgb(p.color);

      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = p.size;
      data[base + 3] = p.renderAlpha ?? 1.0;
      data[base + 4] = r;
      data[base + 5] = g;
      data[base + 6] = b;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    const zoom = camera.getZoom();
    const proj = createOrthographicMatrix(
      -camera.getViewportWidth() / (2 * zoom),
       camera.getViewportWidth() / (2 * zoom),
       camera.getViewportHeight() / (2 * zoom),
      -camera.getViewportHeight() / (2 * zoom)
    );
    const view = createTranslationMatrix(-camera.getPosition().x, -camera.getPosition().y);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.uProjectionMatrix, false, proj);
    gl.uniformMatrix4fv(this.uViewMatrix, false, view);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.bindVertexArray(this.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, particles.length);
    gl.bindVertexArray(null);

    gl.disable(gl.BLEND);
    gl.useProgram(null);
  }

  destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
  }
}
