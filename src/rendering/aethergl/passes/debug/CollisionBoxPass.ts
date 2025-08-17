// src/rendering/unified/passes/CollisionBoxPass.ts

import type { Camera } from '@/core/Camera';
import { CollisionBoxManager } from '@/game/entities/collisionbox/CollisionBoxManager';
import { CollisionBoxStore } from '@/game/entities/collisionbox/CollisionBoxStore';

import collisionBoxVertSrc from '@/rendering/unified/shaders/debug/collisionBoxPass.vert?raw';
import collisionBoxFragSrc from '@/rendering/unified/shaders/debug/collisionBoxPass.frag?raw';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 as createQuadBuffer } from '@/rendering/unified/utils/bufferUtils';

// Each instance: center (2), halfSize (2), rotation (1) = 5 floats
const FLOATS_PER_INSTANCE = 5;
const MAX_BOXES = 10_000; // Matches CollisionBoxStore capacity
const INSTANCE_BUFFER_SIZE = MAX_BOXES * FLOATS_PER_INSTANCE;

export class CollisionBoxPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly instanceBuffer: WebGLBuffer;

  private readonly instanceData: Float32Array;
  private readonly uploadView: Float32Array;

  private instanceCount = 0;
  private dataIndex = 0;

  private readonly uniforms: {};

  // Reference to CollisionBoxStore for rendering
  private readonly store: CollisionBoxStore;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;

    // Shader program
    this.program = createProgramFromSources(gl, collisionBoxVertSrc, collisionBoxFragSrc);

    // Preallocate instance buffer
    this.instanceData = new Float32Array(INSTANCE_BUFFER_SIZE);
    this.uploadView = new Float32Array(this.instanceData.buffer);

    // Reference the CollisionBoxStore
    this.store = CollisionBoxManager.getInstance().getCollisionBoxStore();

    // Camera UBO binding (matches EntityPass)
    const blockIndex = gl.getUniformBlockIndex(this.program, 'CameraBlock');
    if (blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, blockIndex, 0);
    }

    // Setup VAO and buffers
    this.quadBuffer = createQuadBuffer(gl);
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);

    // Static quad geometry (attribute location 0)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(0, 0);

    // Instance buffer (center, half-size, rotation)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

    const stride = FLOATS_PER_INSTANCE * 4; // 20 bytes per instance
    let offset = 0;

    // location = 1 → vec2 aCenter
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(1, 1);
    offset += 8;

    // location = 2 → vec2 aHalfSize
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 8;

    // location = 3 → float aRotation
    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4;

    gl.bindVertexArray(null);

    // Allocate GPU buffer once (avoid orphaning)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, INSTANCE_BUFFER_SIZE * 4, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.uniforms = {};
  }

  /**
   * Adds a single collision box instance to the buffer.
   */
  private addInstance(centerX: number, centerY: number, halfWidth: number, halfHeight: number, rotation: number): void {
    if (this.dataIndex + FLOATS_PER_INSTANCE > INSTANCE_BUFFER_SIZE) {
      console.warn('CollisionBoxPass: instance buffer overflow, skipping');
      return;
    }
    const data = this.instanceData;
    const idx = this.dataIndex;

    data[idx] = centerX;
    data[idx + 1] = centerY;
    data[idx + 2] = halfWidth;
    data[idx + 3] = halfHeight;
    data[idx + 4] = rotation;

    this.dataIndex += FLOATS_PER_INSTANCE;
  }

  /**
   * Render all collision boxes as neon-green debug quads.
   */
  render(camera: Camera): void {
    const { gl, store } = this;

    this.dataIndex = 0;
    this.instanceCount = 0;

    // Collect all active boxes
    const { activeIndices, activeCount } = store;
    for (let i = 0; i < activeCount; i++) {
      const idx = activeIndices[i];

      const centerX = store.worldX[idx];
      const centerY = store.worldY[idx];
      const halfWidth = store.halfWidth[idx];
      const halfHeight = store.halfHeight[idx];
      const rotation = store.rotation[idx];

      this.addInstance(centerX, centerY, halfWidth, halfHeight, rotation);
    }

    this.instanceCount = this.dataIndex / FLOATS_PER_INSTANCE;
    if (this.instanceCount === 0) return;

    // Setup pipeline state
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Upload per-instance data
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.uploadView, 0, this.dataIndex);

    // Draw as instanced quads (2 triangles each)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  destroy(): void {
    const { gl } = this;
    if (gl.isBuffer(this.instanceBuffer)) gl.deleteBuffer(this.instanceBuffer);
    if (gl.isProgram(this.program)) gl.deleteProgram(this.program);
    if (gl.isBuffer(this.quadBuffer)) gl.deleteBuffer(this.quadBuffer);
    if (gl.isVertexArray(this.vao)) gl.deleteVertexArray(this.vao);
  }
}
