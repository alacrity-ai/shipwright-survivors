// src/rendering/gl/webgl/bufferUtils.ts

/**
 * Creates a buffer containing a unit quad (two triangles in a strip).
 * The quad covers the NDC range [-1, 1] in both axes.
 * 
 * Vertices:      (-1,1)------(1,1)
 *                  |         |
 *                  |         |
 *               (-1,-1)----(1,-1)
 */
export function createQuadBuffer(gl: WebGLRenderingContext): WebGLBuffer {
  const quadVertices = new Float32Array([
    -1.0, -1.0, // bottom-left
     1.0, -1.0, // bottom-right
    -1.0,  1.0, // top-left
     1.0,  1.0  // top-right
  ]);

  const buffer = gl.createBuffer();
  if (!buffer) {
    throw new Error('[bufferUtils] Failed to create VBO');
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return buffer;
}


// src/rendering/gl/quadUtils.ts
export function createQuadBuffer2(gl: WebGLRenderingContext): WebGLBuffer {
  const quadVertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]);

  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
  return buffer;
}

