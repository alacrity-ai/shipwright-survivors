// src/rendering/aethergl/core/ParamStore.ts

export class ParamStore {
  private dict = new Map<string, unknown>();
  set(path: string, val: unknown) { this.dict.set(path, val); }
  get<T>(path: string): T | undefined { return this.dict.get(path) as T | undefined; }
  clear() { this.dict.clear(); }
}
