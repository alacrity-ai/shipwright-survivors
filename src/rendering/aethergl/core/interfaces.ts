// src/rendering/aethergl/core/interfaces.ts

export type ResourceRef = string;

export type TexFormat = 'rgba8' | 'rgba16f' | 'r11g11b10f';
export type SizeSpec =
  | { mode: 'viewport'; scale: number }
  | { mode: 'fixed'; width: number; height: number };

export interface TextureDesc {
  name: ResourceRef;
  kind: 'texture2D';
  format: TexFormat;
  filtering: 'nearest' | 'linear';
  wrap: 'clamp' | 'repeat';
  size: SizeSpec;
  clear?: [number, number, number, number];
}

export interface FramebufferDesc {
  name: ResourceRef;
  color: ResourceRef;
  depth?: 'none' | 'rbo24';
}

export interface PipelineConfig {
  version: '1.0';
  params?: Record<string, unknown>;
  resources: {
    textures: TextureDesc[];
    framebuffers: FramebufferDesc[];
    ubos?: { binding: number; name: string }[];
  };
  passes: Array<{
    id: string;
    kind: string;
    reads?: ResourceRef[];
    writes?: ResourceRef[];
    target?: ResourceRef | null;
    params?: Record<string, unknown>;
  }>;
  outputs: { present: ResourceRef | 'default' };
}

export interface PassContext {
  gl: WebGL2RenderingContext;
  getTex(name: ResourceRef): WebGLTexture;
  getFbo(name: ResourceRef): WebGLFramebuffer | null;
  getUBO(binding: number): WebGLBuffer | undefined;
  getParam<T = unknown>(path: string): T | undefined;
  setTemp(key: string, v: unknown): void;
  getTemp<T = unknown>(key: string): T | undefined;
}

export interface RenderPass {
  readonly id: string;
  readonly kind: string;
  readonly reads: ReadonlyArray<ResourceRef>;
  readonly writes: ReadonlyArray<ResourceRef>;
  readonly target: ResourceRef | null; // null => default framebuffer
  setup(ctx: PassContext): void;
  render(ctx: PassContext): void;
  resize?(ctx: PassContext, w: number, h: number): void;
  destroy?(ctx: PassContext): void;
}
