// vitest.setup.ts
// Provide a stubbed AudioContext so tests don't crash in Node/jsdom

class MockAudioContext {
  destination = {};
  currentTime = 0;
  state = 'running';
  resume = () => {};
  createGain() {
    return {
      connect: () => {},
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        cancelScheduledValues: () => {},
      },
      disconnect: () => {},
    };
  }
  createStereoPanner() {
    return {
      connect: () => {},
      pan: { value: 0 },
      disconnect: () => {},
    };
  }
  createBufferSource() {
    return {
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      playbackRate: { value: 1 },
      buffer: null,
    };
  }
  decodeAudioData() {
    return Promise.resolve({});
  }
}

(globalThis as any).AudioContext = MockAudioContext;
