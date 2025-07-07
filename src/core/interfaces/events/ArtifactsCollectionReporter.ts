// src/core/interfaces/events/ArtifactsCollectionReporter.ts

import { GlobalEventBus } from '@/core/EventBus';

export function reportArtifactsCollectionOpened(slotIndex: 0 | 1 | 2): void {
  GlobalEventBus.emit('ui:artifacts:collection-opened', { slotIndex });
}

export function reportArtifactsCollectionClosed(): void {
  GlobalEventBus.emit('ui:artifacts:collection-closed', undefined);
}

export function reportArtifactEquipped(
  shipName: string,
  slotIndex: 0 | 1 | 2,
  artifactId: string
): void {
  GlobalEventBus.emit('ui:artifacts:equipped', { shipName, slotIndex, artifactId });
}
