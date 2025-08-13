// src/game/tutorials/definitions/movementTutorial.ts

import { TutorialSlide } from '@/game/tutorials/interfaces/TutorialSlide';

export const movementTutorialSlides: TutorialSlide[] = [
  {
    id: 'movement-intro',
    imagePath: 'assets/tutorial/movement/movement_00.png',
    caption: 'Welcome to the Movement Tutorial!',
  },
  {
    id: 'movement-wasd',
    imagePath: 'assets/tutorial/movement/movement_01.png',
    caption: 'Use WASD to move your ship.',
  }
  // Add more slides as needed
];
