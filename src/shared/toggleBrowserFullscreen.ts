// Helper function for browser fullscreen
export function toggleBrowserFullscreen(): void {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    const element = document.documentElement; // or document.getElementById('canvas-root')
    
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(err => {
        console.warn('Failed to enter fullscreen:', err);
      });
    } else if ((element as any).webkitRequestFullscreen) {
      // Safari
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
      // IE/Edge
      (element as any).msRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      // Firefox
      (element as any).mozRequestFullScreen();
    } else {
      console.warn('Fullscreen API not supported in this browser');
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen:', err);
      });
    } else if ((document as any).webkitExitFullscreen) {
      // Safari
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      // IE/Edge
      (document as any).msExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      // Firefox
      (document as any).mozCancelFullScreen();
    }
  }
}

// Alternative: More concise version with modern browser support
export function toggleBrowserFullscreenModern(): void {
  if (!document.fullscreenElement) {
    // Enter fullscreen - target the canvas root or entire document
    const target = document.getElementById('canvas-root') || document.documentElement;
    target.requestFullscreen?.().catch(err => {
      console.warn('Fullscreen not supported or failed:', err);
    });
  } else {
    // Exit fullscreen
    document.exitFullscreen?.().catch(err => {
      console.warn('Failed to exit fullscreen:', err);
    });
  }
}

// Enhanced version with event listeners for fullscreen changes
export function setupFullscreenHandling(): void {
  // Listen for fullscreen changes to update game state if needed
  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      console.log('Entered fullscreen mode');
      // Optional: Trigger resolution change or UI updates
    } else {
      console.log('Exited fullscreen mode');
      // Optional: Restore previous state
    }
  });

  // Handle fullscreen errors
  document.addEventListener('fullscreenerror', (event) => {
    console.warn('Fullscreen error:', event);
  });
}
