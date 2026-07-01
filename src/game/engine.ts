// src/game/engine.ts
// Tiene lo stato della partita e ne governa l'evoluzione: creazione del campo,
// mira, tiro, collisioni, danni, passaggio del turno e vittoria.
// Per semplicità e prestazioni lo stato viene modificato sul posto (in place).

import {
  type AimState,
  type Ball,
  type Biome,
  type GameState,
  type PlayerId,
  type PowerTarget,
  type Wind,
  BALL_RADIUS,
  CANNON_RADIUS,
  POWER_SIZE_MULTIPLIER,
  TARGET_RADIUS,
} from "./types";
import { flattenPlatform, generateTerrain, heightAt } from "./terrain";
import { launchVelocity, stepBall, windAccelFor } from "./physics";
import { canStartAim, computeAim, isShotValid, maxDragFor } from "./input";

export { BALL_RADIUS } from "./types";
export const CANNON_HIT_RADIUS = 42; // sagoma-bersaglio generosa (cannone grande)
export const DAMAGE = 20;
const PLATFORM_HALF = 34; // semi-larghezza della piattaforma sotto il cannone
const MUZZLE = 60; // distanza dalla quale esce la palla (oltre la canna del cannone)
export const TARGET_HIT_RADIUS = TARGET_RADIUS + 6; // sagoma-bersaglio del power-up (più piccola di quella del cannone: bonus da abile)
export const TARGET_SPAWN_CHANCE = 0.22; // probabilità di comparsa a ogni turno (se non già attivo e nessuno è powered)
export const POWER_TURNS = 3; // durata della modalità power, in propri turni successivi
export const POWER_DAMAGE_MULTIPLIER = 2; // moltiplicatore del danno inflitto mentre si è in modalità power

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

function emptyTarget(): PowerTarget {
  return { active: false, x: 0, y: 0, shotsLeft: 0 };
}

function randomWind(rng: () => number): Wind {
  return { dirX: rng() < 0.5 ? -1 : 1, strength: rng() };
}

const BIOMES: Biome[] = ["erba", "sabbia", "neve", "spiaggia"];

function randomBiome(rng: () => number): Biome {
  return BIOMES[Math.floor(rng() * BIOMES.length)];
}

function maybeSpawnTarget(state: GameState): void {
  if (state.target.active) return; // c'è già un bersaglio in cielo
  if (state.power.red > 0 || state.power.blue > 0) return; // qualcuno è in modalità power
  if (Math.random() >= TARGET_SPAWN_CHANCE) return; // niente questo turno

  const marginX = state.width * 0.25;
  const x = marginX + Math.random() * (state.width - marginX * 2);
  const y = state.height * 0.2;
  state.target = { active: true, x, y, shotsLeft: 2 };
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
    biome: randomBiome(rng),
    target: emptyTarget(),
    power: { red: 0, blue: 0 },
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
  maybeSpawnTarget(state);
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

type ShotOutcome = "targetHit" | "enemyHit" | "miss";

function resolveBall(state: GameState): void {
  const b = state.ball;
  const enemyId = other(state.current);
  const enemy = state.cannons[enemyId];

  // 1. Bersaglio power-up (se attivo): ha priorità su tutto il resto.
  if (state.target.active) {
    const dTarget = Math.hypot(b.x - state.target.x, b.y - state.target.y);
    if (dTarget <= TARGET_HIT_RADIUS + BALL_RADIUS) {
      endShot(state, "targetHit", enemyId);
      return;
    }
  }

  // 2. Esce dai lati dello schermo → tiro a vuoto.
  if (b.x < 0 || b.x > state.width) {
    endShot(state, "miss", enemyId);
    return;
  }

  // 3. Colpo diretto alla sagoma del cannone nemico (raddoppiata se è in modalità power).
  const enemyHitRadius =
    state.power[enemyId] > 0 ? CANNON_HIT_RADIUS * POWER_SIZE_MULTIPLIER : CANNON_HIT_RADIUS;
  if (Math.hypot(b.x - enemy.x, b.y - enemy.y) <= enemyHitRadius + BALL_RADIUS) {
    endShot(state, "enemyHit", enemyId);
    return;
  }

  // 4. Tocca il terreno → tiro a vuoto. (Il proprio cannone è ignorato: nessun autogol.)
  if (b.y + BALL_RADIUS >= heightAt(state.terrain, b.x)) {
    endShot(state, "miss", enemyId);
  }
}

function endShot(state: GameState, outcome: ShotOutcome, enemyId: PlayerId): void {
  state.ball.active = false;
  const shooter = state.current;
  // "Ero in modalità power PRIMA di questo tiro?" — decide il moltiplicatore
  // del danno. Va calcolato prima di scalare il contatore qui sotto, altrimenti
  // il terzo (ultimo) turno powered perderebbe il raddoppio del danno.
  const wasPowered = state.power[shooter] > 0;

  if (outcome === "targetHit") {
    state.target = emptyTarget();
  } else if (outcome === "enemyHit") {
    const enemy = state.cannons[enemyId];
    const damage = wasPowered ? DAMAGE * POWER_DAMAGE_MULTIPLIER : DAMAGE;
    enemy.health = Math.max(0, enemy.health - damage);
    if (enemy.health <= 0) {
      state.phase = "gameover";
      state.winner = shooter;
      return;
    }
  }

  // La modalità power del tiratore scala di 1 per il tiro appena concluso
  // (a segno, a vuoto, o sul bersaglio: conta comunque come un turno).
  if (wasPowered) state.power[shooter] -= 1;

  // Il tiro che colpisce il bersaglio attiva la modalità power: vale dal
  // turno SUCCESSIVO di questo giocatore (questo tiro non è uno dei 3).
  if (outcome === "targetHit") state.power[shooter] = POWER_TURNS;

  // Vento: cambia ogni 2 tiri conclusi (un round completo di entrambi i giocatori).
  state.shotsSinceWindChange += 1;
  if (state.shotsSinceWindChange >= 2) {
    state.wind = randomWind(Math.random);
    state.shotsSinceWindChange = 0;
  }

  // Passa il turno.
  state.current = other(shooter);
  state.phase = "aiming";
  maybeSpawnTarget(state);
}
