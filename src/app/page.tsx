import Image from "next/image";
import AnimatedBackground from "./AnimatedBackground";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden px-6 py-10 text-slate-900">
      {/* Sfondo animato nei colori del brand */}
      <AnimatedBackground />

      {/* Eyebrow / corso */}
      <header className="w-full max-w-3xl pt-6 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-[#005ca9] uppercase">
          Intelligenza Artificiale e Strumenti Generativi
        </p>
      </header>

      {/* Hero */}
      <section className="flex max-w-3xl flex-1 flex-col items-center justify-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#005ca9]/20 bg-[#005ca9]/5 px-4 py-1.5 text-sm font-medium text-[#005ca9]">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full bg-[#c0d11a] motion-safe:animate-pulse"
          />
          In costruzione con la classe
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Stiamo progettando il nostro prodotto digitale.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-slate-600">
          Un progetto reale, costruito passo dopo passo dagli studenti con il
          supporto dell&apos;intelligenza artificiale. L&apos;idea prende forma
          in classe: questa pagina crescerà insieme a noi.
        </p>
      </section>

      {/* Partner / branding */}
      <footer className="w-full max-w-3xl pb-4">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium tracking-wider text-slate-500 uppercase">
              In collaborazione con
            </span>
            <div className="flex flex-col items-center gap-x-10 gap-y-6 sm:flex-row sm:items-end">
              <div className="flex h-20 items-center justify-center rounded-xl bg-white px-6 shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/loghi/lga.jpg"
                  alt="ITS Leading Generation Academy (LGA)"
                  width={400}
                  height={207}
                  className="h-11 w-auto"
                  priority
                />
              </div>

              <div className="flex h-20 items-center justify-center rounded-xl bg-white px-6 shadow-sm ring-1 ring-slate-200">
                <Image
                  src="/loghi/confindustria.jpg"
                  alt="Confindustria Alto Milanese"
                  width={400}
                  height={265}
                  className="h-12 w-auto"
                  priority
                />
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500">
            Corso ITS Project &amp; Innovation Manager · Edizione 2025/2026
          </p>
        </div>
      </footer>
    </main>
  );
}
