import { useEffect } from 'react';
import { EngineRuntime } from '@/core/EngineRuntime';

let runtime: EngineRuntime | null = null;
let initialized = false;

function App() {
  useEffect(() => {
    if (initialized) return;
    initialized = true;

    const container = document.getElementById('canvas-root');
    if (!container) throw new Error('Missing canvas root');

    runtime = new EngineRuntime();
    runtime.start();
  }, []);

  return (
    <div className="App">
      <div id="canvas-root">
        <canvas id="background-canvas" />
        <canvas id="entity-canvas" />
        <canvas id="fx-canvas" />
        <canvas id="particles-canvas" />
        <canvas id="ui-canvas" />
        <canvas id="overlay-canvas" />
      </div>
    </div>
  );
}

export default App;
