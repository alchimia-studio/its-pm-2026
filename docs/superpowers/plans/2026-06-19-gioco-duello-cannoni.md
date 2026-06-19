# Duello tra Cannoni — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Costruire la v1 giocabile del duello 1vs1 a turni con tiro "a fionda" e moto parabolico, in stile retro neon, dentro Next.js.

**Architecture:** Tutta la logica di gioco vive in piccoli moduli framework-agnostici in `src/game/` (tipi, terreno, fisica, input, motore, disegno). Un singolo componente client React (`GameCanvas`) monta un `<canvas>` a tutto schermo, fa girare il ciclo di animazione (~60 fps con passo a tempo fisso), collega gli eventi puntatore e gestisce ridimensionamento e orientamento. Una rotta `/gioco` mostra il gioco; la landing esistente guadagna un pulsante "Gioca".

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, HTML Canvas 2D, Pointer Events. Nessuna libreria esterna.

**Nota sui test:** per regola di progetto (`CLAUDE.md`) **non** si scrivono test automatici in v1. La verifica di ogni task è `npm run lint` (+ `npm run build` ai traguardi) e **playtest manuale** quando il risultato è visibile. La logica di terreno/fisica è scritta come funzioni pure così da poter aggiungere test in futuro senza riscritture.

**Prerequisito:** si lavora sul branch `gioco-duello-cannoni` (già creato in fase di brainstorming). Tutti i commit di questo piano vanno su quel branch.

---

## Struttura dei file

| File | Responsabilità | Creato in |
|---|---|---|
| `src/game/types.ts` | Tipi condivisi (stato di gioco, cannone, palla, terreno, mira) | Task 1 |
| `src/game/terrain.ts` | Genera il terreno casuale; altezza del suolo per colonna; spiana le piattaforme | Task 2 |
| `src/game/physics.ts` | Moto parabolico (passo della palla) e conversione potenza+angolo → velocità | Task 3 |
| `src/game/input.ts` | Calcoli della fionda: se si può iniziare a mirare, potenza/angolo dal trascinamento | Task 4 |
| `src/game/engine.ts` | Stato del gioco, turni, collisioni, danni, vittoria, transizioni di fase | Task 5 |
| `src/game/render.ts` | Disegna tutto sul canvas in stile retro neon | Task 6 |
| `src/components/GameCanvas.tsx` | Componente client: canvas, ciclo di animazione, puntatore, resize, orientamento | Task 7 |
| `src/app/gioco/page.tsx` | Rotta `/gioco` | Task 7 |
| `src/app/page.tsx` | (modifica) pulsante "Gioca" sulla landing | Task 8 |

Dipendenze tra moduli: `terrain`, `physics`, `input` dipendono solo da `types`. `engine` dipende da `types`, `terrain`, `physics`, `input`. `render` dipende da `types`. `GameCanvas` collega `engine` e `render`.

---

## Task 1: Tipi condivisi

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: Crea il file dei tipi**

```ts
// src/game/types.ts
// Tipi condivisi da tutto il gioco. Le coordinate sono in "pixel logici"
// (la stessa unità usata per disegnare): origine in alto a sinistra, y verso il basso.

export type PlayerId = "red" | "blue";

/** Un cannone appoggiato sul terreno. */
export interface Cannon {
  player: PlayerId;
  x: number; // posizione orizzontale del perno
  y: number; // posizione verticale del perno (sul suolo)
  health: number; // vita 0..100
  angle: number; // angolo attuale della canna (radianti), solo per il disegno
}

/** La palla sparata. */
export interface Ball {
  x: number;
  y: number;
  vx: number; // velocità orizzontale (px/s)
  vy: number; // velocità verticale (px/s), positiva verso il basso
  active: boolean; // true mentre è in volo
}

/** Il terreno: per ogni colonna intera x (0..width-1) sappiamo l'altezza del suolo. */
export interface Terrain {
  width: number;
  height: number;
  surface: number[]; // surface[x] = y del suolo in quella colonna
}

/** Fasi del gioco. */
export type Phase = "title" | "aiming" | "flying" | "gameover";

/** Stato della mira mentre si trascina la fionda. */
export interface AimState {
  active: boolean;
  originX: number; // perno del cannone che sta mirando
  originY: number;
  pointerX: number; // posizione attuale di mouse/dito
  pointerY: number;
  power: number; // 0..1
  angle: number; // direzione di tiro (radianti)
}

/** Lo stato completo della partita. */
export interface GameState {
  width: number;
  height: number;
  phase: Phase;
  current: PlayerId; // di chi è il turno
  winner: PlayerId | null;
  terrain: Terrain;
  cannons: Record<PlayerId, Cannon>;
  ball: Ball;
  aim: AimState;
}
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/game/types.ts
git commit -m "feat(gioco): tipi condivisi del gioco"
```

---

## Task 2: Generazione del terreno

**Files:**
- Create: `src/game/terrain.ts`

- [ ] **Step 1: Crea il modulo del terreno**

```ts
// src/game/terrain.ts
// Genera un terreno casuale come "mappa di altezze" (un valore di y per ogni colonna).
// Tutte le funzioni sono pure: dati gli stessi input (incluso il generatore casuale rng)
// restituiscono lo stesso risultato.

import type { Terrain } from "./types";

export interface TerrainOptions {
  width: number;
  height: number;
  rng?: () => number; // generatore di numeri casuali in [0,1); default Math.random
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Crea il profilo del terreno sommando alcune onde sinusoidali casuali. */
export function generateTerrain({
  width,
  height,
  rng = Math.random,
}: TerrainOptions): Terrain {
  // Banda verticale in cui può stare il suolo (y piccola = in alto).
  const minTop = height * 0.45; // suolo più alto possibile
  const maxTop = height * 0.85; // suolo più basso possibile
  const mid = (minTop + maxTop) / 2;
  const amp = (maxTop - minTop) / 2;

  // Tre onde con frequenza, fase e ampiezza decrescenti.
  const waves = [0, 1, 2].map((i) => ({
    freq: ((1 + i + rng() * 1.5) * (Math.PI * 2)) / width,
    phase: rng() * Math.PI * 2,
    amp: amp * (0.6 - i * 0.15),
  }));

  const surface: number[] = new Array(width);
  for (let x = 0; x < width; x++) {
    let y = mid;
    for (const w of waves) y += Math.sin(x * w.freq + w.phase) * w.amp;
    surface[x] = clamp(y, minTop, maxTop);
  }

  return { width, height, surface };
}

/** Altezza del suolo (y) alla posizione orizzontale x. */
export function heightAt(terrain: Terrain, x: number): number {
  const i = clamp(Math.round(x), 0, terrain.width - 1);
  return terrain.surface[i];
}

/**
 * Appiattisce il terreno intorno a centerX (per ±halfWidth) così il cannone
 * poggia stabile. Modifica il terreno e restituisce l'altezza della piattaforma.
 */
export function flattenPlatform(
  terrain: Terrain,
  centerX: number,
  halfWidth: number,
): number {
  const x0 = clamp(Math.round(centerX - halfWidth), 0, terrain.width - 1);
  const x1 = clamp(Math.round(centerX + halfWidth), 0, terrain.width - 1);
  let sum = 0;
  for (let x = x0; x <= x1; x++) sum += terrain.surface[x];
  const y = sum / (x1 - x0 + 1);
  for (let x = x0; x <= x1; x++) terrain.surface[x] = y;
  return y;
}
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/game/terrain.ts
git commit -m "feat(gioco): generazione del terreno casuale"
```

---

## Task 3: Fisica del proiettile

**Files:**
- Create: `src/game/physics.ts`

- [ ] **Step 1: Crea il modulo di fisica**

```ts
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
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/game/physics.ts
git commit -m "feat(gioco): fisica del moto parabolico"
```

---

## Task 4: Calcoli della fionda (input)

**Files:**
- Create: `src/game/input.ts`

- [ ] **Step 1: Crea il modulo input**

```ts
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
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/game/input.ts
git commit -m "feat(gioco): calcoli del comando a fionda"
```

---

## Task 5: Motore di gioco (stato, turni, collisioni, vittoria)

**Files:**
- Create: `src/game/engine.ts`

- [ ] **Step 1: Crea il motore**

```ts
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
  state.ball = {
    x: cannon.x + dirX * MUZZLE,
    y: cannon.y + dirY * MUZZLE,
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
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Commit**

```bash
git add src/game/engine.ts
git commit -m "feat(gioco): motore con turni, collisioni e vittoria"
```

---

## Task 6: Disegno (render) in stile retro neon

**Files:**
- Create: `src/game/render.ts`

- [ ] **Step 1: Crea il modulo di disegno**

```ts
// src/game/render.ts
// Disegna l'intero stato di gioco sul canvas, in stile retro neon.
// Riceve un contesto 2D già scalato (coordinate in pixel logici).

import type { GameState, PlayerId } from "./types";
import { heightAt } from "./terrain";

const COLORS = {
  skyTop: "#0a0e24",
  skyBottom: "#141a3a",
  star: "#ffffff",
  terrain: "#1c8f5a",
  terrainEdge: "#27e0a0",
  red: "#ff3b6b",
  blue: "#3d6bff",
  ball: "#fff2a8",
  arrow: "#ffe66d",
  text: "#ffffff",
  subtitle: "#cfd6ff",
} as const;

const BLOCK = 14; // larghezza dei blocchi del terreno (look "pixel")
const STEP = 10; // quantizzazione verticale del terreno

function playerColor(id: PlayerId): string {
  return id === "red" ? COLORS.red : COLORS.blue;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

type Star = { x: number; y: number; r: number };
let starCache: { w: number; h: number; stars: Star[] } | null = null;

function getStars(w: number, h: number): Star[] {
  if (starCache && starCache.w === w && starCache.h === h) return starCache.stars;
  const stars: Star[] = [];
  const count = Math.floor((w * h) / 12000);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h * 0.7,
      r: Math.random() < 0.85 ? 1 : 1.6,
    });
  }
  starCache = { w, h, stars };
  return stars;
}

export function draw(ctx: CanvasRenderingContext2D, s: GameState): void {
  const w = s.width;
  const h = s.height;

  // Cielo notturno.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Stelle.
  ctx.fillStyle = COLORS.star;
  ctx.globalAlpha = 0.8;
  for (const st of getStars(w, h)) {
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  drawTerrain(ctx, s);
  drawCannon(ctx, s, "red");
  drawCannon(ctx, s, "blue");
  if (s.phase === "flying" && s.ball.active) drawBall(ctx, s);
  if (s.phase === "aiming" && s.aim.active) drawAim(ctx, s);
  drawHud(ctx, s);

  if (s.phase === "title") {
    drawCenterOverlay(ctx, s, "DUELLO TRA CANNONI", "Tocca o clicca per giocare");
  } else if (s.phase === "gameover") {
    const name = s.winner === "red" ? "ROSSO" : "BLU";
    drawCenterOverlay(ctx, s, `VINCE ${name}!`, "Tocca o clicca per rigiocare");
  }
}

function drawTerrain(ctx: CanvasRenderingContext2D, s: GameState): void {
  const t = s.terrain;
  for (let x = 0; x < t.width; x += BLOCK) {
    const cx = Math.min(x + BLOCK / 2, t.width - 1);
    const top = Math.floor(heightAt(t, cx) / STEP) * STEP;
    ctx.fillStyle = COLORS.terrain;
    ctx.fillRect(x, top, BLOCK, s.height - top);
    ctx.fillStyle = COLORS.terrainEdge;
    ctx.fillRect(x, top, BLOCK, 4);
  }
}

function drawCannon(ctx: CanvasRenderingContext2D, s: GameState, id: PlayerId): void {
  const c = s.cannons[id];
  const color = playerColor(id);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;

  // Canna (ruota con l'angolo di mira).
  ctx.save();
  ctx.rotate(c.angle);
  ctx.fillStyle = color;
  roundRect(ctx, -6, -7, 34, 14, 7);
  ctx.fill();
  ctx.restore();

  // Base.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // Foro centrale (senza bagliore).
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.skyTop;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, s: GameState): void {
  const b = s.ball;
  ctx.save();
  ctx.shadowColor = COLORS.ball;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, s: GameState): void {
  const a = s.aim;
  const c = s.cannons[s.current];
  const len = 40 + a.power * 90; // lunghezza della freccia in base alla potenza
  const tipX = c.x + Math.cos(a.angle) * len;
  const tipY = c.y + Math.sin(a.angle) * len;

  ctx.save();
  ctx.strokeStyle = COLORS.arrow;
  ctx.fillStyle = COLORS.arrow;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.shadowColor = COLORS.arrow;
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  // Punta della freccia.
  const ah = 10;
  const left = a.angle + Math.PI - 0.4;
  const right = a.angle + Math.PI + 0.4;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX + Math.cos(left) * ah, tipY + Math.sin(left) * ah);
  ctx.lineTo(tipX + Math.cos(right) * ah, tipY + Math.sin(right) * ah);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Percentuale di potenza.
  ctx.save();
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 14px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.round(a.power * 100)}%`, c.x, c.y - 28);
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState): void {
  drawHealth(ctx, 20, 20, s.cannons.red.health, COLORS.red, "ROSSO", "left");
  drawHealth(ctx, s.width - 20, 20, s.cannons.blue.health, COLORS.blue, "BLU", "right");

  if (s.phase === "aiming") {
    const name = s.current === "red" ? "ROSSO" : "BLU";
    ctx.save();
    ctx.fillStyle = playerColor(s.current);
    ctx.font = "bold 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`Turno: ${name}`, s.width / 2, 30);
    ctx.restore();
  }
}

function drawHealth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hp: number,
  color: string,
  label: string,
  align: "left" | "right",
): void {
  const w = 160;
  const h = 16;
  const bx = align === "left" ? x : x - w;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, bx, y, w, h, 8);
  ctx.fill();

  if (hp > 0) {
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    roundRect(ctx, bx, y, w * (hp / 100), h, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = align;
  ctx.fillText(`${label} ${hp}%`, align === "left" ? bx : bx + w, y + h + 14);
  ctx.restore();
}

function drawCenterOverlay(
  ctx: CanvasRenderingContext2D,
  s: GameState,
  title: string,
  subtitle: string,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(5,8,20,0.6)";
  ctx.fillRect(0, 0, s.width, s.height);

  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.text;
  ctx.shadowColor = COLORS.arrow;
  ctx.shadowBlur = 18;
  ctx.font = "bold 44px system-ui, sans-serif";
  ctx.fillText(title, s.width / 2, s.height / 2 - 10);

  ctx.shadowBlur = 0;
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillStyle = COLORS.subtitle;
  ctx.fillText(subtitle, s.width / 2, s.height / 2 + 30);
  ctx.restore();
}
```

- [ ] **Step 2: Verifica il lint**

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 3: Verifica che il progetto compili (controllo dei tipi su tutti i moduli)**

Run: `npm run build`
Atteso: "Compiled successfully" (nessun errore di tipo). I moduli non sono ancora usati da una pagina, ma il build ne verifica i tipi.

- [ ] **Step 4: Commit**

```bash
git add src/game/render.ts
git commit -m "feat(gioco): disegno del campo in stile retro neon"
```

---

## Task 7: Componente di gioco e rotta `/gioco`

**Files:**
- Create: `src/components/GameCanvas.tsx`
- Create: `src/app/gioco/page.tsx`

- [ ] **Step 1: Crea il componente client `GameCanvas`**

```tsx
// src/components/GameCanvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState } from "@/game/types";
import {
  beginAim,
  cancelAim,
  createGame,
  releaseAim,
  startMatch,
  update,
  updateAim,
} from "@/game/engine";
import { draw } from "@/game/render";

const STEP = 1 / 60; // passo di simulazione a tempo fisso (secondi)

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [portrait, setPortrait] = useState(false);

  // Ciclo di animazione + ridimensionamento.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let acc = 0;

    function fit() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setPortrait(h > w);

      if (!stateRef.current) {
        stateRef.current = createGame(w, h);
      } else {
        // Adatta le dimensioni; il campo viene rigenerato dalla partita successiva.
        stateRef.current.width = w;
        stateRef.current.height = h;
      }
    }

    function frame(t: number) {
      if (!last) last = t;
      let dt = (t - last) / 1000;
      last = t;
      if (dt > 0.1) dt = 0.1; // evita salti enormi (es. scheda in background)

      const s = stateRef.current;
      if (s) {
        acc += dt;
        while (acc >= STEP) {
          update(s, STEP);
          acc -= STEP;
        }
        draw(ctx, s);
      }
      raf = requestAnimationFrame(frame);
    }

    fit();
    window.addEventListener("resize", fit);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", fit);
    };
  }, []);

  // Gestione del puntatore (mouse + tocco unificati).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function pos(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function down(e: PointerEvent) {
      e.preventDefault();
      const s = stateRef.current;
      if (!s) return;
      const p = pos(e);

      if (s.phase === "title") {
        startMatch(s);
        return;
      }
      if (s.phase === "gameover") {
        const fresh = createGame(s.width, s.height);
        startMatch(fresh);
        stateRef.current = fresh;
        return;
      }
      if (s.phase === "aiming") {
        canvas!.setPointerCapture(e.pointerId);
        beginAim(s, p.x, p.y);
      }
    }

    function move(e: PointerEvent) {
      const s = stateRef.current;
      if (!s || s.phase !== "aiming" || !s.aim.active) return;
      const p = pos(e);
      updateAim(s, p.x, p.y);
    }

    function up() {
      const s = stateRef.current;
      if (!s || s.phase !== "aiming" || !s.aim.active) return;
      releaseAim(s);
    }

    function cancel() {
      const s = stateRef.current;
      if (s) cancelAim(s);
    }

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);

    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0a0e24]">
      <canvas ref={canvasRef} className="block touch-none" />
      {portrait && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0e24] text-center text-white">
          <p className="text-4xl">🔄</p>
          <p className="max-w-xs text-lg">
            Ruota il dispositivo in orizzontale per giocare.
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Crea la pagina della rotta `/gioco`**

```tsx
// src/app/gioco/page.tsx
import type { Metadata } from "next";
import GameCanvas from "@/components/GameCanvas";

export const metadata: Metadata = {
  title: "Duello tra Cannoni",
  description: "Duello 1vs1 a turni: mira a fionda e colpisci il cannone avversario.",
};

export default function GiocoPage() {
  return <GameCanvas />;
}
```

- [ ] **Step 3: Verifica lint e build**

Run: `npm run lint`
Atteso: nessun errore.

Run: `npm run build`
Atteso: "Compiled successfully" e la rotta `/gioco` presente nell'elenco delle pagine.

- [ ] **Step 4: Playtest manuale**

Run: `npm run dev`, poi apri `http://localhost:3000/gioco`.
Verifica (desktop, col mouse):
- appare la schermata titolo sopra un campo generato; un clic avvia la partita;
- compare l'indicazione del turno e le due barre vita al 100%;
- premendo sul cannone di turno e trascinando appare la freccia con la % di potenza, e la canna ruota;
- al rilascio la palla segue un arco; toccando terreno o uscendo dai lati passa il turno;
- centrando il cannone nemico la sua vita cala del 20%;
- dopo 5 colpi a segno appare "VINCE …" e un clic fa ripartire con un nuovo campo;
- un trascinamento minimo non spara.

Poi, negli strumenti per sviluppatori del browser, attiva la **modalità dispositivo** (vista mobile): in verticale appare l'avviso "ruota il dispositivo"; in orizzontale il gioco è giocabile col tocco.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameCanvas.tsx src/app/gioco/page.tsx
git commit -m "feat(gioco): componente canvas e rotta /gioco giocabile"
```

---

## Task 8: Pulsante "Gioca" sulla landing

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Aggiungi l'import di `Link`**

Sostituisci la prima riga del file:

```tsx
import Image from "next/image";
```

con:

```tsx
import Image from "next/image";
import Link from "next/link";
```

- [ ] **Step 2: Aggiungi il pulsante nella sezione hero**

Nel file `src/app/page.tsx`, subito dopo il paragrafo `<p>` che termina con `questa pagina crescerà insieme a noi.</p>` (ancora dentro la `<section>` dell'hero), inserisci:

```tsx
        <Link
          href="/gioco"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#005ca9] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#0a4f8a]"
        >
          🎮 Gioca: Duello tra Cannoni
        </Link>
```

- [ ] **Step 3: Verifica lint e build**

Run: `npm run lint`
Atteso: nessun errore.

Run: `npm run build`
Atteso: "Compiled successfully".

- [ ] **Step 4: Playtest manuale**

Run: `npm run dev`, apri `http://localhost:3000`: il pulsante "Gioca" è visibile nell'hero e porta a `/gioco`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(landing): pulsante per avviare il gioco"
```

---

## Task 9: Playtest finale e Definition of Done

**Files:** nessuna modifica prevista (solo verifica; correggi e ricommetti se emergono problemi).

- [ ] **Step 1: Build e lint puliti**

Run: `npm run build`
Atteso: "Compiled successfully".

Run: `npm run lint`
Atteso: nessun errore.

- [ ] **Step 2: Partita completa di verifica**

Con `npm run dev`, gioca una partita intera fino alla vittoria (5 colpi) su desktop e in vista mobile orizzontale, ripercorrendo la checklist del Task 7 Step 4. Annota eventuali problemi di equilibrio (troppo facile/difficile): i valori in `physics.ts`/`input.ts`/`engine.ts` (gravità, velocità, MAX_DRAG, raggio bersaglio) sono i punti da regolare.

- [ ] **Step 3: (Se necessario) regola il bilanciamento e ricommetti**

Se col playtest il gioco risulta troppo difficile, aumenta `CANNON_HIT_RADIUS` in `src/game/engine.ts` (es. da 26 a 34) e/o riduci `MAX_SPEED` in `src/game/physics.ts`. Poi:

```bash
git add -A
git commit -m "tune(gioco): bilanciamento dopo il playtest"
```

---

## Self-Review (compilata dall'autore del piano)

**1. Copertura della spec:**
- Regole (vita, −20%, 5 colpi, solo colpo diretto, terreno fisso, solo gravità, primo a caso, no autogol, vittoria a 0%) → Task 5 (`engine.ts`). ✓
- Comando a fionda (verso opposto, potenza da trascinamento, soglia minima, freccia di mira, blocco durante il volo) → Task 4 (`input.ts`) + Task 5 + Task 6 (freccia) + Task 7 (blocco: i comandi agiscono solo in fase `aiming`). ✓
- Fisica (moto parabolico, passo a tempo fisso, niente rimbalzo, confini, esiti) → Task 3 + Task 5 (`resolveBall`) + Task 7 (passo fisso nel loop). ✓
- Campo (terreno casuale, larghezza/distanza variabile, cannoni appoggiati, piattaforme) → Task 2 + Task 5 (`createGame`). ✓
- Stile retro neon → Task 6. ✓
- Schermate (titolo, partita+HUD, fine partita, "ruota il dispositivo") → Task 5 (fasi) + Task 6 (overlay/HUD) + Task 7 (orientamento). ✓
- Input e dispositivi (mouse+tocco unificati, niente scroll/zoom, DPR, resize) → Task 7. ✓
- Pulsante "Gioca" sulla landing → Task 8. ✓
- Definition of Done (build, lint, playtest) → Task 9. ✓

**2. Scansione segnaposto:** nessun "TBD/TODO/da completare"; tutti i passi che toccano codice mostrano il codice completo.

**3. Coerenza dei tipi e dei nomi:** i nomi usati tra i moduli combaciano — `GameState`, `Cannon`, `Ball`, `Terrain`, `AimState`, `Phase` (da `types.ts`); `generateTerrain`/`heightAt`/`flattenPlatform` (terrain); `launchVelocity`/`stepBall` (physics); `canStartAim`/`computeAim`/`isShotValid` (input); `createGame`/`startMatch`/`beginAim`/`updateAim`/`releaseAim`/`cancelAim`/`update` (engine); `draw` (render). Gli import in `engine.ts`, `render.ts` e `GameCanvas.tsx` usano esattamente questi nomi.
