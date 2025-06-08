// src/lighting/webgl/helpers/checkWebGLSupport.ts

export function checkWebGLSupport(): { supported: boolean; error?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return { supported: false, error: 'WebGL context creation failed' };
    }
    
    return { supported: true };
  } catch (e) {
    return { supported: false, error: e instanceof Error ? e.message : 'An unknown error occurred' };
  }
}

// Use it before initializing your renderer
const webglCheck = checkWebGLSupport();
console.log('WebGL Support Check:', webglCheck);
