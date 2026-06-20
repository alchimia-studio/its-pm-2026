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
