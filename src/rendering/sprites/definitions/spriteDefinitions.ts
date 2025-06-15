import type { SpriteRegistration } from '@/rendering/sprites/interfaces/SpriteRegistration';

export const tutorialSpritesDefinition: SpriteRegistration[] = [
  {
    key: 'key_w',
    sheetId: 'keyboard',
    animationId: 'key_w',
    x: 120,
    y: 400,
  },
  {
    key: 'key_a',
    sheetId: 'keyboard',
    animationId: 'key_a',
    x: 60,
    y: 460,
  },
  {
    key: 'key_s',
    sheetId: 'keyboard',
    animationId: 'key_s',
    x: 120,
    y: 460,
  },
  {
    key: 'key_d',
    sheetId: 'keyboard',
    animationId: 'key_d',
    x: 180,
    y: 460,
  },
  {
    key: 'mouse_click',
    sheetId: 'mouse',
    animationId: 'click',
    x: 300,
    y: 420,
  },
];

export const blockDropDecisionMenuSpritesDefinition: SpriteRegistration[] = [
  // Controls for refine
  {
    key: 'key_r',
    sheetId: 'keyboard',
    animationId: 'key_1',
    x: 120,
    y: 400,
  },
  {
    key: 'b',
    sheetId: 'controller_xbox',
    animationId: 'b',
    x: 180,
    y: 400,
  },
  {
    key: 'circle',
    sheetId: 'controller_ps',
    animationId: 'circle',
    x: 180,
    y: 400,
  },
  // Controls for autoplace
  {
    key: 'key_space',
    sheetId: 'keyboard',
    animationId: 'key_2',
    x: 180,
    y: 400,
  },
  {
    key: 'a',
    sheetId: 'controller_xbox',
    animationId: 'a',
    x: 120,
    y: 400,
  },
  {
    key: 'cross',
    sheetId: 'controller_ps',
    animationId: 'cross',
    x: 120,
    y: 400,
  },
];
