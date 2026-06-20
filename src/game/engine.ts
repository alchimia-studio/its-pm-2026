// src/game/engine.ts
// Tiene lo stato della partita e ne governa l'evoluzione: creazione del campo,
// mira, tiro, collisioni, danni, passaggio del turno e vittoria.
// Per semplicità e prestazioni lo stato viene modificato sul posto (in place).

import type { AimState, Ball, GameState, PlayerId } from "./types";
import { flattenPlatform, generateTerrain, heightAt } from "./terrain";
import { launchVelocity, stepBall } from "./physics";
import { canStartAim, computeAim, isShotValid } from "./input";

export const BALL_RADIUS = 6;
export const CANNON_HIT_RADIUS = 26; // sagoma-bersaglio generosa
export const DAMAGE = 20;
const PLATFORM_HALF = 28; // semi-larghezza della piattaforma sotto il cannone
const MUZZLE = 30; // distanza dalla quale esce la palla (oltre la base del cannone)

function emptyAim(): AimState {
  return {
    active: false,
    originX: 0,
    originY: 0,
    pointerX: 0,
    pointerY: 0,
    power: 0,
    angle: 0,
  };
}

function emptyBall(): Ball {
  return { x: 0, y: 0, vx: 0, vy: 0, active: false };
}

function other(p: PlayerId): PlayerId {
  return p === "red" ? "blue" : "red";
}

/** Crea una nuova partita: terreno casuale, cannoni posizionati, primo giocatore a caso. */
export function createGame(
  width: number,
  height: number,
  rng: () => number = Math.random,
): GameState {
  const terrain = generateTerrain({ width, height, rng });

  // Margini laterali sorteggiati (6%..16% della larghezza): fanno variare la distanza.
  const leftMargin = width * (0.06 + rng() * 0.1);
  const rightMargin = width * (0.06 + rng() * 0.1);
  const redX = leftMargin;
  const blueX = width - rightMargin;
  const redY = flattenPlatform(terrain, redX, PLATFORM_HALF);
  const blueY = flattenPlatform(terrain, blueX, PLATFORM_HALF);

  const first: PlayerId = rng() < 0.5 ? "red" : "blue";

  return {
    width,
    height,
    phase: "title",
    current: first,
    winner: null,
    terrain,
    cannons: {
      red: { player: "red", x: redX, y: redY, health: 100, angle: -Math.PI / 4 },
      blue: {
        player: "blue",
        x: blueX,
        y: blueY,
        health: 100,
        angle: (-Math.PI * 3) / 4,
      },
    },
    ball: emptyBall(),
    aim: emptyAim(),
  };
}

/** Dalla schermata titolo (o per rigiocare) entra nella fase di mira. */
export function startMatch(state: GameState): void {
  state.phase = "aiming";
}

/** Inizia a mirare se si preme abbastanza vicino al cannone di turno. */
export function beginAim(state: GameState, px: number, py: number): void {
  if (state.phase !== "aiming") return;
  const cannon = state.cannons[state.current];
  if (!canStartAim(cannon, px, py)) return;
  state.aim = computeAim(cannon, px, py);
}

/** Aggiorna la mira durante il trascinamento; la canna segue la direzione di tiro. */
export function updateAim(state: GameState, px: number, py: number): void {
  if (!state.aim.active) return;
  const cannon = state.cannons[state.current];
  state.aim = computeAim(cannon, px, py);
  cannon.angle = state.aim.angle;
}

/** Annulla la mira senza sparare (es. gesto interrotto). */
export function cancelAim(state: GameState): void {
  state.aim = emptyAim();
}

/** Rilascia la fionda: se il trascinamento è valido, lancia la palla. */
export function releaseAim(state: GameState): void {
  if (!state.aim.active) return;
  const aim = state.aim;
  state.aim = emptyAim();
  if (!isShotValid(aim)) return; // trascinamento troppo corto: niente tiro

  const cannon = state.cannons[state.current];
  const { vx, vy } = launchVelocity(aim.power, aim.angle);
  const dirX = Math.cos(aim.angle);
  const dirY = Math.sin(aim.angle);
  const spawnX = cannon.x + dirX * MUZZLE;
  // La palla esce dalla bocca della canna, ma mai sotto il terreno: così un
  // tiro orizzontale o in discesa non viene annullato già al primo istante.
  const maxSpawnY = heightAt(state.terrain, spawnX) - BALL_RADIUS - 1;
  const spawnY = Math.min(cannon.y + dirY * MUZZLE, maxSpawnY);
  state.ball = {
    x: spawnX,
    y: spawnY,
    vx,
    vy,
    active: true,
  };
  state.phase = "flying";
}

/** Avanza la simulazione di un passo dt (secondi). Va chiamata solo in volo. */
export function update(state: GameState, dt: number): void {
  if (state.phase !== "flying" || !state.ball.active) return;
  state.ball = stepBall(state.ball, dt);
  resolveBall(state);
}

function resolveBall(state: GameState): void {
  const b = state.ball;
  const enemyId = other(state.current);
  const enemy = state.cannons[enemyId];

  // Esce dai lati dello schermo → tiro a vuoto.
  if (b.x < 0 || b.x > state.width) {
    endShot(state, false, enemyId);
    return;
  }

  // Colpo diretto alla sagoma (generosa) del cannone nemico.
  if (Math.hypot(b.x - enemy.x, b.y - enemy.y) <= CANNON_HIT_RADIUS + BALL_RADIUS) {
    endShot(state, true, enemyId);
    return;
  }

  // Tocca il terreno → tiro a vuoto. (Il proprio cannone è ignorato: nessun autogol.)
  if (b.y + BALL_RADIUS >= heightAt(state.terrain, b.x)) {
    endShot(state, false, enemyId);
  }
}

function endShot(state: GameState, hit: boolean, enemyId: PlayerId): void {
  state.ball.active = false;

  if (hit) {
    const enemy = state.cannons[enemyId];
    enemy.health = Math.max(0, enemy.health - DAMAGE);
    if (enemy.health <= 0) {
      state.phase = "gameover";
      state.winner = state.current;
      return;
    }
  }

  // Passa il turno.
  state.current = other(state.current);
  state.phase = "aiming";
}
