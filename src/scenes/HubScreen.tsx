// src/scenes/HubScreen.tsx

import { useState } from 'react';
import { sceneManager } from '@/core/SceneManager';

import { GalaxyMapView } from './hub/GalaxyMapView';

type Tab = 'galaxy' | 'breakroom' | 'passives';

export function HubScreen() {
  const [tab, setTab] = useState<Tab>('galaxy');

  return (
    <div className="scene hub-screen">
      <nav>
        <button onClick={() => setTab('galaxy')}>Galaxy Map</button>
        <button onClick={() => setTab('breakroom')}>Breakroom</button>
        <button onClick={() => setTab('passives')}>Passive Tree</button>
        <button onClick={() => sceneManager.setScene('title')}>Exit to Title</button>
      </nav>

      <div className="hub-panel">
        {tab === 'galaxy' && <GalaxyMapView />}
        {tab === 'breakroom' && <div>[BreakroomView Placeholder]</div>}
        {tab === 'passives' && <div>[PassiveTreeView Placeholder]</div>}
      </div>
    </div>
  );
}
