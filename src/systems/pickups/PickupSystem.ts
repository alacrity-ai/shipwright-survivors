// src/systems/pickups/PickupSystem.ts

import { getPickupSprite } from '@/rendering/cache/PickupSpriteCache'; // Import the currency sprite cache
import { PlayerResources } from '@/game/player/PlayerResources'; // Import the PlayerResources singleton

import type { CanvasManager } from '@/core/CanvasManager';
import type { Camera } from '@/core/Camera';
import type { PickupInstance } from '@/game/interfaces/entities/PickupInstance';
import type { Ship } from '@/game/ship/Ship';

const PICKUP_RADIUS = 16;  // Radius for pickup interaction (e.g., how close the player needs to be to collect)
const SPARK_COUNT = 10;     // Number of sparks to emit per pickup
const ATTRACTION_SPEED = 100; // Speed at which the pickups are attracted to the ship


export class PickupSystem {
  private ctx: CanvasRenderingContext2D;
  private pickups: PickupInstance[] = [];
  private playerResources: PlayerResources;
  private playerShip: Ship;

  constructor(
    canvasManager: CanvasManager,
    private readonly camera: Camera,
    playerShip: Ship // Pass the player ship to the pickup system
  ) {
    this.ctx = canvasManager.getContext('entities');
    this.playerResources = PlayerResources.getInstance();  // Get the singleton instance of PlayerResources
    this.playerShip = playerShip; // Store the player ship
  }

  // This method will spawn a new currency pickup at a specified position
  spawnCurrencyPickup(position: { x: number, y: number }, amount: number): void {
    const newPickup: PickupInstance = {
      type: { 
        id: 'currency', // Using the 'currency' key to reference the sprite in the cache
        name: 'Gold Coin',
        currencyAmount: amount,
        category: 'currency',
        sprite: 'currency'
      },
      position,
      isPickedUp: false,
      currencyAmount: amount,
      rotation: 0, // Initialize rotation
      sparks: [],   // Initialize sparks array
    };
    console.log('Spawned pickup at', position, 'with amount', amount);
    this.pickups.push(newPickup);  // Add the pickup to the list
  }

  // This method will render all active pickups
  render(): void {
    this.pickups.forEach((pickup) => {
      // Get the sprite for the currency pickup
      const sprite = getPickupSprite(pickup.type.id);

      if (sprite) {
        const screenPosition = this.camera.worldToScreen(pickup.position.x, pickup.position.y);

        // Update rotation to create the spinning effect
        pickup.rotation += 0.7; // Increment rotation by small amount for continuous spin

        // Apply camera zoom for scaling the sprite relative to the camera's zoom level and currency amount
        const scale = this.camera.zoom * (0.5 + Math.sqrt(pickup.currencyAmount) / 15);



        // Render the pickup (spinning effect)
        this.ctx.save();
        this.ctx.translate(screenPosition.x, screenPosition.y);
        this.ctx.rotate(pickup.rotation); // Apply rotation for spinning effect
        this.ctx.scale(scale, scale); // Scale according to the camera's zoom

        // Adjust positioning to center the sprite and render it
        this.ctx.drawImage(
          sprite.base,
          -PICKUP_RADIUS, // Adjust positioning to center the sprite
          -PICKUP_RADIUS,
          PICKUP_RADIUS * 2,
          PICKUP_RADIUS * 2
        );
        this.ctx.restore();

        // Render sparks
        this.renderSparks(pickup, screenPosition);
      } else {
        console.error("No sprite found for pickup type:", pickup.type.id);  // Debugging log for missing sprites
      }
    });
  }

  // This method renders the sparks for the spinning pickup
  private renderSparks(pickup: PickupInstance, screenPosition: { x: number, y: number }): void {
    // Emit sparks periodically for each pickup
    if (pickup.sparks.length < SPARK_COUNT) {
      this.emitSparks(pickup, screenPosition);
    }

    // Apply camera zoom for scaling the sparks relative to the camera's zoom level
    const scale = this.camera.zoom;

    // Draw all sparks
    pickup.sparks.forEach(spark => {
      // Update spark position based on velocity
      spark.x += spark.vx;
      spark.y += spark.vy;

      // Reduce spark life over time
      spark.life -= 0.02; // Decrease life to fade sparks

      // Only render sparks that are still alive
      if (spark.life > 0) {
        this.ctx.save();
        this.ctx.translate(spark.x, spark.y);
        this.ctx.scale(scale, scale); // Scale sparks based on the camera zoom

        this.ctx.beginPath();
        this.ctx.arc(0, 0, spark.size, 0, Math.PI * 2);
        this.ctx.fillStyle = spark.color;
        this.ctx.fill();
        this.ctx.restore();
      }
    });

    // Remove sparks that have expired
    pickup.sparks = pickup.sparks.filter(spark => spark.life > 0);
  }

  // This method creates new sparks emitted from the pickup
  private emitSparks(pickup: PickupInstance, screenPosition: { x: number, y: number }): void {
    const colors = ['#00f', '#009', '#00a9f4', '#1e90ff'];
    for (let i = 0; i < SPARK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2; // Random angle for sparks
      const speed = Math.random() * 0.5; // Speed of spark emission
      const size = Math.random() * 4; // Size of sparks
      const life = Math.random() * 1 + 0.5; // Life duration of sparks
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const color = colors[Math.floor(Math.random() * colors.length)];

      // Emit sparks from the pickup's world position (not screen position)
      pickup.sparks.push({
        x: screenPosition.x, // Initial spark position (world space)
        y: screenPosition.y,
        vx,
        vy,
        size,
        life,
        color
      });
    }
  }


  // This method checks if the player is in range to pick up any pickups
  update(): void {
    this.pickups.forEach((pickup) => {
      if (pickup.isPickedUp) return; // If the pickup is already collected, skip

      // Calculate distance to the player's ship
      const shipPosition = this.playerShip.getTransform().position;
      const distance = Math.sqrt(
        Math.pow(shipPosition.x - pickup.position.x, 2) + Math.pow(shipPosition.y - pickup.position.y, 2)
      );

      // Define attraction range - pickups only get attracted within this distance
      const ATTRACTION_RANGE = 600; // Adjust this value as needed
      
      if (distance > ATTRACTION_RANGE) return; // Skip if too far away

      // Calculate speed of pickup attraction with exponential ramp-up as distance decreases
      // Using exponential decay function: speed increases exponentially as distance decreases
      const normalizedDistance = distance / ATTRACTION_RANGE; // 0 to 1 (1 = far, 0 = close)
      const attractionMultiplier = Math.pow(1 - normalizedDistance, 6); // Quadratic ramp-up
      const attractionSpeed = ATTRACTION_SPEED * attractionMultiplier;

      // Calculate direction from pickup to ship
      const dx = shipPosition.x - pickup.position.x;
      const dy = shipPosition.y - pickup.position.y;
      const angle = Math.atan2(dy, dx);

      // Update the pickup position to move towards the ship
      pickup.position.x += Math.cos(angle) * attractionSpeed;
      pickup.position.y += Math.sin(angle) * attractionSpeed;

      // Check if the pickup is close enough to the ship to be collected
      if (distance < PICKUP_RADIUS) {
        this.collectPickup(pickup);
      }
    });
  }

  // This method handles the collection of a pickup
  private collectPickup(pickup: PickupInstance): void {
    pickup.isPickedUp = true;

    // Increase the player's currency using the PlayerResources singleton
    this.playerResources.addCurrency(pickup.currencyAmount);

    // Optionally remove the pickup from the system
    const index = this.pickups.indexOf(pickup);
    if (index > -1) {
      this.pickups.splice(index, 1);
    }
  }
}
