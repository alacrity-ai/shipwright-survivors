# 📘 COACHMARKS.md

**Shipwright Survivors — Coach Marks System**

Coach marks are transient, context-sensitive visual guides used for tutorialization and onboarding. They can point to buttons, highlight interface elements, annotate the screen, or embed instructional imagery.

This document provides simple, ergonomic usage examples.

---

## 🧰 API Entry Point

All coach marks are spawned via:

`const coachMarkManager = new CoachMarkManager();`

---

## 🟥 Box Mark

### 🖼️ Screen Space Example: Highlighting a minimap corner


```
coachMarkManager.createScreenCoachMark(
  '', // no label needed
  1280, 100, // top-right corner of HUD
  {
    type: 'box',
    boxWidth: 100,
    boxHeight: 100,
    boxStrokeColor: '#00FFFF',
    boxLineWidth: 3,
    duration: 3.0,
  }
);

```

### 🌍 World Space Example: Highlighting a block in the world

```
const block = ship.getBlockAt(4, 2); // BlockInstance
const { x, y } = block.position;

coachMarkManager.createWorldCoachMark(
  '',
  x,
  y,
  camera,
  {
    type: 'box',
    boxWidth: 32,
    boxHeight: 32,
    boxStrokeColor: '#FFD700',
    duration: 2.0,
  }
);

```


---

## 🖼️ Image Mark

### 🖼️ Screen Space Example: Render an icon for tutorial emphasis

```
coachMarkManager.createScreenCoachMark(
  '',
  300,
  700,
  {
    type: 'image',
    imageSrc: 'assets/ui/tutorials/repair_hint.png',
    imageWidth: 64,
    imageHeight: 64,
    duration: 4.0,
  }
);

```

### 🌍 World Space Example: Render floating image over a ship part

```
coachMarkManager.createWorldCoachMark(
  '',
  ship.cockpit.position.x,
  ship.cockpit.position.y,
  camera,
  {
    type: 'image',
    imageSrc: 'assets/ui/tutorials/wrench_icon.png',
    imageWidth: 48,
    imageHeight: 48,
    duration: 3.0,
  }
);

```

---

## ➤ Arrow Mark

### 🖼️ Screen Space Example: Pointing to a UI button

```
coachMarkManager.createScreenCoachMark(
  '',
  200, 1000,
  {
    type: 'arrow',
    arrowDirection: 'up',
    arrowLength: 40,
    arrowColor: '#FF00FF',
    duration: 3.0,
  }
);

```

### 🌍 World Space Example: Pointing to a repair station

```
coachMarkManager.createWorldCoachMark(
  '',
  repairStation.x,
  repairStation.y,
  camera,
  {
    type: 'arrow',
    arrowDirection: 'down',
    arrowLength: 30,
    arrowColor: '#00FF00',
    duration: 3.0,
  }
);

```

---

## 📝 Text Mark

### 🖼️ Screen Space Example: Labeling an energy meter

```
coachMarkManager.createScreenCoachMark(
  'Energy Meter',
  150, 80,
  {
    type: 'text',
    fontSize: 16,
    fontFamily: 'monospace',
    textColor: '#FFFFFF',
    labelOffset: { x: 0, y: -40 },
    duration: 4.0,
  }
);

```

### 🌍 World Space Example: Labeling a boss core

```
coachMarkManager.createWorldCoachMark(
  'TARGET CORE',
  bossCore.x,
  bossCore.y,
  camera,
  {
    type: 'text',
    fontSize: 20,
    textColor: '#FF3333',
    labelOffset: { x: 0, y: -50 },
    duration: 5.0,
  }
);

```

---

## 🧪 Tips & Best Practices

- Use **screen space** for fixed UI and HUD elements.
    
- Use **world space** for entities in the game world (e.g., ships, pickups).
    
- Use `labelOffset` to move text away from overlapping its target.
    
- Avoid durations < 1.0 seconds for accessibility.
    
- Compose marks: combine `box + text + arrow` for layered effects.
    

---

## ✅ Example Composite

```
// Highlight radar with box, arrow, and label
const x = 1280;
const y = 100;

coachMarkManager.createScreenCoachMark('', x, y, {
  type: 'box',
  boxWidth: 100,
  boxHeight: 100,
  boxStrokeColor: '#00FFFF',
  duration: 3,
});

coachMarkManager.createScreenCoachMark('', x, y + 80, {
  type: 'arrow',
  arrowDirection: 'up',
  arrowLength: 30,
  arrowColor: '#00FFFF',
  duration: 3,
});

coachMarkManager.createScreenCoachMark('This is your radar', x, y + 120, {
  type: 'text',
  textColor: '#00FFFF',
  fontSize: 16,
  labelOffset: { x: 0, y: 0 },
  duration: 3,
});

```

## Additional Coachmark types:

```
coachMarkManager.createScreenCoachMark(
  '',  // label not used
  600, 500,
  {
    type: 'key',
    keyLabel: 'W',
    width: 40,
    height: 40,
    fontSize: 20,
    borderColor: '#00FFFF',
    fillColor: '#001122',
    textColor: '#00FFFF',
    duration: 3.5,
  }
);
```

```
coachMarkManager.createScreenCoachMark(
  '',
  600,
  600,
  {
    type: 'mouse',
    interactionMode: 'wiggle', // or 'leftClick' | 'rightClick' | 'scroll'
    width: 60,
    height: 90,
    borderColor: '#FFFFFF',
    fillColor: '#000000',
    highlightColor: '#00FFFF',
    duration: 5.0,
  }
);
```

---

_This system is stateless—repeated invocations must be explicitly orchestrated by your scene, tutorial controller, or trigger script._