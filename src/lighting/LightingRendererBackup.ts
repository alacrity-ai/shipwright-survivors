// // src/lighting/LightingRenderer.ts

// import type { Camera } from '@/core/Camera';
// import type { AnyLightInstance } from './lights/types';

// import { createProgramFromSources } from './webgl/shaderUtils';
// import { createQuadBuffer } from './webgl/bufferUtils';
// import { VERT_SHADER_SRC, FRAG_SHADER_SRC } from './webgl/defaultShaders';

// export class LightingRenderer {
//   private readonly gl: WebGLRenderingContext;
//   private readonly canvas: HTMLCanvasElement;

//   private program!: WebGLProgram;
//   private quadBuffer!: WebGLBuffer;
  
//   private clearColor: [number, number, number, number] = [0, 0, 0, 0]; // Transparent

//   private attribs = {
//     position: 0,
//   };

//   private uniforms = {
//     uResolution: null as WebGLUniformLocation | null,
//     uLightPosition: null as WebGLUniformLocation | null,
//     uRadius: null as WebGLUniformLocation | null,
//     uColor: null as WebGLUniformLocation | null,
//     uIntensity: null as WebGLUniformLocation | null,
//     uFalloff: null as WebGLUniformLocation | null,
//     uMaxBrightness: null as WebGLUniformLocation | null, // New uniform
//   };

//   private maxBrightness: number = 0.2; // Configurable brightness cap

//   constructor(gl: WebGLRenderingContext, canvas: HTMLCanvasElement) {
//     this.gl = gl;
//     this.canvas = canvas;
//     this.initializeGL();
//   }

//   private initializeGL(): void {
//     const gl = this.gl;

//     this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
//     this.quadBuffer = createQuadBuffer(gl);

//     // Get all uniform locations including the new one
//     this.uniforms.uResolution = gl.getUniformLocation(this.program, 'uResolution');
//     this.uniforms.uLightPosition = gl.getUniformLocation(this.program, 'uLightPosition');
//     this.uniforms.uRadius = gl.getUniformLocation(this.program, 'uRadius');
//     this.uniforms.uColor = gl.getUniformLocation(this.program, 'uColor');
//     this.uniforms.uIntensity = gl.getUniformLocation(this.program, 'uIntensity');
//     this.uniforms.uFalloff = gl.getUniformLocation(this.program, 'uFalloff');
//     this.uniforms.uMaxBrightness = gl.getUniformLocation(this.program, 'uMaxBrightness');

//     gl.enable(gl.BLEND);
//     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
//   }

//   public render(lights: AnyLightInstance[], camera: Camera): void {
//     const gl = this.gl;
//     const { width, height } = this.canvas;

//     gl.viewport(0, 0, width, height);
//     gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
//     gl.clear(gl.COLOR_BUFFER_BIT);

//     gl.useProgram(this.program);
//     gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
//     gl.enableVertexAttribArray(this.attribs.position);
//     gl.vertexAttribPointer(this.attribs.position, 2, gl.FLOAT, false, 0, 0);

//     gl.uniform2f(this.uniforms.uResolution, width, height);
//     gl.uniform1f(this.uniforms.uMaxBrightness, this.maxBrightness); // Set brightness cap

//     // Switch to additive blending
//     gl.blendFunc(gl.ONE, gl.ONE);

//     for (const light of lights) {
//       const screenPos = camera.worldToScreen(light.x, light.y);
//       const rgba = this.hexToRgbaVec4(light.color);
//       const radius = light.radius * camera.zoom;
//       const intensity = light.intensity;
//       const falloff = light.animationPhase ?? 1.0;

//       gl.uniform2f(this.uniforms.uLightPosition, screenPos.x, screenPos.y);
//       gl.uniform1f(this.uniforms.uRadius, radius);
//       gl.uniform4fv(this.uniforms.uColor, rgba);
//       gl.uniform1f(this.uniforms.uIntensity, intensity);
//       gl.uniform1f(this.uniforms.uFalloff, falloff);

//       gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//     }

//     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
//     gl.disableVertexAttribArray(this.attribs.position);
//     gl.bindBuffer(gl.ARRAY_BUFFER, null);
//     gl.useProgram(null);
//   }

//   // Add method to control brightness cap
//   public setMaxBrightness(value: number): void {
//     this.maxBrightness = value;
//   }

//   public setClearColor(r: number, g: number, b: number, a: number): void {
//     this.clearColor = [r, g, b, a];
//   }

//   /** Converts #rrggbb or #rrggbbaa hex to normalized vec4 float array */
//   private hexToRgbaVec4(hex: string): [number, number, number, number] {
//     let r = 1, g = 1, b = 1, a = 1;
//     if (hex.startsWith('#')) hex = hex.slice(1);
//     if (hex.length === 6 || hex.length === 8) {
//       r = parseInt(hex.substring(0, 2), 16) / 255;
//       g = parseInt(hex.substring(2, 4), 16) / 255;
//       b = parseInt(hex.substring(4, 6), 16) / 255;
//       if (hex.length === 8) {
//         a = parseInt(hex.substring(6, 8), 16) / 255;
//       }
//     }
//     return [r, g, b, a];
//   }
// }