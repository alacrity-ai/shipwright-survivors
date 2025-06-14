// src/systems/galaxymap/webgl/vectorUtils.ts

export type Vec3 = Float32Array & { length: 3 };
export type Mat4 = Float32Array & { length: 16 };

export function vec3FromArray(arr: [number, number, number]): Vec3 {
  return new Float32Array(arr) as Vec3;
}

export function vec3Create(): Vec3 {
    return new Float32Array(3) as Vec3;
}

export function vec3Length(a: Vec3): number {
    return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
}

export function mat4Create(): Mat4 {
  return new Float32Array(16) as Mat4;
}

export function vec3FromValues(x: number, y: number, z: number): Vec3 {
  return new Float32Array([x, y, z]) as Vec3;
}

export function vec3Distance(a: Vec3, b: Vec3): number {
    const x = b[0] - a[0];
    const y = b[1] - a[1];
    const z = b[2] - a[2];
    return Math.sqrt(x * x + y * y + z * z);
}

export function vec3Subtract(out: Vec3, a: Vec3, b: Vec3): Vec3 {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
}

export function vec3Add(out: Vec3, a: Vec3, b: Vec3): Vec3 {
    out[0] = a[0] + b[0];
    out[1] = a[1] + b[1];
    out[2] = a[2] + b[2];
    return out;
}

export function vec3Scale(out: Vec3, a: Vec3, b: number): Vec3 {
    out[0] = a[0] * b;
    out[1] = a[1] * b;
    out[2] = a[2] * b;
    return out;
}

export function vec3Normalize(out: Vec3, a: Vec3): Vec3 {
    const len = vec3Length(a);
    if (len > 0) {
        out[0] = a[0] / len;
        out[1] = a[1] / len;
        out[2] = a[2] / len;
    }
    return out;
}
