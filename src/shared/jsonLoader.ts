// src/shared/jsonLoader.ts

export async function loadJson<T = any>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return await res.json();
}
