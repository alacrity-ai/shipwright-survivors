import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer2 } from '@/rendering/unified/utils/bufferUtils';

import cloudVertSrc from '@/rendering/unified/shaders/cloudPass.vert?raw';
import cloudFragSrc from '@/rendering/unified/shaders/cloudPass.frag?raw';

/**
 * CloudPass
 * Renders the procedural cloud layer (parallax drifting clouds)
 * in static world space over the background.
 */
export class CloudPass {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;

  // Uniform locations
  private readonly uTime: WebGLUniformLocation;
  private readonly uAlpha: WebGLUniformLocation;
  private readonly uResolution: WebGLUniformLocation;
  private readonly uSpeed: WebGLUniformLocation;
  private readonly uDensity: WebGLUniformLocation;
  private readonly uWorldOffset: WebGLUniformLocation;
  private readonly uColor: WebGLUniformLocation;
  private readonly uQuantity: WebGLUniformLocation;
  private readonly uScale: WebGLUniformLocation; // Add this missing uniform

  // Runtime parameters (default values can be adjusted)
  private speed = 1.0;
  private alpha = 0.18;
  private density = 1.2;
  private cloudColor: [number, number, number] = [0.6, 1, 0.6];
  private quantity = 2.0;
  private scale = 4.0; // Add scale parameter

  // World offset scaling factor (to avoid massive values in shader)
  private static readonly WORLD_SCALE = 0.0005;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, cloudVertSrc, cloudFragSrc);

    this.quadBuffer = createQuadBuffer2(gl);
    this.vao = gl.createVertexArray()!;

    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    // Uniform lookups
    this.uTime = gl.getUniformLocation(this.program, 'u_time')!;
    this.uAlpha = gl.getUniformLocation(this.program, 'u_alpha')!; // NEW
    this.uResolution = gl.getUniformLocation(this.program, 'u_resolution')!;
    this.uSpeed = gl.getUniformLocation(this.program, 'u_speed')!;
    this.uDensity = gl.getUniformLocation(this.program, 'u_density')!;
    this.uWorldOffset = gl.getUniformLocation(this.program, 'u_worldOffset')!;
    this.uColor = gl.getUniformLocation(this.program, 'u_color')!;
    this.uQuantity = gl.getUniformLocation(this.program, 'u_quantity')!;
    this.uScale = gl.getUniformLocation(this.program, 'u_scale')!; // Add this
  }

  /**
   * Update parameters for the clouds.
   */
  public setParams(params: { 
    speed?: number; 
    density?: number; 
    color?: [number, number, number]; 
    quantity?: number;
    scale?: number;
    alpha?: number; // NEW
  }): void {
    if (params.speed !== undefined) this.speed = params.speed;
    if (params.density !== undefined) this.density = params.density;
    if (params.color) this.cloudColor = params.color;
    if (params.quantity !== undefined) this.quantity = params.quantity;
    if (params.scale !== undefined) this.scale = params.scale;
    if (params.alpha !== undefined) this.alpha = params.alpha;
  }

  /**
   * Render the cloud layer as a fullscreen quad.
   * @param elapsedSeconds Current time (in seconds) for animation.
   * @param cameraOffset World-space camera offset for anchoring clouds.
   */
  public render(elapsedSeconds: number, cameraOffset: { x: number; y: number }): void {
    const gl = this.gl;
    const { width, height } = gl.canvas as HTMLCanvasElement;

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Pass uniforms
    gl.uniform1f(this.uTime, elapsedSeconds);
    gl.uniform1f(this.uAlpha, this.alpha);
    gl.uniform2f(this.uResolution, width, height);
    gl.uniform1f(this.uSpeed, this.speed);
    gl.uniform1f(this.uDensity, this.density);
    gl.uniform3fv(this.uColor, this.cloudColor);
    gl.uniform1f(this.uQuantity, this.quantity);
    gl.uniform1f(this.uScale, this.scale); // Set the scale uniform

    // Fix Y-axis handling to match planet pass coordinate system
    gl.uniform2f(
      this.uWorldOffset,
      cameraOffset.x * CloudPass.WORLD_SCALE,
      -cameraOffset.y * CloudPass.WORLD_SCALE  // Remove the Y inversion
    );

    // Blend clouds over the pre-rendered background
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  public destroy(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.vao);
  }
}