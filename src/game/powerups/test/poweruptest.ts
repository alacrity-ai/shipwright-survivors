import { PlayerPowerupManager } from '@/game/player/PlayerPowerupManager';
import { PowerupRegistry } from '@/game/powerups/registry/PowerupRegistry';
import { getAggregatedPowerupEffects } from '@/game/powerups/runtime/ActivePowerupEffectResolver';

export function testPowerups() {
  PowerupRegistry.initialize();
  const playerPowerups = PlayerPowerupManager.getInstance().getAll();
  assert (playerPowerups.length === 0, 'Player should have no powerups at start');

  const allPowerups = PowerupRegistry.getAll();
  console.log('[testPowerups] All powerups: ', allPowerups);
  assert (allPowerups.length > 0, 'There should be some powerups defined');

  const eligible = PowerupRegistry.getEligiblePowerupNodes(new Set());
  console.log('[testPowerups] Eligible powerups: ', eligible);
  assert (eligible.length > 0, 'There should be some eligible powerups at the start');

  generateRandomSelectionTestBasic();
  testExclusiveBranchEnforcement();
}

export function testActivePowerupEffectResolver(): void {
  const effects = getAggregatedPowerupEffects();
  console.log('[testActivePowerupEffectResolver] Aggregated effects: ', effects);
}

// Tests that we get back 3 selections with no player upgrades
function generateRandomSelectionTestBasic(): void {
  const manager = PlayerPowerupManager.getInstance();
  const acquired = manager.getAcquiredSet();

  // Compute all eligible nodes using finalized branching logic
  const candidates = PowerupRegistry.getEligiblePowerupNodes(acquired);

  // Randomize and choose 3
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selectedNodes = shuffled.slice(0, 3);

  // There are enough roots in the game to gaurantee always 3 on the first call
  // In subsequent calls, we should always get 3 back, because we have ephemeral nodes that scale infinitely
  // So even if there were only 3 roots in the game, that means the player would have upgraded down the other trees
  // enough that they would get back 3 ephemeral children nodes
  assert (selectedNodes.length === 3, 'Should always select 3 powerups.');
}

function testExclusiveBranchEnforcement(): void {
  PowerupRegistry.initialize();
  const manager = PlayerPowerupManager.getInstance();
  manager.reset();

  // Step 1: Acquire root node for shared tree
  manager.acquire('critical-hit-1'); // Entry point to the critical tree

  // Step 2: Simulate selecting the left branch: critical-surge-2
  manager.acquire('critical-surge-2');

  // Step 3: Query eligible nodes
  const acquired = manager.getAcquiredSet();
  const eligible = PowerupRegistry.getEligiblePowerupNodes(acquired);

  console.log('[testExclusiveBranchEnforcement] Acquired:', [...acquired]);
  console.log('[testExclusiveBranchEnforcement] Eligible:', eligible.map(n => n.id));

  // Step 4: Ensure no vampirism options are present
  const forbiddenIds = [
    'vampirism-2',
    'vampirism-3',
    'vampirism-4',
    'vampirism-5',
  ];

  for (const forbidden of forbiddenIds) {
    assert(
      !eligible.some(n => n.id === forbidden),
      `Exclusive node ${forbidden} should NOT be eligible once alternate branch is taken`
    );
  }

  console.log('Exclusive branch enforcement passed: no conflicting nodes offered');
}


function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`Assertion passed: ${message}`);
  }
}
