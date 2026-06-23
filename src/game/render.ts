// src/game/render.ts
// Disegna l'intero stato di gioco sul canvas, in stile retro neon.
// Riceve un contesto 2D già scalato (coordinate in pixel logici).

import { type GameState, type PlayerId, BALL_RADIUS, CANNON_RADIUS } from "./types";
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
  ctx.shadowBlur = 24;

  // Canna (ruota con l'angolo di mira).
  ctx.save();
  ctx.rotate(c.angle);
  ctx.fillStyle = color;
  roundRect(ctx, -12, -14, 68, 28, 14);
  ctx.fill();
  ctx.restore();

  // Corpo del cannone.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, CANNON_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  // Foro centrale (senza bagliore).
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.skyTop;
  ctx.beginPath();
  ctx.arc(0, 0, CANNON_RADIUS / 2, 0, Math.PI * 2);
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
  ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2);
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
  ctx.fillText(`${Math.round(a.power * 100)}%`, c.x, c.y - CANNON_RADIUS - 16);
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
