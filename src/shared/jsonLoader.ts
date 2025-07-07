// src/shared/jsonLoader.ts

const jsonCache = new Map<string, Promise<any>>();

/**
 * Loads a JSON resource from the given path with transparent caching.
 * Subsequent calls to the same path will return the original Promise.
 */
export async function loadJson<T = any>(path: string): Promise<T> {
  if (jsonCache.has(path)) {
    return jsonCache.get(path)!;
  }

  const fetchPromise = fetch(path)
    .then(res => {
      if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
      return res.json();
    });

  jsonCache.set(path, fetchPromise);
  return fetchPromise;
}
