// // src/lighting/webgl/initWebGLContext.ts

// /**
//  * Initializes and configures a WebGLRenderingContext from a given canvas.
//  * Throws if the context cannot be created.
//  */
// export function initWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
//   const gl = canvas.getContext('webgl', {
//     alpha: true,
//     depth: false,
//     stencil: false,
//     antialias: false,
//     preserveDrawingBuffer: false,
//     premultipliedAlpha: false,
//   }) as WebGLRenderingContext | null;

//   // const gl = canvas.getContext('webgl');

//   if (!gl) {
//     throw new Error('[LightingRenderer] WebGL is not supported on this device or browser.');
//   }

//   // Basic engine-level WebGL setup
//   gl.enable(gl.BLEND);
//   gl.blendFunc(gl.ONE, gl.ONE); // additive blend for lighting

//   gl.disable(gl.DEPTH_TEST);
//   gl.disable(gl.CULL_FACE);

//   // Log context parameters for diagnostics
//   if (import.meta.env?.DEV) {
//     console.log('[LightingRenderer] WebGL context initialized');
//     console.log('Vendor:', gl.getParameter(gl.VENDOR));
//     console.log('Renderer:', gl.getParameter(gl.RENDERER));
//     console.log('Version:', gl.getParameter(gl.VERSION));
//     console.log('Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
//   }

//   return gl;
// }


/**
 * Initializes and configures a WebGLRenderingContext from a given canvas.
 * Throws if the context cannot be created.
 */
export function initWebGLContext(canvas: HTMLCanvasElement): WebGLRenderingContext {
  const gl = canvas.getContext('webgl', {
    alpha: true,                    // CRUCIAL: Enable alpha for transparency
    depth: false,
    stencil: false,
    antialias: false,
    preserveDrawingBuffer: false,
    premultipliedAlpha: false,      // Important for proper alpha blending
  }) as WebGLRenderingContext | null;

  if (!gl) {
    throw new Error('[LightingRenderer] WebGL is not supported on this device or browser.');
  }

  // Basic WebGL setup - but DON'T set blend mode here
  // Let the renderer handle its own blending
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);

  // Log context parameters for diagnostics
  if (import.meta.env?.DEV) {
    console.log('[LightingRenderer] WebGL context initialized');
    console.log('Vendor:', gl.getParameter(gl.VENDOR));
    console.log('Renderer:', gl.getParameter(gl.RENDERER));
    console.log('Version:', gl.getParameter(gl.VERSION));
    console.log('Max Texture Size:', gl.getParameter(gl.MAX_TEXTURE_SIZE));
  }

  return gl;
}