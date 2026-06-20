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
