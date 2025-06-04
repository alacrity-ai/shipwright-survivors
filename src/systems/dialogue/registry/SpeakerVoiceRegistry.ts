import type { SpeakerVoiceProfile } from '@/systems/dialogue/interfaces/SpeakerVoiceProfile';
import { getAssetPath } from '@/shared/assetHelpers';

export class SpeakerVoiceRegistry {
  private readonly profiles = new Map<string, SpeakerVoiceProfile>();
  private readonly portraitCache = new Map<string, HTMLImageElement>();

  constructor() {
    this.loadDefaults();
  }

  private loadDefaults(): void {
    // Main cast
    this.register({
      id: 'marla',
      portrait: this.loadImage('assets/characters/character_marla-thinx.png'),
      blipAudioFile: 'assets/sounds/bleeps/girl_ah.wav',
      basePitch: 1.2,
      textSpeed: 0.04,
      pitchVariance: 0.3,
      syllableDuration: 120,
      portraitOffset: { x: -100, y: -200 },
    });

    this.register({
      id: 'rexor',
      portrait: this.loadImage('assets/characters/character_rexor-the-intern.png'),
      blipAudioFile: 'assets/sounds/bleeps/man_eh.wav',
      textSpeed: 0.04,
      basePitch: 0.85,
      pitchVariance: 0.15,
      portraitOffset: { x: -100, y: -200 },
    });

    this.register({
      id: 'carl',
      portrait: this.loadImage('assets/characters/character_carl.png'),
      blipAudioFile: 'assets/sounds/bleeps/man_ah.wav',
      textSpeed: 0.04,
      pitchVariance: 0.5,
      syllableDuration: 100,
      basePitch: 0.95,
    });

    this.register({
      id: 'hero',
      portrait: this.loadImage('assets/characters/character_hero.png'),
      blipAudioFile: 'assets/sounds/bleeps/man_ee.wav',
      basePitch: 1.0,
    });

    this.register({
      id: 'the-board',
      portrait: this.loadImage('assets/characters/character_the-board.png'),
      blipAudioFile: 'assets/sounds/bleeps/girl_oh.wav',
      basePitch: 1.1,
    });

    // Bosses
    this.register({
      id: 'crazy-moe',
      portrait: this.loadImage('assets/characters/bosses/character_boss_wildjoe.png'),
      blipAudioFile: 'assets/sounds/bleeps/man_eh.wav',
      basePitch: 0.8,
      textSpeed: 0.05,
      pitchVariance: 0.5,
    });
  }

  private loadImage(path: string): HTMLImageElement {
    const resolvedPath = getAssetPath(path);

    if (this.portraitCache.has(resolvedPath)) {
      return this.portraitCache.get(resolvedPath)!;
    }

    const img = new Image();
    img.src = resolvedPath;
    this.portraitCache.set(resolvedPath, img);
    return img;
  }

  public register(profile: SpeakerVoiceProfile): void {
    this.profiles.set(profile.id, profile);
  }

  public getProfile(id: string): SpeakerVoiceProfile | undefined {
    return this.profiles.get(id);
  }

  public getAll(): Map<string, SpeakerVoiceProfile> {
    return this.profiles;
  }
}

export const speakerVoiceRegistry = new SpeakerVoiceRegistry();
