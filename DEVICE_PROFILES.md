Device Profiles Module
ts
Copy
Edit
// src/config/deviceProfiles.ts
import { isMobile } from '@/shared/isMobile';
import { detectSteamDeck } from '@/shared/detectSteamDeck';

export interface DeviceProfile {
  name: 'mobile' | 'steamdeck' | 'pc';
  maxBlocksGL: number;
  maxLightsGL: number;
  maxParticlesGL: number;
  maxSpritesGL: number;
  maxFireGL: number;
  maxDamageTextGL: number;
}

// Profiles tuned for typical GPU/VRAM constraints:
export const DEVICE_PROFILES: Record<DeviceProfile['name'], DeviceProfile> = {
  mobile: {
    name: 'mobile',
    maxBlocksGL: 2048,
    maxLightsGL: 1200,
    maxParticlesGL: 8000,
    maxSpritesGL: 3000,
    maxFireGL: 4000,
    maxDamageTextGL: 2000,
  },
  steamdeck: {
    name: 'steamdeck',
    maxBlocksGL: 4096,
    maxLightsGL: 4000,      // RDNA2 shared memory, safe cap
    maxParticlesGL: 20000,
    maxSpritesGL: 6000,
    maxFireGL: 6000,
    maxDamageTextGL: 4000,
  },
  pc: {
    name: 'pc',
    maxBlocksGL: 8192,
    maxLightsGL: 10000,
    maxParticlesGL: 30000,
    maxSpritesGL: 10000,
    maxFireGL: 10000,
    maxDamageTextGL: 10000,
  },
};

export function detectDeviceProfile(): DeviceProfile {
  if (isMobile()) return DEVICE_PROFILES.mobile;
  if (detectSteamDeck()) return DEVICE_PROFILES.steamdeck;
  return DEVICE_PROFILES.pc;
}
Detection Helpers
You can use UA sniffing for Steam Deck (it identifies as Linux + SteamOS + specific Chrome build):

ts
Copy
Edit
// src/shared/detectSteamDeck.ts
export function detectSteamDeck(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('steam') && ua.includes('linux'); 
  // Steam Deck’s default browser/SteamOS UA usually includes these
}
And mobile:

ts
Copy
Edit
// src/shared/isMobile.ts
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android|iphone|ipad|ipod|iemobile|mobile/i.test(navigator.userAgent);
}
Usage in Your Engine
In App.tsx:

ts
Copy
Edit
import { detectDeviceProfile } from '@/config/deviceProfiles';

const deviceProfile = detectDeviceProfile();
(window as any).__DEVICE_PROFILE__ = deviceProfile;

console.log(`Running on ${deviceProfile.name} with lighting cap`, deviceProfile.maxLightsGL);
Then in LightingPass.ts:

ts
Copy
Edit
const profile = (window as any).__DEVICE_PROFILE__;
const MAX_POINT_LIGHTS = profile?.maxLightsGL ?? 10000;
const FLOATS_PER_LIGHT = 12;

this.lightData = new Float32Array(MAX_POINT_LIGHTS * FLOATS_PER_LIGHT);
Why this is preferable:
All tuning is centralized (easy to tweak when profiling VRAM usage).

Device-specific limits prevent crashes on phones and throttling on Steam Deck.

Still allows you to increase caps dynamically for high-end PCs.