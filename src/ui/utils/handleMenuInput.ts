// src/ui/utils/handleMenuInput.ts

import type { InputManager } from '@/core/InputManager';
import type { Menu } from '@/ui/interfaces/Menu';
import type { MenuManager } from '@/ui/MenuManager';
import type { BlockDropDecisionMenu } from '@/ui/menus/BlockDropDecisionMenu';

import { audioManager } from '@/audio/Audio';

type MenuContext = {
  inputManager: InputManager;
  pause: () => void;
  resume: () => void;
  shipBuilderMenu: Menu;
  pauseMenu: Menu;
  settingsMenu: Menu;
  blockDropDecisionMenu: BlockDropDecisionMenu;
  menuManager: MenuManager;
};

export function handleMenuInput({
  inputManager,
  pause,
  resume,
  shipBuilderMenu,
  pauseMenu,
  settingsMenu, // retained for future extension
  blockDropDecisionMenu,
  menuManager,
}: MenuContext): void {
  const tabPressed = inputManager.wasActionJustPressed('openShipBuilder');
  const escPressed = inputManager.wasActionJustPressed('pause');

  const activeMenu = menuManager.getTop();
  const blockDecisionMenuIsTop = activeMenu === blockDropDecisionMenu;

  // === TAB toggles ship builder ONLY when no other menu is open ===
  if (tabPressed) {
    if (blockDropDecisionMenu.isOpen()) {
      return;
    } else if (!settingsMenu.isOpen() && !pauseMenu.isOpen() && !shipBuilderMenu.isOpen() && !blockDropDecisionMenu.isOpen()) {
      console.log('Attempting to open blockDropDecisionMenu...')
      if (blockDropDecisionMenu.hasBlocksInQueue()) {
        console.log('Called openMenu on blockDropDecisionMenu')
        blockDropDecisionMenu.openMenu();
        return;
      } else {
        console.log('No blocks in queue, not opening blockDropDecisionMenu');
        audioManager.play('assets/sounds/sfx/ui/error_00.wav', 'sfx');
      }
    }
    console.log('Failed to open blockDropDecisionMenu');
    return;
  }

  // === ESC handles ship builder as a special case (even if not top) ===
  if (escPressed) {
    if (blockDropDecisionMenu.isOpen()) {
      return;
    }
    if (activeMenu) {
      menuManager.pop();

      if (!menuManager.anyOpen()) {
        resume();
      }
    } else {
      pause();
      menuManager.open(pauseMenu);
    }
  }
}
