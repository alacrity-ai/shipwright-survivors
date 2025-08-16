// scripts/exportMission1Waves.browser.ts
// Run this from a user gesture (e.g., button click) in the browser.

import { waveDefinitions } from '@/game/waves/missions/Mission1Waves';
import { saveWavesToJSON } from '@/game/waves/io/serde';

type ExportResult =
  | { ok: true; method: 'picker' | 'download'; filename: string }
  | { ok: false; reason: 'cancelled' | 'error'; error?: unknown };

interface ExportOpts {
  /** Preferred default filename for the saved file. */
  filename?: string;
  /** Pretty-print JSON for readability; set false to minimize. */
  pretty?: boolean;
  /** Try the native Save dialog (File System Access API) first. */
  preferNativePicker?: boolean;
}

export async function exportMission1WavesBrowser(opts: ExportOpts = {}): Promise<ExportResult> {
  const {
    filename = 'mission1waves.json',
    pretty = true,
    preferNativePicker = true,
  } = opts;

  // 1) Serialize using your existing serializer
  const jsonObj = saveWavesToJSON(waveDefinitions);
  const jsonStr = JSON.stringify(jsonObj, null, pretty ? 2 : 0);
  const blob = new Blob([jsonStr], { type: 'application/json' });

  // 2) If available and preferred, use the native save picker (Chromium)
  try {
    if (
      preferNativePicker &&
      typeof window !== 'undefined' &&
      'showSaveFilePicker' in window
    ) {
      const handle: FileSystemFileHandle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
        excludeAcceptAllOption: false,
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return { ok: true, method: 'picker', filename: handle.name ?? filename };
    }
  } catch (err: any) {
    // Swallow user cancellation; propagate real errors.
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
      return { ok: false, reason: 'cancelled' };
    }
    // Fall through to anchor fallback AFTER reporting
    console.error('Save picker failed; falling back to download.', err);
  }

  // 3) Standards fallback: programmatic <a download> + object URL.
  //    NOTE: must be called from a user gesture to avoid popup blockers.
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename; // instructs a file save prompt with this name
    // Attach to DOM to support Safari
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke URL on next tick to avoid revoking before navigation
    setTimeout(() => URL.revokeObjectURL(url), 0);
    return { ok: true, method: 'download', filename };
  } catch (error) {
    console.error('Download fallback failed.', error);
    return { ok: false, reason: 'error', error };
  }
}
