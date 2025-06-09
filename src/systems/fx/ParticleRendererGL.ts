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

  attribute vec2 aPosition;     // [-1, 1] unit quad
  attribute vec2 aParticlePos;  // world space
  attribute float aSize;
  attribute float aLifeRatio;
  attribute vec3 aColor;        // per-particle color

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 scaled = aPosition * aSize;  // Removed the 0.5 scaling
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

// Helper function to convert hex color to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 }; // default to white
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
    aColor: 4,  // Added color attribute
  };

  private readonly uniforms: {
    uProjectionMatrix: WebGLUniformLocation | null;
    uViewMatrix: WebGLUniformLocation | null;
  };

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    
    // Get the instanced arrays extension
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
      // Removed uColor since we're now using per-particle colors
    };
  }

  render(particles: Particle[], camera: Camera): void {
    const gl = this.gl;
    const ext = this.instanceExt!;
    
    if (!particles.length) return;

    gl.useProgram(this.program);

    // Setup additive blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    // Setup base quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 2, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(this.attribs.aPosition, 0);

    // Prepare instance data buffer: [x, y, size, lifeRatio, r, g, b]
    const stride = 7;  // Increased from 4 to 7 to include RGB
    const data = new Float32Array(particles.length * stride);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const base = i * stride;
      const rgb = hexToRgb(p.color);
      
      data[base + 0] = p.x;
      data[base + 1] = p.y;
      data[base + 2] = p.size;
      data[base + 3] = p.initialLife ? p.life / p.initialLife : 1.0;
      data[base + 4] = rgb.r;
      data[base + 5] = rgb.g;
      data[base + 6] = rgb.b;
    }

    // Upload instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

    // Set per-instance attributes
    gl.enableVertexAttribArray(this.attribs.aParticlePos);
    gl.vertexAttribPointer(this.attribs.aParticlePos, 2, gl.FLOAT, false, stride * 4, 0);
    ext.vertexAttribDivisorANGLE(this.attribs.aParticlePos, 1);

    gl.enableVertexAttribArray(this.attribs.aSize);
    gl.vertexAttribPointer(this.attribs.aSize, 1, gl.FLOAT, false, stride * 4, 8);
    ext.vertexAttribDivisorANGLE(this.attribs.aSize, 1);

    gl.enableVertexAttribArray(this.attribs.aLifeRatio);
    gl.vertexAttribPointer(this.attribs.aLifeRatio, 1, gl.FLOAT, false, stride * 4, 12);
    ext.vertexAttribDivisorANGLE(this.attribs.aLifeRatio, 1);

    // Add color attribute setup
    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride * 4, 16);
    ext.vertexAttribDivisorANGLE(this.attribs.aColor, 1);

    // Upload matrices
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

    // Draw all particles with their individual colors
    ext.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, particles.length);

    // Cleanup
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