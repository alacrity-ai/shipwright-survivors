// src/systems/dialogue/utils/awaitCondition.ts

export function awaitCondition(
  predicate: () => boolean,
  checkIntervalMs = 100
): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (predicate()) {
        console.log('Condition met, resolving promise');
        resolve();
      } else {
        setTimeout(check, checkIntervalMs);
      }
    };
    check();
  });
}
