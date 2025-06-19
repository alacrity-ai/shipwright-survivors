// src/main.tsx

// Entry point: bootstraps game, canvas, and loop

import './index.css';
import { bootstrapGlobalGuards } from '@/shared/bootstrap';
import { initializeBlockSpriteCache } from '@/rendering/cache/BlockSpriteCache';
import { initializePickupSpriteCache } from '@/rendering/cache/PickupSpriteCache';
import { initializeAsteroidBlockSpriteCache } from '@/rendering/cache/AsteroidSpriteCache';
import { initializeProjectileSpriteCache } from './rendering/cache/ProjectileSpriteCache';
import { audioManager } from '@/audio/Audio'; // Lazy instantiation

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

bootstrapGlobalGuards();
initializeProjectileSpriteCache();
initializeBlockSpriteCache();
initializePickupSpriteCache();
initializeAsteroidBlockSpriteCache();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <App />
);
