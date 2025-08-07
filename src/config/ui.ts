export interface UIConfig {
  window: WindowSettings;
  button: ButtonSettings;
  general: GeneralSettings;
}

interface WindowSettings {
  options: {
    alpha: number,
    borderRadius: number,
    borderColor: string,
    backgroundGradient: {
      type: 'linear' | 'radial';
      stops: { offset: number; color: string }[];
    };
  };
}

interface ButtonSettings {
  style: {
    borderRadius: number,
    alpha: number,
    borderColor: string,
    textFont: string,
    backgroundGradient: {
      type: 'linear' | 'radial',
      stops: { offset: number, color: string }[];
    }
  };
}

interface GeneralSettings {
  font: string;
  textColor: string;
  infoTextColor: string;
  blackColor: string;
  primaryColor: string;
  warningColor: string;
  statColor: string;
  hoverColor: string;
  accentColor: string;
  disabledColor: string;
  backgroundColor: string;
  glowColor: string;
}

export const DEFAULT_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#89d4ff',           // soft icy blue for main text
    infoTextColor: '#AAB6C2',       // subdued steel blue for secondary info
    blackColor: '#000818',          // deep black-blue
    primaryColor: '#002244',        // muted navy for UI blocks
    warningColor: '#ff5577',        // punchy magenta-red warning
    statColor: '#7788ff',           // vibrant stat blue
    hoverColor: '#88ccff',          // luminous blue on hover
    accentColor: '#66f2ff',         // electric cyan accent
    disabledColor: '#2a2f3a',       // cool desaturated gray-blue
    backgroundColor: '#000f1c',     // dark space-like backdrop
    glowColor: '#89d4ff',           // radiant soft blue glow
  },
  window: {
    options: {
      alpha: 0.92,
      borderRadius: 12,
      borderColor: '#66ccff',       // soft neon blue border
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#001933' },  // deep space blue
          { offset: 1, color: '#000d22' }   // darker gradient base
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.85,
      borderColor: '#66ccff',       // radiant blue
      textFont: '16px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#002244' },  // deep blue start
          { offset: 1, color: '#001122' }   // darker blue end
        ]
      }
    }
  }
};

export const VEIL_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#ff5555',       // blood red
    infoTextColor: '#ff8888',   // lighter red for secondary info
    blackColor: '#000000',      // absolute black
    primaryColor: '#220000',    // deep maroon for UI blocks
    warningColor: '#ff2222',    // bright hostile red
    statColor: '#ff4444',       // aggressive red
    hoverColor: '#aa0000',      // dark crimson hover
    accentColor: '#ff6666',     // lighter blood accent
    disabledColor: '#331111',   // desaturated dark red
    backgroundColor: '#0a0000', // near-black with red hint
    glowColor: '#ff2222',       // ominous red glow
  },
  window: {
    options: {
      alpha: 0.92,
      borderRadius: 12,
      borderColor: '#ff4444',   // hostile red border
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#330000' }, // deep blood red
          { offset: 1, color: '#110000' }  // black-red base
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.85,
      borderColor: '#ff4444',
      textFont: '16px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#220000' },
          { offset: 1, color: '#110000' }
        ]
      }
    }
  }
};

export const CRT_GREEN_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#00ff41',
    infoTextColor: '#AAA9AD',
    blackColor: '#001100',
    primaryColor: '#003f19',
    warningColor: 'ff4444',
    statColor: '#8888ff',
    hoverColor: '#ffff88',
    accentColor: '#00ff66',
    disabledColor: '#444444',
    backgroundColor: '#001a00',
    glowColor: '#00ff41',
  },
  window: {
    options: {
      alpha: 0.92,
      borderRadius: 12,
      borderColor: '#00ff33',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#001a00' },
          { offset: 1, color: '#000f00' }
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.9,
      borderColor: '#00ff00',
      textFont: '18px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#002200' },
          { offset: 1, color: '#001500' }
        ]
      }
    }
  }
};

export const SYNTH_WAVE_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#ff71ce',           // neon magenta for primary text
    infoTextColor: '#fcd6ff',       // pale lavender for secondary info
    blackColor: '#0a0014',          // deep synthwave black-purple
    primaryColor: '#240046',        // rich violet for UI panels
    warningColor: '#ff4f69',        // hot pink-red for warnings
    statColor: '#18dcff',           // electric cyan for stat highlights
    hoverColor: '#9f6eff',          // glowing violet on hover
    accentColor: '#08f7fe',         // neon blue-cyan accent
    disabledColor: '#3c2a4d',       // dimmed desaturated purple-gray
    backgroundColor: '#12002f',     // synthwave deep purple night
    glowColor: '#ff71ce',           // radiant pink glow for highlights
  },
  window: {
    options: {
      alpha: 0.92,
      borderRadius: 12,
      borderColor: '#08f7fe',       // crisp blue neon frame
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#240046' },  // vivid violet top
          { offset: 1, color: '#12002f' }   // deep night purple base
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.85,
      borderColor: '#9f6eff',       // vibrant purple-pink edge
      textFont: '16px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#3a0ca3' },  // rich ultraviolet
          { offset: 1, color: '#240046' }   // dark synthwave core
        ]
      }
    }
  }
};

export const NEON_CYAN_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#4efbff',           // vivid aqua for main text
    infoTextColor: '#a5f6ff',       // softer sky-blue for secondary info
    blackColor: '#001015',          // deep cyan-black
    primaryColor: '#003b46',        // dark teal for panels
    warningColor: '#ff4f5e',        // hot coral for alerts
    statColor: '#00ffe5',           // hyper-saturated aqua-mint for stat highlights
    hoverColor: '#6efbff',          // lighter cyan glow on hover
    accentColor: '#00faff',         // piercing neon cyan accent
    disabledColor: '#1a3a40',       // muted teal-gray
    backgroundColor: '#001820',     // dark blue-teal night
    glowColor: '#00faff',           // neon cyan glow
  },
  window: {
    options: {
      alpha: 0.94,
      borderRadius: 12,
      borderColor: '#00faff',       // neon cyan border
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#003b46' },  // deep teal top
          { offset: 1, color: '#001820' }   // dark aqua base
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.9,
      borderColor: '#00faff',       // bright cyan edge
      textFont: '16px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#006d75' },  // rich teal-cyan start
          { offset: 1, color: '#003b46' }   // deeper aqua end
        ]
      }
    }
  }
};

export const SOLAR_FLARE_CONFIG: UIConfig = {
  general: {
    font: 'monospace',
    textColor: '#ffcf73',           // molten gold for main text
    infoTextColor: '#ffe6b3',       // pale golden cream for secondary info
    blackColor: '#140900',          // deep volcanic black-brown
    primaryColor: '#4a2100',        // dark burnt orange for panels
    warningColor: '#ff7a3c',        // hot orange-red for alerts
    statColor: '#ffd14f',           // bright goldenrod for stat highlights
    hoverColor: '#ffb347',          // amber glow on hover
    accentColor: '#ffa200',         // pure orange-gold accent
    disabledColor: '#3b2b1a',       // muted brown-orange
    backgroundColor: '#1a0c00',     // ember-dark background
    glowColor: '#ffb347',           // warm amber glow
  },
  window: {
    options: {
      alpha: 0.94,
      borderRadius: 12,
      borderColor: '#ffa200',       // golden-orange frame
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#4a2100' },  // dark ember top
          { offset: 1, color: '#1a0c00' }   // deeper volcanic base
        ]
      }
    }
  },
  button: {
    style: {
      borderRadius: 10,
      alpha: 0.88,
      borderColor: '#ffb347',       // amber edge
      textFont: '16px monospace',
      backgroundGradient: {
        type: 'linear',
        stops: [
          { offset: 0, color: '#ff7a3c' },  // bright orange flame
          { offset: 1, color: '#4a2100' }   // ember-dark fade
        ]
      }
    }
  }
};
