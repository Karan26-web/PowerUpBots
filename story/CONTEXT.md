# CONTEXT — PowerUpBots Halves Game

## Last updated: 2026-05-11

---

## Project Overview

A single-page interactive energy-halves game (`index.html`). Two green robots appear in a de-energized state. The player uses a laser tool to cut an energy block into two equal halves, which then power both robots. Three rounds, each with a different block shape (rectangle, circle, square/triangle). The first round includes a guided tutorial.

**Main file:** `/Users/karan/PowerUpBots/story/index.html` (~2400 lines, fully self-contained HTML/CSS/JS)  
**Assets:** `/Users/karan/PowerUpBots/story/assets/` — 36 PNG/SVG files

---

## Directory Structure

```
story/
├── index.html          ← ONLY file to edit
├── CONTEXT.md          ← this file
└── assets/
    ├── Mainbg.png                     ← background
    ├── CircleBlock.png                ← circle energy block
    ├── RectangleBlock.png             ← rectangle energy block
    ├── LaserMachine.png               ← machine ring with guide lines (tutorial only)
    ├── LaserMachineWithoutLines.png   ← machine ring base (always visible)
    ├── Laser.png                      ← rotating laser sprite (258×172 source)
    ├── Beam.svg                       ← laser beam (fired on CUT only)
    ├── laserlight.png                 ← glow effect
    ├── SemiCircleHollowleft.png       ← circle round left pod
    ├── SemiCircleHollowright.png      ← circle round right pod
    ├── SquareHollow.png               ← rectangle round pods (both sides)
    ├── TriangularHollowLeft.png       ← triangle/square round left pod
    ├── TriangularHollowRight.png      ← triangle/square round right pod
    ├── TeachingScreen.png             ← frame for teaching panels
    ├── TutorialAfterScreen.png        ← "Let's Play" button image
    ├── SquareBotSadState.png          ← rectangle round sad bot
    ├── happyPinkBot.png               ← rectangle round happy bot
    ├── CircleBot.png                  ← circle round sad bot
    ├── HappyCircleBot.png             ← circle round happy bot
    ├── SquareBOt.png                  ← square/triangle round sad bot
    ├── HappyTriangleBot.png           ← square/triangle round happy bot
    └── (UI buttons, bubbles, etc.)
```

---

## Game Flow

### ROUNDS (3 total, defined in `ROUNDS` array ~line 970)

| # | Name | Block | Cut | Target Angle | Left Pod | Right Pod |
|---|------|-------|-----|-------------|----------|-----------|
| 0 | rectangle | RectangleBlock.png 220×110 | vertical | 90° or 270° | SquareHollow | SquareHollow |
| 1 | circle | CircleBlock.png 220×220 | horizontal | 0° or 180° | SemiCircleHollowleft | SemiCircleHollowright |
| 2 | square | CSS div 190×190 (purple #9B5FD9) | diagonal | 135° or 315° | TriangularHollowLeft | TriangularHollowRight |

### FLOW (per round, defined in `FLOW` array ~line 1045)

```
intro → ready → whole → needs → halves → tutorial* → play* → laser
```

\* `tutorial` scene: runs guided sequence only on round 0 (skips to next on rounds 1+).  
\* `play` scene ("Let's Play" button): shown only on round 0 (skips to next on rounds 1+).

### Scene Descriptions

- **intro / ready / whole / needs / halves**: Narration scenes with bot layout and shape display. Auto-advance via `duration` timer.
- **tutorial**: Guided laser demo with bubbles. Shows LaserMachine.png overlay (guide lines). Only round 0.
- **play**: Shows TutorialAfterScreen.png "Let's Play" button. User taps to proceed. Only round 0.
- **laser**: Interactive gameplay — user moves laser and taps CUT. No guide line overlay.

---

## Key Components

### Machine / Laser System (~lines 1819–2076)

- Ring diameter: `--ring-size` CSS var (500px default)
- Laser.png orbits the ring at `state.angle` degrees
- Right button: rotate -45°, Left button: rotate +45°
- CUT button: fires beam, checks if `state.angle` is within ±8° of `targetAngle` (or `targetAngle2`)
- Correct → `showSuccess()`, Wrong → `showFail()`

### Cut Geometry (~lines 1284–1447)

- `pieceGeometry(width, height, angle, index)`: Sutherland-Hodgman polygon clip — returns bounding box + CSS clip-path for each half
- `makeCutPiece(r, index, w, h, angle)`: Creates `div.half-wrap` with `clip-path` and inner block; `borderRadius` is explicitly set to `"0"` on inner to prevent white-line artifacts at cut boundary
- `cutOrientation(angle)`: 0°→"horizontal", 90°→"vertical", 45°→"backslash", 135°→"slash"
- `pieceIndexForSlot(r, slotIndex)`: For circle round, piece 0 (dome) goes to RIGHT slot, piece 1 (bowl) to LEFT (swapped). All other rounds: slot 0→piece 0, slot 1→piece 1.

### Teaching Screens (~lines 1537–1608)

- **teach-one**: Shows whole block + "1 Whole" label (`.teach-big-label`)
- **teach-two**: Shows whole block + "2 Equal Parts" or "Not Equal Parts" label (`.teach-equal-label`), plus the two cut halves side by side

**Text styling** (lines ~294, ~318):
```css
font-size: 64px; color: #fff; font-weight: 900;
-webkit-text-stroke: 4px #0E60BD; paint-order: stroke fill;
text-shadow: 0 0 24px #00A0F9, 0 4px 10px rgba(0,96,189,.4);
```
Both labels (big and equal) share the SAME styling. Only the block shape changes between rounds.

### Success Flow (`showSuccess`, ~line 2133)

1. `splitMachineBlock` — block splits into two pieces with animation
2. Teaching screen 1: "1 Whole" (1000ms delay)
3. Teaching screen 2: "2 Equal Parts" (3800ms delay)
4. `flyHalvesToSlots` — pieces animate from machine center to bot pod slots (7000ms)
5. Bots switch to happy state, pods glow, confetti burst
6. "Next" button appears (8500ms)

### Fail Flow (`showFail`, ~line 2239)

1. `splitMachineBlock` + `wrongSlash` overlay shown
2. Teaching screen 2: "Not Equal Parts" (1050ms)
3. `flyWrongToSlots` — wrong pieces animate to slots, bounce back with red flash
4. "Try Again" button appears
5. On retry: `tryAgain()` resets laser, block, unlocks interaction
6. After 1st fail: alignment lines shown (LaserMachine overlay via `tutorialOverlay`)

---

## Attempt Tracking & Hint System

- **1st attempt wrong**: No alignment lines shown
- **2nd attempt wrong**: Alignment lines (LaserMachine.png overlay) revealed
- **3rd attempt wrong**: Correct alignment line highlighted

*(Implemented via `state.attempts` counter — check current implementation)*

---

## Bot / Pod Layout

Three CSS layout classes on `#bots`:
- `layout-intro`: Bots far apart (center), no pods
- `layout-ready`: Bots at sides with pods visible (156px from top)
- `layout-laser`: Bots at edges with pods, smaller size (laser gameplay)
- `layout-clear`: Bots hidden (teaching screens, play screen)

Pod and fill sizes (from `setupTargetSlots`, ~line 1235):
| Round | podW | Fill W | Fill H | slotOffset |
|-------|------|--------|--------|------------|
| Rectangle | 132 | 116 | 116 | 6 |
| Circle | 160 | 148 | 74 | 8 |
| Square/Triangle | 142 | 130 | 130 | 6 |

---

## Known Design Decisions

- **Square block uses CSS, not PNG**: `r.blockSrc = ""` — rendered as `div.css-square { background: #9B5FD9 }`. Color changed from original pink (#d23d62) to purple (#9B5FD9).
- **Circle borderRadius on inner cut piece = "0"**: Explicitly cleared in `makeCutPiece` to prevent white-line artifact at the horizontal cut boundary when two semicircles are displayed adjacent.
- **Horizontal split gap fix**: In `splitMachineBlock`, h0 gets `marginBottom: "-1px"` for horizontal (circle) cuts to close the 1px rendering gap between stacked semicircles.
- **Let's Play screen**: Only shown on round 0 (tutorial). Rounds 1+ skip directly to laser gameplay.
- **Laser beam hidden during alignment**: Beam.svg only appears on CUT action, not during laser positioning.
- **Tutorial only on round 0**: The `{scene:"tutorial"}` step calls `nextStep()` immediately for `state.round > 0`.

---

## Audio

| Sound | Trigger |
|-------|---------|
| `sndTap()` | Button tap (play/cut) |
| `sndCut()` | Laser fires on CUT |
| `sndSuccess()` | Correct cut |
| `sndTurr()` | Wrong cut / rejection |

Sounds are synthesized via Web Audio API — no external audio files.

---

## Key JS Global State (`state` object, ~line 1056)

```javascript
{
  round: 0,           // current round index (0-2)
  step: 0,            // current FLOW step index
  angle: 0,           // current laser angle (degrees)
  lastCutAngle: 0,    // angle at which CUT was pressed
  locked: false,      // true while cut animation plays
  tutActive: false,   // true during tutorial sequence
  tutStep: 0,         // current tutorial step (0-3)
  orbitActive: true,  // laser orbit animation running
}
```

---

## How to Update This File

Edit whenever:
- New round shapes are added
- Pod/fill sizes change
- Game flow scenes change
- CSS variables or key pixel values shift
- Design decisions are made that future AI needs to know
