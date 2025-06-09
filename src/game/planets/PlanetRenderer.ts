// src/game/planets/PlanetRenderer.ts

import type { Camera } from '@/core/Camera';
import { getAssetPath } from '@/shared/assetHelpers';
import { drawCRTText } from '@/ui/primitives/CRTText';
import { getUniformScaleFactor } from '@/config/view';

import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
import { createTextureFromCanvasWithAlpha } from '@/rendering/gl/glTextureUtils';

const VERT_SHADER_SRC = `
  attribute vec2 aPosition;
  uniform vec2 uOffset;
  uniform vec2 uScale;
  varying vec2 vUV;

  void main() {
    vec2 pos = aPosition * uScale + uOffset;
    // Flip Y-axis of UVs to correct upside-down rendering
    vUV = vec2((aPosition.x + 1.0) / 2.0, 1.0 - (aPosition.y + 1.0) / 2.0);
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

  const FRAG_SHADER_SRC = `
  precision mediump float;
  uniform sampler2D uTexture;
  uniform float uAlpha;
  varying vec2 vUV;
  void main() {
    vec4 texColor = texture2D(uTexture, vUV);
    gl_FragColor = vec4(texColor.rgb, texColor.a * uAlpha);
  }
`;

export class PlanetRenderer {
  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly quadBuffer: WebGLBuffer;

  private uOffset!: WebGLUniformLocation;
  private uScale!: WebGLUniformLocation;
  private uTexture!: WebGLUniformLocation;
  private uAlpha!: WebGLUniformLocation;

  private texture: WebGLTexture | null = null;
  private image: HTMLImageElement | null = null;

  constructor(
    gl: WebGLRenderingContext,
    private readonly imagePath: string,
    private readonly scale: number,
    private readonly name: string
  ) {
    this.gl = gl;
    this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
    this.quadBuffer = createQuadBuffer(gl);
    this.initUniformLocations();
    this.loadImage();
  }

  private initUniformLocations(): void {
    this.uOffset = this.gl.getUniformLocation(this.program, 'uOffset')!;
    this.uScale = this.gl.getUniformLocation(this.program, 'uScale')!;
    this.uTexture = this.gl.getUniformLocation(this.program, 'uTexture')!;
    this.uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha')!;
  }

  private loadImage(): void {
    const img = new Image();
    img.src = getAssetPath(this.imagePath);
    img.onload = () => {
      this.image = img;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const ctx = tempCanvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      this.texture = createTextureFromCanvasWithAlpha(this.gl, tempCanvas);
    };
  }

  render(
    overlayCtx: CanvasRenderingContext2D,
    worldX: number,
    worldY: number,
    camera: Camera,
    inInteractionRange: boolean,
    isInteracting: boolean
  ): void {
    if (!this.texture || !this.image) return;

    const { width, height } = this.gl.canvas;
    const camPos = camera.getPosition();

    const drawWidthWorld = this.image.width * this.scale;
    const drawHeightWorld = this.image.height * this.scale;

    const dx = worldX - camPos.x;
    const dy = worldY - camPos.y;

    const dxScreen = dx * camera.getZoom();
    const dyScreen = dy * camera.getZoom();

    const ndcOffsetX = dxScreen / (width / 2);
    const ndcOffsetY = -dyScreen / (height / 2); // WebGL Y flip

    const scaleX = (drawWidthWorld * camera.getZoom()) / width;
    const scaleY = (drawHeightWorld * camera.getZoom()) / height;

    this.gl.viewport(0, 0, width, height);
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

    const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(aPosition);
    this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.uTexture, 0);
    this.gl.uniform1f(this.uAlpha, 1.0);
    this.gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
    this.gl.uniform2f(this.uScale, scaleX, scaleY);

    // Enable alpha blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

    // Disable afterwards
    this.gl.disableVertexAttribArray(aPosition);
    this.gl.disable(this.gl.BLEND);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.gl.useProgram(null);

    // === 2D Overlay remains unchanged ===
    if (inInteractionRange && !isInteracting) {
      const uiScale = getUniformScaleFactor();
      const screenCenterX = camera.getViewportWidth() / 2;
      const topOffsetY = 32 * uiScale;

      drawCRTText(overlayCtx, screenCenterX, topOffsetY, this.name, {
        font: `${uiScale * 24}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true,
      });

      drawCRTText(overlayCtx, screenCenterX, topOffsetY + (32 * uiScale), 'Open Communications: [C]', {
        font: `${uiScale * 16}px "Courier New", monospace`,
        align: 'center',
        baseline: 'top',
        glow: true,
        chromaticAberration: true
      });
    }
  }

  update(dt: number): void {
    // no-op
  }
}


// // src/game/planets/PlanetRendererGL.ts

// import type { Camera } from '@/core/Camera';
// import { getAssetPath } from '@/shared/assetHelpers';
// import { drawCRTText } from '@/ui/primitives/CRTText';
// import { getUniformScaleFactor } from '@/config/view';

// import { createProgramFromSources } from '@/rendering/gl/shaderUtils';
// import { createQuadBuffer } from '@/rendering/gl/bufferUtils';
// import { createTextureFromCanvasWithAlpha } from '@/rendering/gl/glTextureUtils';

// const VERT_SHADER_SRC = `
//   attribute vec2 aPosition;
//   uniform vec2 uOffset;
//   uniform vec2 uScale;
//   varying vec2 vUV;
//   varying vec2 vPosition;

//   void main() {
//     vec2 pos = aPosition * uScale + uOffset;
//     // Flip Y-axis of UVs to correct upside-down rendering
//     vUV = vec2((aPosition.x + 1.0) / 2.0, 1.0 - (aPosition.y + 1.0) / 2.0);
//     vPosition = aPosition; // Normalized quad position (-1 to 1)
//     gl_Position = vec4(pos, 0.0, 1.0);
//   }
// `;

// const FRAG_SHADER_SRC = `
// precision mediump float;
// uniform sampler2D uTexture;
// uniform float uAlpha;
// uniform float uTime;
// uniform vec3 uAtmosphereColor;
// uniform float uAtmosphereIntensity;
// varying vec2 vUV;
// varying vec2 vPosition;

// // Noise function for atmospheric turbulence
// float noise(vec2 st) {
//     return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
// }

// float smoothNoise(vec2 st) {
//     vec2 i = floor(st);
//     vec2 f = fract(st);
    
//     float a = noise(i);
//     float b = noise(i + vec2(1.0, 0.0));
//     float c = noise(i + vec2(0.0, 1.0));
//     float d = noise(i + vec2(1.0, 1.0));
    
//     vec2 u = f * f * (3.0 - 2.0 * f);
    
//     return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
// }

// void main() {
//   vec4 texColor = texture2D(uTexture, vUV);
  
//   // Calculate distance from center for atmospheric effects
//   float distFromCenter = length(vPosition);
  
//   // Create atmospheric glow - stronger at edges
//   float atmosphereGlow = 1.0 - smoothstep(0.7, 1.2, distFromCenter);
//   atmosphereGlow = pow(atmosphereGlow, 2.0);
  
//   // Add animated atmospheric turbulence
//   vec2 turbulence = vPosition * 3.0 + uTime * 0.1;
//   float noise1 = smoothNoise(turbulence);
//   float noise2 = smoothNoise(turbulence * 2.0 + uTime * 0.05);
//   float combinedNoise = (noise1 + noise2 * 0.5) / 1.5;
  
//   // Modulate atmosphere intensity with noise
//   atmosphereGlow *= (0.8 + 0.4 * combinedNoise);
  
//   // Create rim lighting effect (Fresnel-like)
//   float rimEffect = 1.0 - smoothstep(0.6, 0.9, distFromCenter);
//   rimEffect = pow(rimEffect, 3.0);
  
//   // Add subtle color temperature variation based on position
//   vec2 tempVar = vPosition * 2.0 + uTime * 0.02;
//   float tempNoise = smoothNoise(tempVar);
//   vec3 tempTint = mix(vec3(1.0, 0.95, 0.9), vec3(0.9, 0.95, 1.0), tempNoise);
  
//   // Combine base planet texture with atmospheric effects
//   vec3 finalColor = texColor.rgb * tempTint;
  
//   // Add atmospheric glow
//   vec3 atmosphereContrib = uAtmosphereColor * atmosphereGlow * uAtmosphereIntensity;
//   finalColor += atmosphereContrib;
  
//   // Add rim lighting
//   vec3 rimColor = uAtmosphereColor * 0.8;
//   finalColor += rimColor * rimEffect * uAtmosphereIntensity;
  
//   // Add subtle pulsing effect
//   float pulse = sin(uTime * 2.0) * 0.1 + 0.9;
//   atmosphereContrib *= pulse;
  
//   // Fade out atmosphere effect beyond planet boundary
//   float planetBoundary = smoothstep(0.95, 1.05, distFromCenter);
//   float atmosphereAlpha = (1.0 - planetBoundary) * atmosphereGlow;
  
//   // Final alpha combines texture alpha with atmospheric effects
//   float finalAlpha = texColor.a + atmosphereAlpha * 0.3;
//   finalAlpha = clamp(finalAlpha, 0.0, 1.0);
  
//   gl_FragColor = vec4(finalColor, finalAlpha * uAlpha);
// }
// `;

// export class PlanetRenderer {
//   private readonly gl: WebGLRenderingContext;
//   private readonly program: WebGLProgram;
//   private readonly quadBuffer: WebGLBuffer;

//   private uOffset!: WebGLUniformLocation;
//   private uScale!: WebGLUniformLocation;
//   private uTexture!: WebGLUniformLocation;
//   private uAlpha!: WebGLUniformLocation;
//   private uTime!: WebGLUniformLocation;
//   private uAtmosphereColor!: WebGLUniformLocation;
//   private uAtmosphereIntensity!: WebGLUniformLocation;

//   private texture: WebGLTexture | null = null;
//   private image: HTMLImageElement | null = null;
//   private time: number = 0;

//   // Atmosphere properties - can be customized per planet
//   private atmosphereColor: [number, number, number] = [0.0, 0.0, 0.0]; // Blueish atmosphere
//   private atmosphereIntensity: number = 0.6;

//   /*
//   [0.4, 0.7, 1.0], 0.6; // Blueish atmosphere
//   [1.0, 0.6, 0.4], 0.4; // Mars like
//   [0.2, 1.0, 0.3], 0.8; // Greenish atmosphere
//   */

//   constructor(
//     gl: WebGLRenderingContext,
//     private readonly imagePath: string,
//     private readonly scale: number,
//     private readonly name: string,
//     // Optional atmosphere customization
//     atmosphereColor?: [number, number, number],
//     atmosphereIntensity?: number
//   ) {
//     this.gl = gl;
//     this.program = createProgramFromSources(gl, VERT_SHADER_SRC, FRAG_SHADER_SRC);
//     this.quadBuffer = createQuadBuffer(gl);
//     this.initUniformLocations();
//     this.loadImage();
    
//     if (atmosphereColor) this.atmosphereColor = atmosphereColor;
//     if (atmosphereIntensity !== undefined) this.atmosphereIntensity = atmosphereIntensity;
//   }

//   private initUniformLocations(): void {
//     this.uOffset = this.gl.getUniformLocation(this.program, 'uOffset')!;
//     this.uScale = this.gl.getUniformLocation(this.program, 'uScale')!;
//     this.uTexture = this.gl.getUniformLocation(this.program, 'uTexture')!;
//     this.uAlpha = this.gl.getUniformLocation(this.program, 'uAlpha')!;
//     this.uTime = this.gl.getUniformLocation(this.program, 'uTime')!;
//     this.uAtmosphereColor = this.gl.getUniformLocation(this.program, 'uAtmosphereColor')!;
//     this.uAtmosphereIntensity = this.gl.getUniformLocation(this.program, 'uAtmosphereIntensity')!;
//   }

//   private loadImage(): void {
//     const img = new Image();
//     img.src = getAssetPath(this.imagePath);
//     img.onload = () => {
//       this.image = img;
//       const tempCanvas = document.createElement('canvas');
//       tempCanvas.width = img.width;
//       tempCanvas.height = img.height;
//       const ctx = tempCanvas.getContext('2d')!;
//       ctx.drawImage(img, 0, 0);
//       this.texture = createTextureFromCanvasWithAlpha(this.gl, tempCanvas);
//     };
//   }

//   // Method to customize atmosphere for different planet types
//   setAtmosphere(color: [number, number, number], intensity: number): void {
//     this.atmosphereColor = color;
//     this.atmosphereIntensity = intensity;
//   }

//   render(
//     overlayCtx: CanvasRenderingContext2D,
//     worldX: number,
//     worldY: number,
//     camera: Camera,
//     inInteractionRange: boolean,
//     isInteracting: boolean
//   ): void {
//     if (!this.texture || !this.image) return;

//     const { width, height } = this.gl.canvas;
//     const camPos = camera.getPosition();

//     const drawWidthWorld = this.image.width * this.scale;
//     const drawHeightWorld = this.image.height * this.scale;

//     const dx = worldX - camPos.x;
//     const dy = worldY - camPos.y;

//     const dxScreen = dx * camera.zoom;
//     const dyScreen = dy * camera.zoom;

//     const ndcOffsetX = dxScreen / (width / 2);
//     const ndcOffsetY = -dyScreen / (height / 2); // WebGL Y flip

//     const scaleX = (drawWidthWorld * camera.zoom) / width;
//     const scaleY = (drawHeightWorld * camera.zoom) / height;

//     this.gl.useProgram(this.program);
//     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);

//     const aPosition = this.gl.getAttribLocation(this.program, 'aPosition');
//     this.gl.enableVertexAttribArray(aPosition);
//     this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

//     this.gl.activeTexture(this.gl.TEXTURE0);
//     this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
//     this.gl.uniform1i(this.uTexture, 0);
//     this.gl.uniform1f(this.uAlpha, 1.0);
//     this.gl.uniform1f(this.uTime, this.time);
//     this.gl.uniform3f(this.uAtmosphereColor, ...this.atmosphereColor);
//     this.gl.uniform1f(this.uAtmosphereIntensity, this.atmosphereIntensity);
//     this.gl.uniform2f(this.uOffset, ndcOffsetX, ndcOffsetY);
//     this.gl.uniform2f(this.uScale, scaleX, scaleY);

//     // Enable alpha blending for atmospheric effects
//     this.gl.enable(this.gl.BLEND);
//     this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

//     this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

//     // Cleanup
//     this.gl.disableVertexAttribArray(aPosition);
//     this.gl.disable(this.gl.BLEND);
//     this.gl.bindTexture(this.gl.TEXTURE_2D, null);
//     this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
//     this.gl.useProgram(null);

//     // === 2D Overlay remains unchanged ===
//     if (inInteractionRange && !isInteracting) {
//       const uiScale = getUniformScaleFactor();
//       const screenCenterX = camera.getViewportWidth() / 2;
//       const topOffsetY = 32 * uiScale;

//       drawCRTText(overlayCtx, screenCenterX, topOffsetY, this.name, {
//         font: `${uiScale * 24}px "Courier New", monospace`,
//         align: 'center',
//         baseline: 'top',
//         glow: true,
//         chromaticAberration: true,
//       });

//       drawCRTText(overlayCtx, screenCenterX, topOffsetY + (32 * uiScale), 'Open Communications: [C]', {
//         font: `${uiScale * 16}px "Courier New", monospace`,
//         align: 'center',
//         baseline: 'top',
//         glow: true,
//         chromaticAberration: true
//       });
//     }
//   }

//   update(deltaTime?: number): void {
//     // Update time for shader animations
//     this.time += (deltaTime || 16) / 1000; // Convert to seconds, default 60fps
//   }
// }