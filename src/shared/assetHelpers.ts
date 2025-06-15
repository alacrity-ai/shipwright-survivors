// src/global/assetHelpers.ts

export function getAssetPath(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+/, ''); // remove leading slashes

  const isProduction = window.location.pathname.startsWith('/shipwright-survivors');

  // Avoid double prefixing
  if (isProduction && cleanPath.startsWith('shipwright-survivors/')) {
    return '/' + cleanPath;
  }

  const baseUrl = isProduction ? '/shipwright-survivors/' : './';
  return baseUrl + cleanPath;
}
