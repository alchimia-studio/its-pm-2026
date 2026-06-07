/**
 * Sfondo animato della landing page.
 *
 * È pensato per stare "dietro" a tutto il contenuto (z-index negativo) e per
 * essere puramente decorativo: per questo è marcato con `aria-hidden` e non
 * intercetta i click (`pointer-events-none`).
 *
 * L'effetto è composto da:
 *  - alcune "macchie" sfumate (orbs) nei colori del brand che si muovono
 *    lentamente, creando una specie di aurora soffusa;
 *  - una griglia molto leggera che dà profondità e un tocco "tech";
 *  - una vignettatura bianca ai bordi per tenere il centro pulito e leggibile.
 *
 * Tutte le animazioni partono solo se l'utente NON ha attivato la riduzione
 * del movimento (vedi `motion-safe:` e la regola `prefers-reduced-motion`
 * in globals.css): così rispettiamo le preferenze di accessibilità.
 */
export default function AnimatedBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Macchia blu in alto a sinistra */}
      <div className="bg-orb bg-orb--blue motion-safe:animate-orb-1 absolute -top-32 -left-24 h-[32rem] w-[32rem]" />

      {/* Macchia verde-lime a destra */}
      <div className="bg-orb bg-orb--lime motion-safe:animate-orb-2 absolute top-1/3 -right-28 h-[28rem] w-[28rem]" />

      {/* Macchia blu chiaro in basso al centro */}
      <div className="bg-orb bg-orb--sky motion-safe:animate-orb-3 absolute -bottom-40 left-1/3 h-[34rem] w-[34rem]" />

      {/* Griglia sottile per dare profondità */}
      <div className="bg-grid absolute inset-0" />

      {/* Vignettatura: schiarisce i bordi e mantiene il centro pulito */}
      <div className="bg-vignette absolute inset-0" />
    </div>
  );
}
