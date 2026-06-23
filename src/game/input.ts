// src/game/input.ts
// Calcoli puri per il comando "a fionda".
// Si spara nel verso OPPOSTO al trascinamento; la lunghezza del trascinamento
// (limitata a MAX_DRAG) determina la potenza.

import type { AimState, Cannon } from "./types";

export const MIN_DRAG = 12; // px: sotto questa soglia il tiro è annullato
export const GRAB_RADIUS = 60; // px: quanto vicino al cannone bisogna premere

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * Lunghezza di trascinamento (in pixel del campo) che dà la potenza massima.
 * È proporzionale al lato minore del campo, così il 100% è sempre raggiungibile
 * a prescindere dalla dimensione del campo.
 */
export function maxDragFor(width: number, height: number): number {
  return Math.max(MIN_DRAG + 1, Math.round(Math.min(width, height) * 0.22));
}

/** Vero se si può iniziare a mirare premendo in (px,py) vicino al cannone. */
export function canStartAim(cannon: Cannon, px: number, py: number): boolean {
  return Math.hypot(px - cannon.x, py - cannon.y) <= GRAB_RADIUS;
}

/** Calcola lo stato di mira dal perno del cannone e dal punto del puntatore. */
export function computeAim(
  cannon: Cannon,
  px: number,
  py: number,
  maxDrag: number,
): AimState {
  const dragX = px - cannon.x;
  const dragY = py - cannon.y;
  const dist = Math.hypot(dragX, dragY);
  const power = clamp01((dist - MIN_DRAG) / (maxDrag - MIN_DRAG));
  // direzione opposta al trascinamento
  const angle = Math.atan2(-dragY, -dragX);
  return {
    active: true,
    originX: cannon.x,
    originY: cannon.y,
    pointerX: px,
    pointerY: py,
    power,
    angle,
  };
}

/** Vero se il trascinamento è abbastanza lungo da far partire un tiro. */
export function isShotValid(aim: AimState): boolean {
  const dist = Math.hypot(aim.pointerX - aim.originX, aim.pointerY - aim.originY);
  return dist >= MIN_DRAG;
}
