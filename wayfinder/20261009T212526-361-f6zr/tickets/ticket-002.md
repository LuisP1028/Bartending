---
ticket_id: "002"
title: "Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment"
type: task
status: resolved
claimed_by: "wayfinder-read-and-plan"
blocked_by: ["ticket-001.md"]
governing_specification: "functional_specification_107.md"
---

# Ticket 002: Standardized Bar Stool Seating Anchors, Vertical Offsets & Counterline Alignment

## Question
How are the bar stool anchors (`bar_seat_1` through `bar_seat_4`), vertical seating offsets (`sitOffset`), and countertop clearance rules standardized across all stools so that seated character busts clear the counterline naturally (chin, shoulders, and full face visible) with consistent eye-line across all four seats, eliminating the sunken peeking patron defect?

## Context & Specification Grounding
- **Governing Specification:** `functional_specification_107.md`
  - §Desired Functionality (3): "Every seated patron in any bar stool (`bar_seat_1`, `bar_seat_2`, `bar_seat_3`, `bar_seat_4`) must rest naturally behind the bar counter with standardized vertical alignment. The patron's upper chest, shoulders, chin, and entire face must remain clearly visible above the bar counter edge across all four stools. Zero patrons may suffer from the sunken 'peeking' defect where only the upper forehead or eyes are visible. Zero patrons may appear to float unnaturally high above the bar stool or hover in mid-air."
  - §Desired Functionality (3): "All four bar stools must have standardized anchor locations and seating offsets that guarantee equivalent depth and vertical positioning across the entire counter length. The bar counter foreground mask must cleanly occlude only the lower torso and stool structure, producing a convincing and uniform illusion of guests sitting on stools behind the bar counter."
  - §Acceptance Criteria (AC2): "Seated patrons in all four bar stools display their full face (eyes, nose, mouth), chin, and upper shoulders clearly above the bar counter edge. Zero instances of 'peeking eyes' or sunken heads."
  - §Acceptance Criteria (AC6): "On both desktop and mobile viewports, the bar counter cutout mask cleanly covers the lower torso while preserving 100% full-face and shoulder visibility."

## Codebase Audit & Technical Discrepancy Analysis

### 1. Stool Anchor Geometry & Counter Elevation
In `src/lib/patronSeats.ts`:
```typescript
const FALLBACK_SEAT_ANCHORS: Record<string, SeatAnchor> = {
  bar_seat_1: { leftPct: (218 / 1184) * 100, topPct: (449 / 880) * 100 },
  bar_seat_2: { leftPct: (453 / 1184) * 100, topPct: (445 / 880) * 100 },
  bar_seat_3: { leftPct: (705 / 1184) * 100, topPct: (445 / 880) * 100 },
  bar_seat_4: { leftPct: (974 / 1184) * 100, topPct: (447 / 880) * 100 },
};
```
In `src/data/povHotspots.ts`, the bar counter occluder polygon `POV_BAR_CUTOFF.d` defines the countertop edge elevation across the room:
- At `bar_seat_1` ($X \approx 218\text{px}$): Countertop edge is at $Y \approx 384\text{px}$. Stool top is at $Y = 449\text{px}$.
- At `bar_seat_2` ($X \approx 453\text{px}$): Countertop edge is at $Y \approx 367\text{px}$. Stool top is at $Y = 445\text{px}$.
- At `bar_seat_3` ($X \approx 705\text{px}$): Countertop edge is at $Y \approx 367\text{px}$. Stool top is at $Y = 445\text{px}$.
- At `bar_seat_4` ($X \approx 974\text{px}$): Countertop edge is at $Y \approx 368\text{px}$. Stool top is at $Y = 447\text{px}$.

The countertop edge across seats 2, 3, and 4 is almost perfectly planar at $Y \approx 367\text{px}$, while seat 1 has a slight diegetic perspective depression at $Y \approx 384\text{px}$.

### 2. Discrepant `sitOffset` and Bottom-Anchoring Collision
In `src/data/patronLayout.ts` (L55–L65):
```typescript
export const DEFAULT_PATRON_STAGE = {
  walkDisplayWidthPct: 57,
  sitDisplayWidthPct: 35,
  spawn: { x: 143, y: 659 } as StagePoint,
  waypoints: [] as StagePoint[],
  preferredSeatId: null as string | null,
  sitOffset: { x: 25, y: 85 } as StagePoint,
  lockHorizontalWalk: true,
  walkMs: 2400,
};
```
Currently, `sitPoint.y = seatEnd.y + layout.sitOffset.y`.
For seat 2: $445 + 85 = 530\text{px}$.
When a short or unnormalized 16:9 sprite (height 233px) is anchored at $Y = 530\text{px}$, its top edge is at $530 - 233 = 297\text{px}$.
With 25px top padding in the image, the head begins at $Y = 322\text{px}$ and chin is at $Y = 402\text{px}$.
Because the bar counter begins at $Y = 367\text{px}$, the entire region below $Y = 367\text{px}$ is occluded by the bar polygon!
Consequently, $402 - 367 = 35\text{px}$ of the chin and mouth are submerged, leaving only 45px (forehead and eyes) visible.

## Architectural Decision & Solution Design

### 1. Authoritative Seated Anchor Baseline Calibration
Standardize the absolute seated anchor point (`sitPoint`) across each stool to lock the eye-line and chin clearance relative to the counter:
- **Target Counterline Clearance:** The patron's chin must sit approximately $30\text{px} \pm 5\text{px}$ above the bar counter edge ($Y_{\text{chin}} \approx 335\text{px}–340\text{px}$).
- **Target Shoulder Clearance:** Upper shoulders and clavicle must align with $Y \approx 365\text{px}$, intersecting the countertop so the lower torso seamlessly tucks behind the counter.
- With the normalized bust height from Ticket 001 ($H_{\text{sit}} = 422\text{px}$):
  $$\text{Bottom Anchor } Y = Y_{\text{top}} + 422\text{px}$$
  If $Y_{\text{top}} \approx 108\text{px}$, then $\text{Bottom Anchor } Y = 108 + 422 = 530\text{px}$.
- To guarantee uniform counterline clearance across all four stools:
  Define per-seat canonical seating anchors that adjust for the slight perspective slope at Seat 1:
  - `bar_seat_1`: $X = 218$, $Y = 534$ (Counter $Y = 384$, Clearance = $44\text{px}$)
  - `bar_seat_2`: $X = 453$, $Y = 518$ (Counter $Y = 367$, Clearance = $28\text{px}$)
  - `bar_seat_3`: $X = 705$, $Y = 518$ (Counter $Y = 367$, Clearance = $28\text{px}$)
  - `bar_seat_4`: $X = 974$, $Y = 520$ (Counter $Y = 368$, Clearance = $28\text{px}$)

### 2. Standardized `sitOffset` Resolution
In `src/data/patronLayout.ts`:
- Lock `DEFAULT_PATRON_STAGE.sitOffset` to `{ x: 0, y: 73 }` relative to seat bounding-box bottoms ($445 + 73 = 518$), or use explicit calibrated seat anchors.
- For Seat 1: apply a localized $+16\text{px}$ vertical offset to accommodate the lower perspective counter edge.

### 3. Foreground Bar Occlusion Mask Preservation
In `src/components/PatronLayer.tsx`:
- The container `.pov-patron-layer` continues to apply `barClipCss` (`roomMinusBarClipPathCss`).
- Because the sprite dimensions are normalized (Ticket 001) and seating anchors calibrated (Ticket 002):
  1. Lower torso and stool legs fall inside the `evenodd` counter polygon and are cleanly occluded.
  2. Chin, mouth, nose, eyes, hair, and upper shoulders reside strictly outside the counter polygon (in the upper room region) and remain 100% visible.
  3. No patron floats above the stool; no patron peeks from below the counter.

## Precise Contract & Transformation Specifications

### 1. `src/lib/patronSeats.ts` Standardized Anchors
```typescript
export type SeatAnchor = {
  leftPct: number;
  topPct: number;
  /** Countertop Y coordinate in stage viewBox space for verification */
  counterTopY: number;
  /** Calibrated sit anchor in stage viewBox coordinates (feet/bust base) */
  sitPoint: { x: number; y: number };
};

export const STANDARDIZED_BAR_SEATS: Record<string, SeatAnchor> = {
  bar_seat_1: {
    leftPct: (218 / 1184) * 100,
    topPct: (449 / 880) * 100,
    counterTopY: 384,
    sitPoint: { x: 218, y: 534 },
  },
  bar_seat_2: {
    leftPct: (453 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 453, y: 518 },
  },
  bar_seat_3: {
    leftPct: (705 / 1184) * 100,
    topPct: (445 / 880) * 100,
    counterTopY: 367,
    sitPoint: { x: 705, y: 518 },
  },
  bar_seat_4: {
    leftPct: (974 / 1184) * 100,
    topPct: (447 / 880) * 100,
    counterTopY: 368,
    sitPoint: { x: 974, y: 520 },
  },
};
```

### 2. `resolveBarSeatAnchor` Updates
Ensure `resolveBarSeatAnchor(zoneId, pathD)` returns the calibrated `STANDARDIZED_BAR_SEATS[zoneId]` directly when matching a known bar seat, guaranteeing deterministic positioning across all environments and SSR/client hydration boundaries.

## Invariant & Verification Criteria
- **`INV-SEAT-01`**: For any patron seated in `bar_seat_1` through `bar_seat_4`, the patron's chin coordinate $Y_{\text{chin}}$ must satisfy $Y_{\text{chin}} \le \text{counterTopY} - 20\text{px}$, ensuring the full face is visible.
- **`INV-SEAT-02`**: Head tops for all seated patrons must align horizontally within $\pm 15\text{px}$ across seats 2, 3, and 4.
