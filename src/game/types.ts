// src/game/types.ts
// Tipi condivisi da tutto il gioco. Le coordinate sono in "pixel logici"
// (la stessa unità usata per disegnare): origine in alto a sinistra, y verso il basso.

// Dimensioni geometriche condivise tra disegno e fisica (in pixel del campo).
export const CANNON_RADIUS = 28; // raggio del corpo del cannone
export const BALL_RADIUS = 9; // raggio della palla

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
  maxDrag: number; // lunghezza di trascinamento che dà la potenza massima
  phase: Phase;
  current: PlayerId; // di chi è il turno
  winner: PlayerId | null;
  terrain: Terrain;
  cannons: Record<PlayerId, Cannon>;
  ball: Ball;
  aim: AimState;
}
