// src/rendering/coachmarks/CoachMarkManager.ts

import {
  CoachMarkEntity,
  CoachMarkPositionResolver
} from '@/rendering/coachmarks/CoachMarkEntity';

import { ArrowCoachMark } from '@/rendering/coachmarks/entities/ArrowCoachMark';
import { BoxCoachMark } from '@/rendering/coachmarks/entities/BoxCoachMark';
import { ImageCoachMark } from '@/rendering/coachmarks/entities/ImageCoachMark';
import { TextCoachMark } from '@/rendering/coachmarks/entities/TextCoachMark';
import { KeyCoachMark } from '@/rendering/coachmarks/entities/KeyCoachMark';
import { MouseCoachMark } from '@/rendering/coachmarks/entities/MouseCoachMark';
import { GamepadFaceButtonsCoachMark } from '@/rendering/coachmarks/entities/GamepadFaceButtonsCoachMark';
import { GamePadFaceButtonCoachMark } from '@/rendering/coachmarks/entities/GamepadFaceButtonCoachMark';
import { GamepadSticksCoachMark } from '@/rendering/coachmarks/entities/GamepadSticksCoachMark';
import { GamepadShoulderButtonsCoachMark } from '@/rendering/coachmarks/entities/GamepadShoulderButtonsCoachMark';

import type {
  CoachMarkBehaviorOptions,
  ArrowCoachMarkBehavior,
  BoxCoachMarkBehavior,
  ImageCoachMarkBehavior,
  TextCoachMarkBehavior,
  KeyCoachMarkBehavior,
  MouseCoachMarkBehavior,
  GamepadFaceButtonsCoachMarkBehavior,
  GamepadSticksCoachMarkBehavior,
  GamepadShoulderButtonsCoachMarkBehavior,
  GamepadFaceButtonCoachMarkBehavior
} from '@/rendering/coachmarks/interfaces/CoachMarkBehaviorOptions';

import { CanvasManager } from '@/core/CanvasManager';
import { Camera } from '@/core/Camera';

export class CoachMarkManager {
  private static instance: CoachMarkManager;

  public static getInstance(): CoachMarkManager {
    if (!CoachMarkManager.instance) {
      CoachMarkManager.instance = new CoachMarkManager();
    }
    return CoachMarkManager.instance;
  }

  private coachMarks: CoachMarkEntity[] = [];
  private readonly canvasManager = CanvasManager.getInstance();
  private readonly ctx = this.canvasManager.getContext('overlay');

  private constructor() {
    // Private to prevent direct instantiation
  }

  public update(dt: number): void {
    for (const mark of this.coachMarks) mark.update(dt);
    this.coachMarks = this.coachMarks.filter(mark => !mark.isExpired());
  }

  public render(): void {
    for (const mark of this.coachMarks) mark.render(this.ctx);
  }

  public clear(): void {
    this.coachMarks.length = 0;
  }

  public createScreenCoachMark(
    label: string,
    screenX: number,
    screenY: number,
    behavior: CoachMarkBehaviorOptions
  ): void {
    const resolver: CoachMarkPositionResolver = () => ({ x: screenX, y: screenY });
    this.create(label, resolver, behavior);
  }

  public createWorldCoachMark(
    label: string,
    worldX: number,
    worldY: number,
    camera: Camera,
    behavior: CoachMarkBehaviorOptions
  ): void {
    const resolver: CoachMarkPositionResolver = () => camera.worldToScreen(worldX, worldY);
    this.create(label, resolver, behavior);
  }

  private create(
    label: string,
    resolver: CoachMarkPositionResolver,
    behavior: CoachMarkBehaviorOptions
  ): void {
    let entity: CoachMarkEntity;

    switch (behavior.type) {
      case 'arrow':
        entity = new ArrowCoachMark(resolver, behavior as ArrowCoachMarkBehavior);
        break;
      case 'box':
        entity = new BoxCoachMark(resolver, behavior as BoxCoachMarkBehavior);
        break;
      case 'image':
        entity = new ImageCoachMark(resolver, behavior as ImageCoachMarkBehavior);
        break;
      case 'text':
        entity = new TextCoachMark(label, resolver, behavior as TextCoachMarkBehavior);
        break;
      case 'key':
        entity = new KeyCoachMark(resolver, behavior as KeyCoachMarkBehavior);
        break;
      case 'mouse':
        entity = new MouseCoachMark(resolver, behavior as MouseCoachMarkBehavior);
        break;
      case 'gamepadFaceButtons':
        entity = new GamepadFaceButtonsCoachMark(resolver, behavior as GamepadFaceButtonsCoachMarkBehavior);
        break;
      case 'gamepadFaceButton':
        entity = new GamePadFaceButtonCoachMark(resolver, behavior as GamepadFaceButtonCoachMarkBehavior);
        break;
      case 'gamepadSticks':
        entity = new GamepadSticksCoachMark(resolver, behavior as GamepadSticksCoachMarkBehavior);
        break;
      case 'gamepadShoulders':
        entity = new GamepadShoulderButtonsCoachMark(resolver, behavior as GamepadShoulderButtonsCoachMarkBehavior);
        break;
      default: {
        const exhaustiveCheck: never = behavior;
        throw new Error(`Unhandled coach mark type: ${(behavior as any).type}`);
      }
    }

    this.coachMarks.push(entity);
  }
}
