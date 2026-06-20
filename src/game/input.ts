// src/game/input.ts
// Calcoli puri per il comando "a fionda".
// Si spara nel verso OPPOSTO al trascinamento; la lunghezza del trascinamento
// (limitata a MAX_DRAG) determina la potenza.

import type { AimState, Cannon } from "./types";

export const MAX_DRAG = 220; // px: oltre questa lunghezza la potenza è al 100%
export const MIN_DRAG = 12; // px: sotto questa soglia il tiro è annullato
export const GRAB_RADIUS = 60; // px: quanto vicino al cannone bisogna premere

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Vero se si può iniziare a mirare premendo in (px,py) vicino al cannone. */
export function canStartAim(cannon: Cannon, px: number, py: number): boolean {
  return Math.hypot(px - cannon.x, py - cannon.y) <= GRAB_RADIUS;
}

/** Calcola lo stato di mira dal perno del cannone e dal punto del puntatore. */
export function computeAim(cannon: Cannon, px: number, py: number): AimState {
  const dragX = px - cannon.x;
  const dragY = py - cannon.y;
  const dist = Math.hypot(dragX, dragY);
  const power = clamp01((dist - MIN_DRAG) / (MAX_DRAG - MIN_DRAG));
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
