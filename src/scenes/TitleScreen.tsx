// src/scenes/TitleScreen.tsx
import { sceneManager } from '@/core/SceneManager';

export function TitleScreen() {
  return (
    <div className="scene title-screen">
      <h1>🚀 Shipwright Survivors</h1>
      <button onClick={() => sceneManager.setScene('hub')}>New Game</button>
      <button disabled>Load Game (coming soon)</button>
      <button disabled>Settings</button>
      <button disabled>Credits</button>
    </div>
  );
}
