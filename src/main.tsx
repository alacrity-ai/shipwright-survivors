// src/main.tsx

// Entry point: bootstraps game, canvas, and loop

import './index.css';
import { bootstrapGlobalGuards } from '@/shared/bootstrap';
import { initializeBlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { initializePickupSpriteCache } from '@/rendering/cache/PickupSpriteCache';
import { initializeAsteroidBlockSpriteCache } from '@/rendering/cache/AsteroidSpriteCache';
import { initializeProjectileSpriteCache } from './rendering/cache/ProjectileSpriteCache';
import { BlockManager } from './game/blocks/system/BlockManager';
import { PassiveTreeDeserializer } from '@/game/passives/json/PassiveTreeDeserializer';
import { PlayerGlobalPassiveManager } from '@/game/player/PlayerGlobalPassiveManager';
import { initializePassiveIconCache } from '@/game/passives/icons/passiveIconCache';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

(async () => {
  // === Global guards and initialization
  bootstrapGlobalGuards();

  // === Initialize Block Manager
  BlockManager.initialize();

  // === Parallelized cache preloading
  await Promise.all([
    initializeProjectileSpriteCache(),
    initializeBlockSpriteCache(),
    initializePickupSpriteCache(),
    initializeAsteroidBlockSpriteCache(),
  ]);

  await initGlobalPassives();

  // === Mount React application
  ReactDOM.createRoot(document.getElementById('root')!).render(<App />);

  // === Fade out splash screen, then remove it
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 400); // Match CSS transition duration
  }
})();

async function initGlobalPassives() {
  initializePassiveIconCache();
  const json = await (await fetch('/assets/passives/player-passives.json')).text();
  const tree = PassiveTreeDeserializer.fromJSON(json);
  PlayerGlobalPassiveManager.getInstance().setPassiveTree(tree);
}