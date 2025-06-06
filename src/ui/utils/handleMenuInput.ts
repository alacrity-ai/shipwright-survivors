// src/ui/utils/handleMenuInput.ts

import type { InputManager } from '@/core/InputManager';
import type { Menu } from '@/ui/interfaces/Menu';
import type { MenuManager } from '@/ui/MenuManager';

type MenuContext = {
  inputManager: InputManager;
  pause: () => void;
  resume: () => void;
  shipBuilderMenu: Menu;
  pauseMenu: Menu;
  settingsMenu: Menu;
  menuManager: MenuManager;
};

export function handleMenuInput({
  inputManager,
  pause,
  resume,
  shipBuilderMenu,
  pauseMenu,
  settingsMenu, // retained for future extension
  menuManager,
}: MenuContext): void {
  const tabPressed = inputManager.wasKeyJustPressed('Tab');
  const escPressed = inputManager.wasKeyJustPressed('Escape');

  const activeMenu = menuManager.getTop();
  const shipBuilderIsTop = activeMenu === shipBuilderMenu;

  // === TAB toggles ship builder ONLY when no other menu is open ===
  if (tabPressed) {
    if (shipBuilderMenu.isOpen() && shipBuilderIsTop) {
      menuManager.close(shipBuilderMenu);
      resume();
    } else if (!menuManager.anyOpen()) {
      menuManager.open(shipBuilderMenu);
      pause();
    }
    return;
  }

  // === ESC handles ship builder as a special case (even if not top) ===
  if (escPressed) {
    if (shipBuilderMenu.isOpen()) {
      menuManager.close(shipBuilderMenu);
      resume();
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
