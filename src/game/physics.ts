// src/game/physics.ts
// Moto parabolico del proiettile. Funzioni pure.
// Convenzione: y cresce verso il basso, quindi la gravità è positiva e
// per sparare verso l'alto la componente verticale della velocità è negativa.

import type { Ball } from "./types";

export const GRAVITY = 900; // px/s^2 (verso il basso)
export const MIN_SPEED = 250; // px/s (potenza 0%)
export const MAX_SPEED = 1100; // px/s (potenza 100%)

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Converte potenza (0..1) e angolo (radianti) nella velocità iniziale. */
export function launchVelocity(
  power: number,
  angle: number,
): { vx: number; vy: number } {
  const speed = MIN_SPEED + clamp01(power) * (MAX_SPEED - MIN_SPEED);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

/** Avanza la palla di un passo dt (secondi). Restituisce una nuova palla. */
export function stepBall(ball: Ball, dt: number): Ball {
  const vy = ball.vy + GRAVITY * dt;
  return {
    ...ball,
    vy,
    x: ball.x + ball.vx * dt,
    y: ball.y + vy * dt,
  };
}
