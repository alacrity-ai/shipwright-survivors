// src/systems/ai/formations/FormationRegistry.ts

export interface FormationMember {
  shipId: string;
  offset: { x: number; y: number }; // Local offset relative to leader
}

export interface Formation {
  formationId: string;
  leaderId: string;
  members: FormationMember[];
}

export class FormationRegistry {
  private readonly formations = new Map<string, Formation>();

  public registerFormation(formation: Formation): void {
    console.log('[FormationRegistry] Registering formation:', formation);
    this.formations.set(formation.formationId, formation);
  }

  public getFormation(formationId: string): Formation | undefined {
    return this.formations.get(formationId);
  }

  public removeFormation(formationId: string): void {
    this.formations.delete(formationId);
  }

  public clear(): void {
    this.formations.clear();
  }

  public getLeaderIdForShip(shipId: string): string | null {
    for (const formation of this.formations.values()) {
      if (formation.leaderId === shipId) return formation.leaderId;
      if (formation.members.some(m => m.shipId === shipId)) {
        return formation.leaderId;
      }
    }
    return null;
  }

  public getOffsetForShip(shipId: string): { x: number; y: number } | null {
    for (const formation of this.formations.values()) {
      const match = formation.members.find(m => m.shipId === shipId);
      if (match) return match.offset;
    }
    return null;
  }

  public getFormationByShipId(shipId: string): Formation | null {
    for (const formation of this.formations.values()) {
      if (
        formation.leaderId === shipId ||
        formation.members.some(m => m.shipId === shipId)
      ) {
        return formation;
      }
    }
    return null;
  }
}
