// GalaxyMapController.ts

import { InputManager } from '@/core/InputManager';
import { CanvasManager } from '@/core/CanvasManager';
import { GalaxyMapRenderer } from '@/systems/galaxymap/GalaxyMapRenderer';
import { GalaxyMapCamera } from '@/systems/galaxymap/camera/GalaxyMapCamera';
import { GalaxyMapRegistry } from '@/systems/galaxymap/registry/GalaxyMapRegistry';
import { raySphereIntersect } from '@/systems/galaxymap/helpers/raySphereIntersect';
import { screenToWorldRay } from '@/systems/galaxymap/helpers/screenToWorldRay';
import { vec3Distance } from '@/systems/galaxymap/webgl/vectorUtils';
import { missionUnlocked } from '@/systems/galaxymap/helpers/missionUnlocked';
import { audioManager } from '@/audio/Audio';

import type { LocationDefinition } from '@/systems/galaxymap/types/LocationDefinition';

interface LocationHoverState {
  location: LocationDefinition;
  currentScale: number;
  targetScale: number;
}

export class GalaxyMapController {
  private readonly gl: WebGLRenderingContext;
  private readonly camera: GalaxyMapCamera;
  private readonly renderer: GalaxyMapRenderer;

  private readonly locations: LocationDefinition[] = GalaxyMapRegistry.getInstance().getAllLocations();
  private selectedLocation: LocationDefinition | null = null;
  private hoveredLocation: LocationDefinition | null = null;
  
  // Track hover states for smooth scaling
  private locationHoverStates: Map<string, LocationHoverState> = new Map();
  
  // Hover scaling configuration
  private readonly HOVER_SCALE_MULTIPLIER = 1.2;
  private readonly SCALE_LERP_SPEED = 0.15;

  constructor(
    private readonly canvasManager: CanvasManager,
    private readonly inputManager: InputManager
  ) {
    this.gl = this.canvasManager.getWebGLContext('polygon');
    this.camera = new GalaxyMapCamera();
    this.renderer = new GalaxyMapRenderer(this.gl, this.camera);
    
    // Initialize hover states for all locations
    this.initializeHoverStates();
  }

  private initializeHoverStates(): void {
    for (const location of this.locations) {
      this.locationHoverStates.set(location.id || location.name, {
        location,
        currentScale: location.scale,
        targetScale: location.scale
      });
    }
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * factor;
  }

  private updateHoverStates(): void {
    // Update all location scales with smooth interpolation
    for (const hoverState of this.locationHoverStates.values()) {
      if (Math.abs(hoverState.currentScale - hoverState.targetScale) > 0.001) {
        hoverState.currentScale = this.lerp(
          hoverState.currentScale,
          hoverState.targetScale,
          this.SCALE_LERP_SPEED
        );
      } else {
        hoverState.currentScale = hoverState.targetScale;
      }
    }
  }

  public initialize(): void {
    this.renderer.initialize();
  }

  public update(): void {
    const { x, y } = this.inputManager.getMousePosition();
    const { origin, direction } = screenToWorldRay(x, y, this.gl.canvas as HTMLCanvasElement, this.camera);

    let closestForHover: LocationDefinition | null = null;
    let closestHoverDistance = Infinity;
    
    // Check for hover (using current animated scale for intersection)
    for (const location of this.locations) {
      const hoverState = this.locationHoverStates.get(location.id || location.name);
      const currentScale = hoverState?.currentScale || location.scale;
      
      const hit = raySphereIntersect(origin, direction, location.position, currentScale);
      if (hit && missionUnlocked(location.missionId)) {
        const dist = vec3Distance(origin, location.position);
        if (dist < closestHoverDistance) {
          closestHoverDistance = dist;
          closestForHover = location;
        }
      }
    }

    // Update hover state
    if (closestForHover !== this.hoveredLocation) {
      // Reset previous hovered location
      if (this.hoveredLocation && this.hoveredLocation !== this.selectedLocation) {
        const prevHoverState = this.locationHoverStates.get(this.hoveredLocation.id || this.hoveredLocation.name);
        if (prevHoverState) {
          prevHoverState.targetScale = this.hoveredLocation.scale;
        }
      }

      // Set new hovered location
      this.hoveredLocation = closestForHover;
      // Play sound effect
      if (this.hoveredLocation && !this.selectedLocation) {
        audioManager.play('assets/sounds/sfx/ui/sub_00.wav', 'sfx', { maxSimultaneous: 2 });
      }

      // Apply hover scale *only if it's not the selected one*
      if (
        this.hoveredLocation &&
        this.hoveredLocation !== this.selectedLocation
      ) {
        const hoverState = this.locationHoverStates.get(this.hoveredLocation.id || this.hoveredLocation.name);
        if (hoverState) {
          hoverState.targetScale = this.hoveredLocation.scale * this.HOVER_SCALE_MULTIPLIER;
        }
      }
    }

    // === Lock selected location scale (disable hover animation on it) ===
    if (this.selectedLocation) {
      const selectedHoverState = this.locationHoverStates.get(this.selectedLocation.id || this.selectedLocation.name);
      if (selectedHoverState) {
        selectedHoverState.targetScale = this.selectedLocation.scale;
        selectedHoverState.currentScale = this.selectedLocation.scale;
      }
    }

    // Handle clicks
    if (this.inputManager.wasLeftClicked()) {
      let closestForClick: LocationDefinition | null = null;
      let closestClickDistance = Infinity;

      for (const location of this.locations) {
        const hoverState = this.locationHoverStates.get(location.id || location.name);
        const currentScale = hoverState?.currentScale || location.scale;
        
        const hit = raySphereIntersect(origin, direction, location.position, currentScale);
        if (hit) {
          const dist = vec3Distance(origin, location.position);
          if (dist < closestClickDistance) {
            closestClickDistance = dist;
            closestForClick = location;
          }
        }
      }

      if (closestForClick) {
        if (missionUnlocked(closestForClick.missionId)) {
          // Select the clicked location
          if (!this.selectedLocation) {
            this.selectedLocation = closestForClick;
            this.camera.focusOnLocation(closestForClick);
            audioManager.play('assets/sounds/sfx/ui/planetselect_01.wav', 'sfx', { maxSimultaneous: 2 });
          }
        }
      } else {
        // Location is de-selected
        if (this.selectedLocation) {
          audioManager.play('assets/sounds/sfx/ui/planetselect_00.wav', 'sfx', { maxSimultaneous: 2 });
        }
        this.selectedLocation = null;
        this.camera.resetView();
      }
    }

    // Update hover animations
    this.updateHoverStates();
    this.camera.update();
  }

  public render(): void {
    const locationsWithHoverScales = this.locations.map(location => {
      const hoverState = this.locationHoverStates.get(location.id || location.name);
      const isSelected = this.selectedLocation && location.id === this.selectedLocation.id;

      if (hoverState && !isSelected && hoverState.currentScale !== location.scale) {
        return {
          ...location,
          scale: hoverState.currentScale
        };
      }

      return location; // For selected or non-hovered planets
    });

    this.renderer.render(locationsWithHoverScales, this.selectedLocation);
  }

  public destroy(): void {
    this.renderer.destroy();
    this.camera.destroy();
    this.locationHoverStates.clear();
    GalaxyMapRegistry.destroy();
  }

  public getSelectedLocation(): LocationDefinition | null {
    return this.selectedLocation;
  }

  public getHoveredLocation(): LocationDefinition | null {
    return this.hoveredLocation;
  }
}