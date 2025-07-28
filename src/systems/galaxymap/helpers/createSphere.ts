// // src/systems/galaxymap/helpers/createSphere.ts

// // Create sphere geometry
// export interface SphereGeometry {
//   vertices: Float32Array;
//   normals: Float32Array;
//   indices: Uint16Array;
// }

// export function createSphere(radius: number, segments: number): SphereGeometry {
//   const vertexList: number[] = [];
//   const normalList: number[] = [];
//   const indexList: number[] = [];

//   // Generate vertices and normals
//   for (let lat = 0; lat <= segments; lat++) {
//     const theta = (lat * Math.PI) / segments;
//     const sinTheta = Math.sin(theta);
//     const cosTheta = Math.cos(theta);

//     for (let lon = 0; lon <= segments; lon++) {
//       const phi = (lon * 2 * Math.PI) / segments;
//       const sinPhi = Math.sin(phi);
//       const cosPhi = Math.cos(phi);

//       const x = cosPhi * sinTheta;
//       const y = cosTheta;
//       const z = sinPhi * sinTheta;

//       vertexList.push(radius * x, radius * y, radius * z);
//       normalList.push(x, y, z);
//     }
//   }

//   // Generate indices
//   for (let lat = 0; lat < segments; lat++) {
//     for (let lon = 0; lon < segments; lon++) {
//       const first = lat * (segments + 1) + lon;
//       const second = first + segments + 1;

//       indexList.push(first, second, first + 1);
//       indexList.push(second, second + 1, first + 1);
//     }
//   }

//   return {
//     vertices: new Float32Array(vertexList),
//     normals: new Float32Array(normalList),
//     indices: new Uint16Array(indexList),
//   };
// }


// src/systems/galaxymap/helpers/createSphere.ts

// Create sphere geometry with vertices, normals, UVs, and indices
export interface SphereGeometry {
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
}

/**
 * Generates a UV-mapped sphere for rendering.
 * - `radius`: Sphere radius.
 * - `segments`: Number of horizontal/vertical subdivisions (higher = smoother).
 */
export function createSphere(radius: number, segments: number): SphereGeometry {
  const vertexList: number[] = [];
  const normalList: number[] = [];
  const uvList: number[] = [];
  const indexList: number[] = [];

  // Generate vertices, normals, and UVs
  for (let lat = 0; lat <= segments; lat++) {
    const theta = (lat * Math.PI) / segments;        // Latitude angle (0..π)
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= segments; lon++) {
      const phi = (lon * 2 * Math.PI) / segments;    // Longitude angle (0..2π)
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      // Vertex position
      vertexList.push(radius * x, radius * y, radius * z);

      // Normalized normal (points outward)
      normalList.push(x, y, z);

      // Texture coordinates (u = longitude, v = latitude; flip v so image isn’t upside down)
      uvList.push(lon / segments, 1.0 - lat / segments);
    }
  }

  // Generate triangle indices for each quad
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
    uvs: new Float32Array(uvList),
    indices: new Uint16Array(indexList),
  };
}
