// src/game/waves/scripting/ScriptRunner.ts

export interface ScriptContext {
  waveIndex: number;
  waveDefinition: any; // Could tighten this to `WaveDefinition` if needed
}

export interface ScriptRunner {
  register(scriptName: string, handler: (ctx: ScriptContext) => void): void;
  execute(scriptName: string, ctx?: ScriptContext): void;
  has(scriptName: string): boolean;
}

export class DefaultScriptRunner implements ScriptRunner {
  private readonly scripts: Map<string, (ctx: ScriptContext) => void> = new Map();

  public register(name: string, handler: (ctx: ScriptContext) => void): void {
    if (this.scripts.has(name)) {
      console.warn(`[ScriptRunner] Script "${name}" is already registered. Overwriting.`);
    }
    this.scripts.set(name, handler);
  }

  public execute(name: string, ctx: ScriptContext = { waveIndex: -1, waveDefinition: {} }): void {
    const handler = this.scripts.get(name);
    if (!handler) {
      console.warn(`[ScriptRunner] Unknown script: "${name}"`);
      return;
    }

    try {
      handler(ctx);
    } catch (err) {
      console.error(`[ScriptRunner] Error executing script "${name}":`, err);
    }
  }

  public has(name: string): boolean {
    return this.scripts.has(name);
  }
}
