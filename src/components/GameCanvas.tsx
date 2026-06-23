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

// Il gioco vive in un "mondo" di dimensione fissa (16:9) che poi viene scalato
// per riempire la finestra: così il campo resta identico su ogni schermo e non
// cambia mai quando si ridimensiona la finestra.
const WORLD_W = 1280;
const WORLD_H = 720;
const SAFE_AREA = 0.94; // piccolo bordo attorno al campo (spazio per la fionda)
const BAR_COLOR = "#0a0e24"; // colore delle bande: uguale al cielo

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  // Come il mondo è posizionato dentro la finestra (per disegno e input).
  const viewRef = useRef({ dpr: 1, scale: 1, offX: 0, offY: 0 });
  const [portrait, setPortrait] = useState(false);

  // Ciclo di animazione + adattamento della finestra (letterbox).
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    let raf = 0;
    let last = 0;
    let acc = 0;

    // Il campo si crea una sola volta: il ridimensionamento non lo rigenera.
    if (!stateRef.current) stateRef.current = createGame(WORLD_W, WORLD_H);

    function fit() {
      const dpr = window.devicePixelRatio || 1;
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      canvas.width = Math.round(winW * dpr);
      canvas.height = Math.round(winH * dpr);
      canvas.style.width = `${winW}px`;
      canvas.style.height = `${winH}px`;
      setPortrait(winH > winW);

      // Scala il mondo per riempire la finestra mantenendo le proporzioni, con
      // un piccolo bordo di sicurezza. Il terreno NON viene mai rigenerato.
      const scale = Math.min(winW / WORLD_W, winH / WORLD_H) * SAFE_AREA;
      viewRef.current = {
        dpr,
        scale,
        offX: (winW - WORLD_W * scale) / 2,
        offY: (winH - WORLD_H * scale) / 2,
      };
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
        const v = viewRef.current;
        // Riempie tutta la finestra con il colore del cielo (le bande laterali).
        ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        ctx.fillStyle = BAR_COLOR;
        ctx.fillRect(0, 0, canvas.width / v.dpr, canvas.height / v.dpr);
        // Disegna il mondo centrato e scalato dentro la finestra.
        ctx.setTransform(
          v.dpr * v.scale,
          0,
          0,
          v.dpr * v.scale,
          v.dpr * v.offX,
          v.dpr * v.offY,
        );
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
      const v = viewRef.current;
      // Da pixel della finestra a coordinate del mondo (annulla scala e bande).
      return {
        x: (e.clientX - r.left - v.offX) / v.scale,
        y: (e.clientY - r.top - v.offY) / v.scale,
      };
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
