// src/core/input/InputDeviceTracker.ts

import type { InputDevice } from '@/core/input/interfaces/InputDevice';

export class InputDeviceTracker {
  private static _instance: InputDeviceTracker | null = null;
  private lastUsed: InputDevice = 'keyboard';
  private lastUsedTimestamp: number = performance.now();

  private constructor() {}

  public static getInstance(): InputDeviceTracker {
    if (!InputDeviceTracker._instance) {
      InputDeviceTracker._instance = new InputDeviceTracker();
    }
    return InputDeviceTracker._instance;
  }

  public updateDevice(device: InputDevice): void {
    if (this.lastUsed !== device) {
      this.lastUsed = device;
      this.lastUsedTimestamp = performance.now();
    }
  }

  public getLastUsed(): InputDevice {
    return this.lastUsed;
  }

  public getLastUsedTimestamp(): number {
    return this.lastUsedTimestamp;
  }
}
