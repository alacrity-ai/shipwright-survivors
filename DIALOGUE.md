# Vocal Blip System

## 🧠 Conceptual Overview

### ✳️ Inputs

- `speakerProfile: SpeakerVoiceProfile`
    
- `message: string`
    

### ✳️ Outputs

- `blipTimeline: { syllable: string; timestamp: number; duration: number; audioFile: string; pitch: number }[]`
    
- `totalDuration: number`
    

---

## ⚙️ System Architecture

### 1. **Syllable Segmentation**

You will need an English syllable parser. Consider:

#### 🔹 [`syllable`](https://www.npmjs.com/package/syllable)

bash

CopyEdit

`npm install syllable`

However, `syllable` only returns syllable **count**, not segmentation.

#### 🔹 [`hyphenate`](https://www.npmjs.com/package/hyphenate%60) (or `hypher`)

More suitable. With a pattern dictionary, it splits into syllables:

```
import Hypher from 'hypher';
import english from 'hyphenation.en-us';

const h = new Hypher(english);
const syllables = h.hyphenate('modularize'); // ["mod", "u", "lar", "ize"]

```

---

### 2. **Timeline Construction**

Each syllable will be mapped to an audio “blip” with timing offsets.

```
type BlipTimelineEntry = {
  syllable: string;
  timestamp: number; // when to play relative to start (ms)
  duration: number;
  audioFile: string;
  pitch: number;
};

```

You’ll need to decide on:

- **Base syllable duration** (e.g., 120ms per syllable)
    
- **Variable timing**: optional (based on syllable stress, or random jitter for naturalism)
    
- **Speaker profile**, e.g.:
    

```
type BlipTimelineEntry = {
  syllable: string;
  timestamp: number; // when to play relative to start (ms)
  duration: number;
  audioFile: string;
  pitch: number;
};

```

---

### 3. **Timeline Generator**

```
function generateBlipTimeline(message: string, speaker: SpeakerVoiceProfile): BlipTimelineEntry[] {
  const h = new Hypher(english);
  const words = message.split(/\s+/);

  let timeline: BlipTimelineEntry[] = [];
  let cursor = 0;

  for (const word of words) {
    const syllables = h.hyphenate(word);
    for (const syllable of syllables) {
      const duration = speaker.syllableDuration ?? 120;
      const pitch = speaker.basePitch + (speaker.pitchVariance ?? 0) * (Math.random() - 0.5);
      timeline.push({
        syllable,
        timestamp: cursor,
        duration,
        audioFile: speaker.blipAudioFile,
        pitch
      });
      cursor += duration;
    }
    cursor += 80; // inter-word pause (optional)
  }

  return timeline;
}

```

---

### 4. **Text Sync**

To sync with a _rolling text renderer_, expose:

- `blipTimeline.length === syllable count === characters shown over time`
    
- Interpolate syllable index over elapsed time to show corresponding text chunk.
    

Example strategy:

```
function getTextToDisplay(elapsedTime: number, timeline: BlipTimelineEntry[]): string {
  let index = timeline.findIndex(b => b.timestamp > elapsedTime);
  if (index === -1) index = timeline.length;
  return timeline.slice(0, index).map(b => b.syllable).join('');
}

```

---

### 5. **Playback Engine**

Use `Howler.js`, `WebAudio`, or similar to schedule blips:

```
function playBlipTimeline(timeline: BlipTimelineEntry[]) {
  for (const entry of timeline) {
    setTimeout(() => {
      const sound = new Howl({
        src: [entry.audioFile],
        rate: entry.pitch,
        volume: 1
      });
      sound.play();
    }, entry.timestamp);
  }
}

```

If you use `AudioBufferSourceNode`, you could use `AudioContext.currentTime` + `scheduleAt`.

---

## 📦 Output

Return both the timeline and total duration:

```
return {
  blipTimeline,
  totalDuration: blipTimeline.at(-1)?.timestamp + blipTimeline.at(-1)?.duration
};

```

---

## 🧪 Extensions (Optional for Immersion)

- **Stress-based durations** using a lexical stress dictionary.
    
- **Emotion filters** (e.g., urgency → faster rate, sorrow → lower pitch).
    
- **Multi-blip phoneme banks** per character.
    
- **Visemes** or sound-reactive facial sprites.


# Dialogue System

This is the system where character portraits, and textboxes, and audio blip playback are managed

## 🧱 **System: `DialogueOrchestrator`**

This system _orchestrates_ the visual and auditory presentation of a dialogue line, across any rendering context (hub scene, mission context). It is not the renderer itself, but a coordinator that invokes:

- `PortraitRenderer`
    
- `TextboxRenderer`
    
- `RollingTextRenderer`
    
- `BlipAudioSynchronizer`
    

Each of those may be mode-aware and stylized accordingly.

---

## 🧩 **Subcomponents and Responsibilities**

### 🖼 `PortraitRenderer`

- Draws the speaker's face.
    
- Has mode-specific rendering variants:
    
    - **In-Person Mode**: raw portrait at specified position and scale.
        
    - **Transmission Mode**: portrait with border, CRT overlay, optional green tint.
        
- Parameters:
    
    - `x`, `y`, `scale`, `mode`, `opacity`, `styleOverlay?: boolean`
        

### 🧾 `TextboxRenderer`

- Draws the container in which text is rendered.
    
- Variants:
    
    - **Speech Bubble**: rounded white or black bubble with tail.
        
    - **CRT Box**: flat green console-style background with scanlines or noise.
        
- Parameters:
    
    - `x`, `y`, `width`, `height`, `mode`, `borderStyle`
        

### ⌨️ `RollingTextRenderer`

- Takes a string and renders it character-by-character or syllable-by-syllable over time.
    
- Tracks `elapsedTime`, `textIndex`.
    
- Parameters:
    
    - `font`, `color`, `lineSpacing`, `charDelay`, `mode` (e.g., CRT)
        
    - `syllableSync` hook for audio coordination
        

### 🔊 `BlipAudioSynchronizer`

- Maps syllables → pitch-adjusted blip sounds.
    
- Schedules them in sync with `RollingTextRenderer`.
    

---

## 🧠 **DialogueOrchestrator: Class Overview**

```
export class DialogueOrchestrator {
  private currentLine: DialogueLine | null = null;
  private elapsed = 0;

  private portraitRenderer: PortraitRenderer;
  private textboxRenderer: TextboxRenderer;
  private textRenderer: RollingTextRenderer;
  private audioSynchronizer: BlipAudioSynchronizer;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly voiceRegistry: CharacterVoiceRegistry,
    private readonly audioManager: AudioManager
  ) {}

  public start(line: DialogueLine): void;
  public update(dt: number): void;
  public render(): void;
  public isComplete(): boolean;
}

```

---

## 📘 **DialogueLine DTO**

```
interface DialogueLine {
  speakerId: string;             // Character lookup key
  text: string;
  position: { x: number; y: number }; // Portrait anchoring
  mode: 'inPerson' | 'transmission'; // Drives styling
  textBoxRect: { x: number; y: number; width: number; height: number };
  textColor?: string;            // Optional override (e.g. CRT green)
  font?: string;
}

```

---

## 🧠 **Rendering Flow**

```
update(dt: number) {
  if (!this.currentLine) return;

  this.elapsed += dt;
  this.textRenderer.update(dt);

  const syllableIndex = this.textRenderer.getCurrentSyllableIndex();
  this.audioSynchronizer.update(syllableIndex);
}

render() {
  if (!this.currentLine) return;

  const ctx = this.canvasManager.getContext('ui');

  this.portraitRenderer.render(ctx, this.currentLine);
  this.textboxRenderer.render(ctx, this.currentLine);
  this.textRenderer.render(ctx, this.currentLine);
}

```

---

## 🛠 **Mode-Specific Rendering Behaviors**

|Mode|Portrait Style|Textbox Style|Text Style|Audio Style|
|---|---|---|---|---|
|`inPerson`|Raw sprite at (x,y)|Speech bubble (tail)|Black font, warm tone|Friendly blips|
|`transmission`|Portrait-in-frame + overlay|CRT box (green glow)|Green pixel font (LCD feel)|Garbled radio chirps|

Each renderer uses `line.mode` to determine its rendering pipeline.

---

## ⚙️ **Composable Design: Future Extensibility**

- Add viseme facial sync to `PortraitRenderer`
    
- Add typewriter noise or CRT scanlines to `RollingTextRenderer`
    
- Add dialogue queue manager (`DialogueScene`) for chaining lines and blocking input
    
- Extend `BlipAudioSynchronizer` with pitch-by-syllable mappings for richer voice variety
    

---

## 🔁 Usage Example

```
dialogueOrchestrator.start({
  speakerId: 'commander',
  text: 'Pilot, we’re reading an energy surge ahead.',
  position: { x: 50, y: 400 },
  mode: 'transmission',
  textBoxRect: { x: 300, y: 500, width: 640, height: 120 },
  textColor: '#00ff00',
  font: 'CRTMono'
});

```

Then call `dialogueOrchestrator.update(dt)` and `render()` per frame.

# Detailed Architecture

## 📁 `src/systems/dialogue/`

### 🔹 Directory Overview

```
src/
└── systems/
    └── dialogue/
        ├── DialogueOrchestrator.ts              <-- Top-level coordination system
        ├── renderers/
        │   ├── PortraitRenderer.ts              <-- Renders character portraits
        │   ├── TextboxRenderer.ts               <-- Renders speech bubbles / CRT boxes
        │   └── RollingTextRenderer.ts           <-- Handles animated text reveal
        ├── audio/
        │   └── BlipAudioSynchronizer.ts         <-- Schedules and plays syllable blips
        ├── utils/
        │   ├── syllableUtils.ts                 <-- Syllable splitting + timeline gen
        │   └── dialogueLayout.ts                <-- Shared layout utilities
        ├── interfaces/
        │   ├── DialogueLine.ts                  <-- DTO for a dialogue line
        │   ├── SpeakerVoiceProfile.ts           <-- Portrait + blip sound config
        │   ├── BlipTimelineEntry.ts             <-- Timeline of syllables and timing
        │   └── DialogueMode.ts                  <-- Enum or string literal types

```

---

## 🗂 File Details and Purpose

### `DialogueOrchestrator.ts`

- Manages overall dialogue state
    
- Owns the `update(dt)` and `render()` loop
    
- Composes the renderers and synchronizer
    

### `renderers/`

- **`PortraitRenderer.ts`**: Handles portrait positioning, tint overlays, CRT border box
    
- **`TextboxRenderer.ts`**: Speech bubble or CRT-style box renderer
    
- **`RollingTextRenderer.ts`**: Time-synced character/word/syllable rollout logic
    

### `audio/`

- **`BlipAudioSynchronizer.ts`**: Maps syllables to blips, handles playback timing and voice profiles
    

### `utils/`

- **`syllableUtils.ts`**: Syllable splitting, phoneme-timeline construction, random pitch variance
    
- **`dialogueLayout.ts`**: Common layout constants, margin values, tail direction, etc.
    

### `interfaces/`

- **`DialogueLine.ts`**
    
```
export interface DialogueLine {
  speakerId: string;
  text: string;
  mode: 'inPerson' | 'transmission';
  position: { x: number; y: number };
  textBoxRect: { x: number; y: number; width: number; height: number };
  textColor?: string;
  font?: string;
}

```
    
- **`SpeakerVoiceProfile.ts`**
    
```
export interface SpeakerVoiceProfile {
  id: string;
  portrait: HTMLImageElement;
  blipAudioFile: string;
  basePitch: number;
  pitchVariance?: number;
  syllableDuration?: number;
  portraitOffset?: { x: number; y: number };
  transmissionStyle?: boolean;
}

```
    
- **`BlipTimelineEntry.ts`**
    
```
export interface BlipTimelineEntry {
  syllable: string;
  timestamp: number;
  duration: number;
  audioFile: string;
  pitch: number;
}

```
    
- **`DialogueMode.ts`**
    
```
export type DialogueMode = 'inPerson' | 'transmission';

```
    

---

## 🛠 Optional Future Expansion

- `transitions/` – scene transitions or portrait fades
    
- `visemes/` – animation frame coordination with syllables
    
- `themes/` – reusable visual styles and font/color presets
