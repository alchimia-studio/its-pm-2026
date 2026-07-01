// src/game/engine.ts
// Tiene lo stato della partita e ne governa l'evoluzione: creazione del campo,
// mira, tiro, collisioni, danni, passaggio del turno e vittoria.
// Per semplicità e prestazioni lo stato viene modificato sul posto (in place).

import {
  type AimState,
  type Ball,
  type GameState,
  type PlayerId,
  type Wind,
  BALL_RADIUS,
  CANNON_RADIUS,
} from "./types";
import { flattenPlatform, generateTerrain, heightAt } from "./terrain";
import { launchVelocity, stepBall, windAccelFor } from "./physics";
import { canStartAim, computeAim, isShotValid, maxDragFor } from "./input";

export { BALL_RADIUS } from "./types";
export const CANNON_HIT_RADIUS = 42; // sagoma-bersaglio generosa (cannone grande)
export const DAMAGE = 20;
const PLATFORM_HALF = 34; // semi-larghezza della piattaforma sotto il cannone
const MUZZLE = 60; // distanza dalla quale esce la palla (oltre la canna del cannone)

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

function randomWind(rng: () => number): Wind {
  return { dirX: rng() < 0.5 ? -1 : 1, strength: rng() };
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

  // Cannoni simmetrici: stessa distanza dal centro (margine uguale ai due lati).
  // Il margine è sorteggiato una volta sola per dare varietà tra una partita e
  // l'altra, ma resta identico a destra e a sinistra.
  const ri = Math.round(width * (0.08 + rng() * 0.06)); // 8%–14% della larghezza
  const redX = ri;
  const blueX = width - 1 - ri;
  // Il terreno è simmetrico, quindi i due cannoni risultano alla stessa altezza.
  // Si solleva il corpo del cannone sopra il suolo (così non sembra interrato).
  const redY = flattenPlatform(terrain, redX, PLATFORM_HALF) - CANNON_RADIUS;
  const blueY = flattenPlatform(terrain, blueX, PLATFORM_HALF) - CANNON_RADIUS;

  const first: PlayerId = rng() < 0.5 ? "red" : "blue";

  return {
    width,
    height,
    maxDrag: maxDragFor(width, height),
    wind: randomWind(rng),
    shotsSinceWindChange: 0,
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
  state.aim = computeAim(cannon, px, py, state.maxDrag);
}

/** Aggiorna la mira durante il trascinamento; la canna segue la direzione di tiro. */
export function updateAim(state: GameState, px: number, py: number): void {
  if (!state.aim.active) return;
  const cannon = state.cannons[state.current];
  state.aim = computeAim(cannon, px, py, state.maxDrag);
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
  state.ball = stepBall(state.ball, dt, windAccelFor(state.wind));
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

  // Vento: cambia ogni 2 tiri conclusi (un round completo di entrambi i giocatori).
  state.shotsSinceWindChange += 1;
  if (state.shotsSinceWindChange >= 2) {
    state.wind = randomWind(Math.random);
    state.shotsSinceWindChange = 0;
  }

  // Passa il turno.
  state.current = other(state.current);
  state.phase = "aiming";
}
