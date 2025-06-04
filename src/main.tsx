// src/main.tsx

// Entry point: bootstraps game, canvas, and loop

import './index.css';
import { bootstrapGlobalGuards } from '@/shared/bootstrap';
import { initializeBlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { initializeProjectileSprites } from '@/rendering/cache/ProjectileSpriteCache';
import { initializePickupSpriteCache } from '@/rendering/cache/PickupSpriteCache';
import { initializeAsteroidBlockSpriteCache } from '@/rendering/cache/AsteroidSpriteCache';
import { audioManager } from '@/audio/Audio'; // Lazy instantiation

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

bootstrapGlobalGuards();
initializeProjectileSprites();
initializeBlockSpriteCache();
initializePickupSpriteCache();
initializeAsteroidBlockSpriteCache();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
);
