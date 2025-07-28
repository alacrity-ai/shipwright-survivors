// src/systems/galaxymap/GalaxyMapRenderer.ts (Safe Version)

import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';
import type { GalaxyMapCamera } from '@/systems/galaxymap/camera/GalaxyMapCamera';
import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';

import { missionUnlocked } from '@/systems/galaxymap/helpers/missionUnlocked';
import { vec3FromValues } from '@/systems/galaxymap/webgl/vectorUtils';
import { createSphere } from '@/systems/galaxymap/helpers/createSphere';
import { lookAt } from '@/systems/galaxymap/helpers/lookAt';
import { createMatrix4, perspective } from './webgl/matrixUtils';
import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { loadImage } from '@/shared/imageCache';
import { getAssetPath } from '@/shared/assetHelpers';

import planetVertSrc from '@/systems/galaxymap/shaders/planets.vert?raw';
import planetFragSrc from '@/systems/galaxymap/shaders/planets.frag?raw';
import { CanvasManager } from '@/core/CanvasManager';

export class GalaxyMapRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly camera: GalaxyMapCamera;

  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private positionBuffer: WebGLBuffer;
  private normalBuffer: WebGLBuffer;
  private uvBuffer: WebGLBuffer;
  private indexBuffer: WebGLBuffer;
  private instanceBuffer: WebGLBuffer;

  private readonly sphere = createSphere(1, 24);
  private readonly dataBuffer: Float32Array;

  private readonly MAX_PLANETS = 256;
  private planetTextures: Map<string, WebGLTexture> = new Map();

  // Uniform locations
  private viewMatrixLoc: WebGLUniformLocation | null = null;
  private projectionMatrixLoc: WebGLUniformLocation | null = null;
  private timeLoc: WebGLUniformLocation | null = null;
  private lightPosLoc: WebGLUniformLocation | null = null;
  private lightColorLoc: WebGLUniformLocation | null = null;
  private ambientColorLoc: WebGLUniformLocation | null = null;
  private samplerLoc: WebGLUniformLocation | null = null;

  private time = 0;

  constructor(gl: WebGL2RenderingContext, camera: GalaxyMapCamera) {
    this.gl = gl;
    this.camera = camera;

    this.dataBuffer = new Float32Array(this.MAX_PLANETS * 9);
    this.program = createProgramFromSources(gl, planetVertSrc, planetFragSrc);

    this.positionBuffer = gl.createBuffer()!;
    this.normalBuffer = gl.createBuffer()!;
    this.uvBuffer = gl.createBuffer()!;
    this.indexBuffer = gl.createBuffer()!;
    this.instanceBuffer = gl.createBuffer()!;
    this.vao = gl.createVertexArray()!;

    this.setupBuffers();
    this.fetchUniformLocations();
  }

  public async preloadTextures(planets: LocationDefinition[]): Promise<void> {
    const gl = this.gl;
    for (const planet of planets) {
      if (!planet.texture || this.planetTextures.has(planet.id)) continue;

      const img = await loadImage(getAssetPath(planet.texture));
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      this.planetTextures.set(planet.id, tex);
    }
  }

  private setupBuffers(): void {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);

    // Sphere attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.sphere.vertices, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.sphere.normals, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.sphere.uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(7);
    gl.vertexAttribPointer(7, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.sphere.indices, gl.STATIC_DRAW);

    // Instance attributes
    const stride = 9 * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.MAX_PLANETS * stride, gl.DYNAMIC_DRAW);

    let offset = 0;
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(2, 1);
    offset += 12;

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(3, 1);
    offset += 4;

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(4, 1);
    offset += 12;

    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(5, 1);
    offset += 4;

    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, stride, offset);
    gl.vertexAttribDivisor(6, 1);

    gl.bindVertexArray(null);
  }

  private fetchUniformLocations(): void {
    const gl = this.gl;
    this.viewMatrixLoc = gl.getUniformLocation(this.program, 'viewMatrix');
    this.projectionMatrixLoc = gl.getUniformLocation(this.program, 'projectionMatrix');
    this.timeLoc = gl.getUniformLocation(this.program, 'time');
    this.lightPosLoc = gl.getUniformLocation(this.program, 'lightPosition');
    this.lightColorLoc = gl.getUniformLocation(this.program, 'lightColor');
    this.ambientColorLoc = gl.getUniformLocation(this.program, 'ambientColor');
    this.samplerLoc = gl.getUniformLocation(this.program, 'planetTexture');
  }

  public render(planets: LocationDefinition[], selected: LocationDefinition | null): void {
    const gl = this.gl;
    if (!planets.length) return;

    // Save important state
    const prevFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    const prevViewport = gl.getParameter(gl.VIEWPORT);
    const prevProgram = gl.getParameter(gl.CURRENT_PROGRAM);
    const prevVAO = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    const wasBlendEnabled = gl.isEnabled(gl.BLEND);
    const wasDepthEnabled = gl.isEnabled(gl.DEPTH_TEST);

    this.time += 0.016;

    const canvas = gl.canvas as HTMLCanvasElement;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const viewMatrix = createMatrix4();
    const projectionMatrix = createMatrix4();
    lookAt(viewMatrix, this.camera.position, this.camera.target, vec3FromValues(0, 1, 0));
    perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.viewMatrixLoc, false, viewMatrix);
    gl.uniformMatrix4fv(this.projectionMatrixLoc, false, projectionMatrix);
    gl.uniform1f(this.timeLoc, this.time);
    gl.uniform3f(this.lightPosLoc, 0, 0, 40);
    gl.uniform3f(this.lightColorLoc, 1, 1, 1);
    gl.uniform3f(this.ambientColorLoc, 0.2, 0.2, 0.2);

    const data = this.dataBuffer;
    const maxCount = Math.min(planets.length, this.MAX_PLANETS);
    let ptr = 0;

    for (let i = 0; i < maxCount; i++) {
      const planet = planets[i];
      const isUnlocked = missionUnlocked(planet.missionId);

      const baseColor = isUnlocked ? planet.color : vec3FromValues(0.25, 0.25, 0.25);
      const highlight: Vec3 = vec3FromValues(
        Math.min(1.0, baseColor[0] * 1.5),
        Math.min(1.0, baseColor[1] * 1.5),
        Math.min(1.0, baseColor[2] * 1.5)
      );
      const finalColor = planet === selected ? highlight : baseColor;
      const alpha = isUnlocked ? 1.0 : 0.3;

      data[ptr++] = planet.position[0];
      data[ptr++] = planet.position[1];
      data[ptr++] = planet.position[2];
      data[ptr++] = planet.scale;
      data[ptr++] = finalColor[0];
      data[ptr++] = finalColor[1];
      data[ptr++] = finalColor[2];
      data[ptr++] = alpha;
      data[ptr++] = planet.rotationSpeed;

      const tex = this.planetTextures.get(planet.id);
      if (tex) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(this.samplerLoc, 0);
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, maxCount * 9);

    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.sphere.indices.length, gl.UNSIGNED_SHORT, 0, maxCount);

    // Clean up bindings
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    // Restore state
    if (!wasDepthEnabled) gl.disable(gl.DEPTH_TEST);
    if (!wasBlendEnabled) gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, prevFramebuffer);
    gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    gl.useProgram(prevProgram);
    gl.bindVertexArray(prevVAO);
  }

  public destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.positionBuffer);
    gl.deleteBuffer(this.normalBuffer);
    gl.deleteBuffer(this.uvBuffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteBuffer(this.instanceBuffer);
    gl.deleteVertexArray(this.vao);
    for (const tex of this.planetTextures.values()) gl.deleteTexture(tex);
    this.planetTextures.clear();
    CanvasManager.getInstance().clearWebGL2Layer('unifiedgl2');
  }
}
