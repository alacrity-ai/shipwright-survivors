// src/systems/galaxymap/helpers/createSphere.ts

// Create sphere geometry
export interface SphereGeometry {
  vertices: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
}

export function createSphere(radius: number, segments: number): SphereGeometry {
  const vertexList: number[] = [];
  const normalList: number[] = [];
  const indexList: number[] = [];

  // Generate vertices and normals
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      vertexList.push(radius * x, radius * y, radius * z);
      normalList.push(x, y, z);
    }
  }

  // Generate indices
  for (let lat = 0; lat < segments; lat++) {
    for (let lon = 0; lon < segments; lon++) {
      const first = lat * (segments + 1) + lon;
      const second = first + segments + 1;

      indexList.push(first, second, first + 1);
      indexList.push(second, second + 1, first + 1);
    }
  }

  return {
    vertices: new Float32Array(vertexList),
    normals: new Float32Array(normalList),
    indices: new Uint16Array(indexList),
  };
}
