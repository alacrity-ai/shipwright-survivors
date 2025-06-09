// src/rendering/gl/webgl/shaderUtils.ts

/**
 * Compiles a shader from source.
 * @param gl WebGL context
 * @param type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
 * @param source GLSL source code
 */
export function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('[shaderUtils] Failed to create shader');
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`[shaderUtils] Shader compile error:\n${log}\n\nSource:\n${source}`);
  }

  return shader;
}

/**
 * Links a WebGLProgram from compiled vertex and fragment shaders.
 */
export function linkProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) {
    throw new Error('[shaderUtils] Failed to create program');
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`[shaderUtils] Program link error:\n${log}`);
  }

  return program;
}

/**
 * Compiles and links a full program from vertex and fragment source strings.
 */
export function createProgramFromSources(
  gl: WebGLRenderingContext,
  vertexSrc: string,
  fragmentSrc: string
): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
  return linkProgram(gl, vs, fs);
}
