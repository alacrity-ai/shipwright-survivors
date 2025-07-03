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
