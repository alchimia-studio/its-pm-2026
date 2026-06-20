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
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

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

      const s = stateRef.current;
      if (!s || s.width !== w || s.height !== h) {
        // Al primo avvio e a ogni ridimensionamento reale (es. rotazione del
        // dispositivo) rigeneriamo il campo: così cannoni e terreno restano
        // sempre coerenti con la finestra e non finiscono mai fuori schermo.
        stateRef.current = createGame(w, h);
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
