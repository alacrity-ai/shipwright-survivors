// src/systems/galaxymap/webgl/shaderUtils.ts

/**
 * Creates and compiles a shader.
 * @param gl - WebGL rendering context
 * @param type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
 * @param source - GLSL shader source code
 * @returns A compiled WebGLShader or null on failure
 */
export function createShader(
  gl: WebGLRenderingContext,
  type: GLenum,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error('Failed to create shader');
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Creates and links a shader program from vertex and fragment shaders.
 * @param gl - WebGL rendering context
 * @param vertexShader - Compiled vertex shader
 * @param fragmentShader - Compiled fragment shader
 * @returns A linked WebGLProgram or null on failure
 */
export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) {
    console.error('Failed to create program');
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}
