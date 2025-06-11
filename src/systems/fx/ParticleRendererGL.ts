// src/systems/fx/ParticleRendererGL.ts

import type { Particle } from '@/systems/fx/interfaces/Particle';
import type { Camera } from '@/core/Camera';

import {
  createOrthographicMatrix,
  createTranslationMatrix,
} from '@/rendering/gl/matrixUtils';

import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';

const VERT_SHADER_SRC = `
  precision mediump float;

  attribute vec2 aPosition;
  attribute vec2 aParticlePos;
  attribute float aSize;
  attribute float aLifeRatio;
  attribute vec3 aColor;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 scaled = aPosition * aSize;
    vec2 world = scaled + aParticlePos;

    gl_Position = uProjectionMatrix * uViewMatrix * vec4(world, 0.0, 1.0);
    vAlpha = aLifeRatio;
    vColor = aColor;
  }
`;

const FRAG_SHADER_SRC = `
  precision mediump float;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 };
}

export class ParticleRendererGL {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;
  private readonly instanceExt: ANGLE_instanced_arrays | null;

  private readonly attribs = {
    aPosition: 0,
    aParticlePos: 1,
    aSize: 2,
    aLifeRatio: 3,
    aColor: 4,
  };

  private readonly uniforms: {
    uProjectionMatrix: WebGLUniformLocation | null;
    uViewMatrix: WebGLUniformLocation | null;
  };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;

    this.instanceExt = gl.getExtension('ANGLE_instanced_arrays');
    if (!this.instanceExt) {
      throw new Error('ANGLE_instanced_arrays extension is required but not supported');
    }

    this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;

    this.uniforms = {
      uProjectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
      uViewMatrix: gl.getUniformLocation(this.program, 'uViewMatrix'),
    };
  }

  render(particles: Particle[], camera: Camera): void {
    const gl = this.gl;
    const ext = this.instanceExt!;

    if (!particles.length) return;

    gl.useProgram(this.program);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 2, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(this.attribs.aPosition, 0);

    // Prepare instance buffer: [x, y, size, renderAlpha, r, g, b]
    const stride = 7;
    const data = new Float32Array(particles.length * stride);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const base = i * stride;
      const rgb = hexToRgb(p.color);

      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = p.size;
      data[base + 3] = p.renderAlpha ?? 1.0; // <== new logic here
      data[base + 4] = rgb.r;
      data[base + 5] = rgb.g;
      data[base + 6] = rgb.b;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(this.attribs.aParticlePos);
    gl.vertexAttribPointer(this.attribs.aParticlePos, 2, gl.FLOAT, false, stride * 4, 0);
    ext.vertexAttribDivisorANGLE(this.attribs.aParticlePos, 1);

    gl.enableVertexAttribArray(this.attribs.aSize);
    gl.vertexAttribPointer(this.attribs.aSize, 1, gl.FLOAT, false, stride * 4, 8);
    ext.vertexAttribDivisorANGLE(this.attribs.aSize, 1);

    gl.enableVertexAttribArray(this.attribs.aLifeRatio);
    gl.vertexAttribPointer(this.attribs.aLifeRatio, 1, gl.FLOAT, false, stride * 4, 12);
    ext.vertexAttribDivisorANGLE(this.attribs.aLifeRatio, 1);

    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride * 4, 16);
    ext.vertexAttribDivisorANGLE(this.attribs.aColor, 1);

    const proj = createOrthographicMatrix(
      -camera.getViewportWidth() / (2 * camera.getZoom()),
       camera.getViewportWidth() / (2 * camera.getZoom()),
       camera.getViewportHeight() / (2 * camera.getZoom()),
      -camera.getViewportHeight() / (2 * camera.getZoom())
    );
    const camPos = camera.getPosition();
    const view = createTranslationMatrix(-camPos.x, -camPos.y);

    gl.uniformMatrix4fv(this.uniforms.uProjectionMatrix, false, proj);
    gl.uniformMatrix4fv(this.uniforms.uViewMatrix, false, view);

    ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, particles.length);

    gl.disableVertexAttribArray(this.attribs.aPosition);
    gl.disableVertexAttribArray(this.attribs.aParticlePos);
    gl.disableVertexAttribArray(this.attribs.aSize);
    gl.disableVertexAttribArray(this.attribs.aLifeRatio);
    gl.disableVertexAttribArray(this.attribs.aColor);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.useProgram(null);
    gl.disable(gl.BLEND);
  }

  destroy(): void {
    this.gl.deleteBuffer(this.instanceBuffer);
    this.gl.deleteBuffer(this.quadBuffer);
    this.gl.deleteProgram(this.program);
  }
}
