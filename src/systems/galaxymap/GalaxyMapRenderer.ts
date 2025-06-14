// src/systems/galaxymap/GalaxyMapRenderer.ts

import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';
import type { GalaxyMapCamera } from '@/systems/galaxymap/camera/GalaxyMapCamera';
import type { Vec3 } from '@/systems/galaxymap/webgl/vectorUtils';

import { missionUnlocked } from '@/systems/galaxymap/helpers/missionUnlocked';

import { createShader, createProgram } from '@/systems/galaxymap/webgl/shaderUtils';
import { vertexShaderSource, fragmentShaderSource } from '@/systems/galaxymap/webgl/defaultShaders';
import { vec3FromValues, vec3Create } from '@/systems/galaxymap/webgl/vectorUtils';
import { createSphere } from '@/systems/galaxymap/helpers/createSphere';
import { lookAt } from '@/systems/galaxymap/helpers/lookAt';
import {
  createMatrix4,
  identity,
  perspective,
  translate,
  rotateY,
  scale,
  normalFromMat4,
} from './webgl/matrixUtils';

export class GalaxyMapRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly camera: GalaxyMapCamera;

  private program: WebGLProgram | null = null;
  private sphere = createSphere(1, 24);

  private positionBuffer: WebGLBuffer | null = null;
  private normalBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  private locations: {
    position: number;
    normal: number;
    modelMatrix: WebGLUniformLocation | null;
    viewMatrix: WebGLUniformLocation | null;
    projectionMatrix: WebGLUniformLocation | null;
    normalMatrix: WebGLUniformLocation | null;
    color: WebGLUniformLocation | null;
    lightPosition: WebGLUniformLocation | null;
    lightColor: WebGLUniformLocation | null;
    ambientColor: WebGLUniformLocation | null;
    alpha: WebGLUniformLocation | null;
  } | null = null;

  private time = 0;

  constructor(gl: WebGLRenderingContext, camera: GalaxyMapCamera) {
    this.gl = gl;
    this.camera = camera;
  }

  public initialize(): void {
    const gl = this.gl;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)!;
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)!;
    this.program = createProgram(gl, vertexShader, fragmentShader)!;

    // Uniform and attribute locations
    this.locations = {
      position: gl.getAttribLocation(this.program, 'position'),
      normal: gl.getAttribLocation(this.program, 'normal'),
      modelMatrix: gl.getUniformLocation(this.program, 'modelMatrix'),
      viewMatrix: gl.getUniformLocation(this.program, 'viewMatrix'),
      projectionMatrix: gl.getUniformLocation(this.program, 'projectionMatrix'),
      normalMatrix: gl.getUniformLocation(this.program, 'normalMatrix'),
      color: gl.getUniformLocation(this.program, 'color'),
      lightPosition: gl.getUniformLocation(this.program, 'lightPosition'),
      lightColor: gl.getUniformLocation(this.program, 'lightColor'),
      ambientColor: gl.getUniformLocation(this.program, 'ambientColor'),
      alpha: gl.getUniformLocation(this.program, 'alpha'),
    };

    // Buffers
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.sphere.vertices), gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.sphere.normals), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.sphere.indices), gl.STATIC_DRAW);
  }

  public render(planets: LocationDefinition[], selected: LocationDefinition | null): void {
    if (!this.program || !this.locations) return;

    const gl = this.gl;
    this.time += 0.016;

    const canvas = gl.canvas as HTMLCanvasElement;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const modelMatrix = createMatrix4();
    const viewMatrix = createMatrix4();
    const projectionMatrix = createMatrix4();
    const normalMatrix = new Float32Array(9);

    lookAt(viewMatrix, this.camera.position, this.camera.target, new Float32Array([0, 1, 0]) as Vec3);
    perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);

    gl.useProgram(this.program);

    // Lighting
    gl.uniform3f(this.locations.lightPosition, 0, 0, 40);
    gl.uniform3f(this.locations.lightColor, 1, 1, 1);
    gl.uniform3f(this.locations.ambientColor, 0.2, 0.2, 0.2);

    // View/Projection
    gl.uniformMatrix4fv(this.locations.viewMatrix, false, viewMatrix);
    gl.uniformMatrix4fv(this.locations.projectionMatrix, false, projectionMatrix);

    // Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(this.locations.normal);
    gl.vertexAttribPointer(this.locations.normal, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    for (const planet of planets) {
      identity(modelMatrix);
      translate(modelMatrix, modelMatrix, planet.position);
      rotateY(modelMatrix, modelMatrix, this.time * planet.rotationSpeed);
      scale(modelMatrix, modelMatrix, vec3FromValues(planet.scale, planet.scale, planet.scale));

      normalFromMat4(normalMatrix, modelMatrix);

      const isUnlocked = missionUnlocked(planet.missionId);

      // Determine color, is it's mission unlocked? is it highlighted?
      const basePlanetColor = isUnlocked ? planet.color : vec3FromValues(0.25, 0.25, 0.25);
      const highlightColor: Vec3 = vec3Create();
      for (let i = 0; i < 3; i++) {
        highlightColor[i] = Math.min(1.0, basePlanetColor[i] * 1.5);
      }
      const finalPlanetColor = (planet === selected) ? highlightColor : basePlanetColor;
      
      const alpha = isUnlocked ? 1.0 : 0.3; // If mission is unlocked, make it translucent, otherwise opaque.
      gl.uniform1f(this.locations.alpha, alpha);

      gl.uniformMatrix4fv(this.locations.modelMatrix, false, modelMatrix);
      gl.uniformMatrix3fv(this.locations.normalMatrix, false, normalMatrix);
      gl.uniform3f(this.locations.color, finalPlanetColor[0], finalPlanetColor[1], finalPlanetColor[2]);

      gl.drawElements(gl.TRIANGLES, this.sphere.indices.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  public destroy(): void {
    const gl = this.gl;
    if (this.positionBuffer) gl.deleteBuffer(this.positionBuffer);
    if (this.normalBuffer) gl.deleteBuffer(this.normalBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    if (this.program) gl.deleteProgram(this.program);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}
