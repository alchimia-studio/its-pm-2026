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

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Transizione morbida 0→1 (per smorzare il terreno verso i bordi). */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Crea il profilo del terreno: colline casuali al centro, **simmetrico rispetto
 * alla metà dello schermo** (a specchio) e **piatto vicino ai bordi**, così i due
 * cannoni partono alla stessa altezza, senza montagne addosso, e con pari difficoltà.
 */
export function generateTerrain({
  width,
  height,
  rng = Math.random,
}: TerrainOptions): Terrain {
  // Banda verticale in cui può stare il suolo (y piccola = in alto).
  const minTop = height * 0.42; // suolo più alto possibile (colline centrali)
  const maxTop = height * 0.82; // suolo più basso possibile
  const mid = (minTop + maxTop) / 2;
  const amp = (maxTop - minTop) / 2;
  const baseY = height * 0.74; // quota piatta del suolo vicino ai cannoni

  // Tre onde con frequenza, fase e ampiezza decrescenti (le colline centrali).
  const waves = [0, 1, 2].map((i) => ({
    freq: ((1 + i + rng() * 1.5) * (Math.PI * 2)) / width,
    phase: rng() * Math.PI * 2,
    amp: amp * (0.6 - i * 0.15),
  }));

  // Larghezza della fascia (vicino a ogni bordo) resa piatta.
  const edge = width * 0.3;

  const surface: number[] = new Array(width);
  const halfN = Math.ceil(width / 2);
  for (let x = 0; x < halfN; x++) {
    let raw = mid;
    for (const w of waves) raw += Math.sin(x * w.freq + w.phase) * w.amp;
    raw = clamp(raw, minTop, maxTop);
    // Vicino al bordo (x→0) il terreno tende alla quota piatta baseY.
    const k = smoothstep(clamp01(x / edge));
    surface[x] = baseY + (raw - baseY) * k;
  }
  // Specchia la metà sinistra sulla destra: terreno simmetrico al centro.
  for (let x = 0; x < halfN; x++) surface[width - 1 - x] = surface[x];

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
