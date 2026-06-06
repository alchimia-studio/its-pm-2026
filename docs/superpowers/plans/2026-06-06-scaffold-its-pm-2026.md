# Scaffold `its-pm-2026` — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold di un'app Next.js pronta per il deploy automatico su Vercel e strumentata per Claude Code, con una landing placeholder brandizzata (loghi LGA + Confindustria Alto Milanese).

**Architecture:** App Next.js 15 (App Router) + TypeScript + Tailwind generata con `create-next-app`. Una sola pagina (`src/app/page.tsx`) come landing statica. Asset in `public/loghi/`. Documentazione e configurazione per Claude Code (`CLAUDE.md`, `.claude/settings.json`) e per il deploy (`DEPLOY.md`). Vercel è zero-config su Next.js.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, ESLint, Prettier, npm, Node 22 LTS.

> **Nota metodologia:** task di infrastruttura, non di feature con logica. I "test" sono i gate di verifica: `npm run build` (compila la pagina, fallisce su errori TS/JSX), `npm run lint` (ESLint), e una verifica visiva della landing. Nessun unit test applicativo da scrivere ora (YAGNI).

---

## File coinvolti

| File | Responsabilità |
|------|----------------|
| `package.json` | Dipendenze, script (`dev/build/lint/format`), `engines.node` |
| `.nvmrc` | Versione Node per `nvm use` (22) |
| `.prettierrc` | Configurazione Prettier (+ ordinamento classi Tailwind) |
| `.gitignore` | Generato da Next; garantire `.DS_Store` |
| `src/app/layout.tsx` | Layout root: `lang="it"`, metadata |
| `src/app/page.tsx` | Landing placeholder con branding partner |
| `src/app/globals.css` | Stili globali / Tailwind (lasciato come generato) |
| `public/loghi/lga.jpg` · `public/loghi/confindustria.jpg` | Loghi partner |
| `CLAUDE.md` | Guida operativa per Claude Code (italiano) |
| `README.md` | Presentazione progetto + avvio (italiano) |
| `DEPLOY.md` | Guida collegamento Vercel (italiano) |
| `.claude/settings.json` | Allowlist permessi Claude Code |

---

## Task 1: Scaffold Next.js + configurazione di base

**Files:**
- Create: tutto l'output di `create-next-app` (in `.`), `.nvmrc`, `.prettierrc`
- Modify: `package.json` (engines + script `format`), `.gitignore` (se manca `.DS_Store`)
- Move: `images/*.jpg` → `public/loghi/`

- [ ] **Step 1: Spostare i loghi fuori dalla cartella di lavoro**

`create-next-app` rifiuta di partire se trova file/cartelle non riconosciuti (la cartella `images/` lo bloccherebbe). Li parcheggiamo in `/tmp` e li reintegriamo dopo.

Run:
```bash
cd /Users/markigno/workspace/projects/its-pm-2026
mkdir -p /tmp/its-pm-logos
mv images/lga.jpg images/confindustria.jpg /tmp/its-pm-logos/
rmdir images
ls -la   # deve restare: .git, .DS_Store, docs (tutti accettati da create-next-app)
```

- [ ] **Step 2: Generare lo scaffold Next.js (non interattivo)**

Run:
```bash
npx --yes create-next-app@latest . \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --turbopack --yes
```
Expected: termina con "Success! Created ..." e installa le dipendenze. Rileva il repo git esistente e NON reinizializza. Non tocca `docs/`.

Se fallisce per la versione di Node (locale = 25): allineare con `nvm use 22` (lo `.nvmrc` non esiste ancora, quindi `nvm install 22 && nvm use 22`) e ripetere.

- [ ] **Step 3: Verificare lo scaffold**

Run:
```bash
ls src/app   # layout.tsx page.tsx globals.css favicon.ico
cat package.json
```
Expected: `package.json` con `name: "its-pm-2026"`, script `dev/build/start/lint`, dipendenze `next`, `react`, `react-dom`, `tailwindcss`.

- [ ] **Step 4: Installare Prettier (+ plugin ordinamento classi Tailwind)**

Run:
```bash
npm install -D prettier prettier-plugin-tailwindcss
```
Expected: aggiunte a `devDependencies`.

- [ ] **Step 5: Creare `.prettierrc`**

File: `.prettierrc`
```json
{
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 6: Creare `.nvmrc`**

File: `.nvmrc`
```
22
```

- [ ] **Step 7: Aggiungere `engines` e lo script `format` in `package.json`**

Modificare `package.json`: nel blocco `"scripts"` aggiungere la riga `format`, e aggiungere un blocco `"engines"` a livello root. Risultato atteso (le altre chiavi restano invariate):
```json
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write ."
  },
  "engines": {
    "node": "22.x"
  }
```
Nota: con Node 25 in locale, `npm` mostrerà solo un *warning* sull'engine (non bloccante). Vercel userà Node 22.

- [ ] **Step 8: Garantire che `.DS_Store` sia in `.gitignore`**

Leggere `.gitignore`. Il template di Next di norma include già `.DS_Store`. Se NON c'è, appendere:
```
# macOS
.DS_Store
```
Verifica:
```bash
grep -q ".DS_Store" .gitignore && echo "ok: .DS_Store ignorato"
```

- [ ] **Step 9: Reintegrare i loghi in `public/loghi/`**

Run:
```bash
mkdir -p public/loghi
mv /tmp/its-pm-logos/lga.jpg /tmp/its-pm-logos/confindustria.jpg public/loghi/
rmdir /tmp/its-pm-logos
ls public/loghi   # confindustria.jpg lga.jpg
```

- [ ] **Step 10: Verifica build (gate)**

Run:
```bash
npm run build
```
Expected: "Compiled successfully" e la route `/` generata. Nessun errore.

- [ ] **Step 11: Verifica lint (gate)**

Run:
```bash
npm run lint
```
Expected: "No ESLint warnings or errors" (la pagina di default generata è già pulita).

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js e configurazione progetto" \
  -m "create-next-app (App Router, TypeScript, Tailwind, ESLint, src/, alias @/*). Aggiunti .nvmrc (22), engines Node 22.x, Prettier con ordinamento classi Tailwind. Loghi partner spostati in public/loghi/." \
  -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Landing placeholder + branding partner

**Files:**
- Modify: `src/app/layout.tsx` (sostituzione completa)
- Modify: `src/app/page.tsx` (sostituzione completa)
- Delete: SVG di default inutilizzati in `public/`

- [ ] **Step 1: Sostituire `src/app/layout.tsx`**

File: `src/app/layout.tsx` (contenuto completo)
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ITS PM 2026 — Progetto AI della classe",
  description:
    'Progetto del corso ITS "Intelligenza Artificiale e strumenti generativi" — percorso Project & Innovation Manager. Promosso da LGA in collaborazione con Confindustria Alto Milanese.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Sostituire `src/app/page.tsx` con la landing**

File: `src/app/page.tsx` (contenuto completo). Colori del brand LGA usati come valori arbitrari Tailwind (blu `#005ca9`, lime `#c0d11a`) — nessuna dipendenza dalla configurazione del tema. Loghi in card bianche (gestiscono lo sfondo bianco dei JPEG).
```tsx
import Image from "next/image";

export default function Home() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-white px-6 py-10 text-slate-900">
      {/* Accenti di sfondo nei colori del brand */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-[#005ca9]/10 via-[#005ca9]/[0.03] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#c0d11a]/20 blur-3xl"
      />

      {/* Eyebrow / corso */}
      <header className="w-full max-w-3xl pt-6 text-center">
        <p className="text-sm font-medium tracking-[0.2em] text-[#005ca9] uppercase">
          Corso ITS · Intelligenza Artificiale e Strumenti Generativi
        </p>
      </header>

      {/* Hero */}
      <section className="flex max-w-3xl flex-1 flex-col items-center justify-center text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#005ca9]/20 bg-[#005ca9]/5 px-4 py-1.5 text-sm font-medium text-[#005ca9]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#c0d11a]" />
          In costruzione con la classe
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl">
          Stiamo progettando il nostro prodotto digitale.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance text-slate-600">
          Un progetto reale, costruito passo dopo passo dagli studenti nel ruolo di
          project manager con il supporto dell&apos;intelligenza artificiale.
          L&apos;idea prende forma in classe: questa pagina crescerà insieme a noi.
        </p>
      </section>

      {/* Partner / branding */}
      <footer className="w-full max-w-3xl pb-4">
        <div className="flex flex-col items-center gap-6">
          <div className="flex flex-col items-center gap-x-10 gap-y-6 sm:flex-row sm:items-end">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                Un progetto di
              </span>
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
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium tracking-wider text-slate-400 uppercase">
                In collaborazione con
              </span>
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

          <p className="text-center text-sm text-slate-400">
            Percorso ITS Project &amp; Innovation Manager · Edizione 2026
          </p>
        </div>
      </footer>
    </main>
  );
}
```

- [ ] **Step 3: Rimuovere gli SVG di default non più usati**

La pagina di default referenziava `public/*.svg`; la nostra landing non li usa.
Run:
```bash
rm -f public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

- [ ] **Step 4: Verifica lint (gate)**

Run:
```bash
npm run lint
```
Expected: "No ESLint warnings or errors". (Le entità `&apos;`/`&amp;` evitano errori `react/no-unescaped-entities`; `h-auto`/`w-auto` su `next/image` evitano i warning sulle dimensioni.)

- [ ] **Step 5: Verifica build (gate)**

Run:
```bash
npm run build
```
Expected: "Compiled successfully", route `/` statica.

- [ ] **Step 6: Verifica visiva**

Avviare il dev server e controllare il rendering della landing + dei due loghi.
Run:
```bash
npm run dev
```
Poi aprire `http://localhost:3000` e verificare: titolo, badge "In costruzione", i due loghi nelle card bianche, layout responsive. Catturare uno screenshot (skill `run` o Playwright). Fermare il server al termine.
Expected: pagina renderizzata senza errori in console; loghi visibili e nitidi.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: landing placeholder con branding LGA e Confindustria" \
  -m "Pagina principale in italiano, responsive, con accenti nei colori del brand e i due loghi partner in card bianche (next/image). Rimossi gli SVG di default inutilizzati. Lingua del documento impostata a 'it' con metadata dedicati." \
  -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Documentazione e strumentazione Claude Code

**Files:**
- Create: `CLAUDE.md`, `DEPLOY.md`, `.claude/settings.json`
- Modify: `README.md` (sostituzione del README di default)

- [ ] **Step 1: Scrivere `CLAUDE.md`**

File: `CLAUDE.md` (contenuto completo)
````markdown
# CLAUDE.md — Guida per Claude Code

Questo file orienta Claude Code quando lavora su questo repository. Leggilo prima di operare.

## Cos'è questo progetto

Repository di un **progetto pratico** del corso ITS **"Intelligenza Artificiale e strumenti
generativi"** (percorso *Project & Innovation Manager*), promosso da **LGA — ITS Leading
Generation Academy** con **Confindustria Alto Milanese**.

- Gli **studenti** (19-20 anni, senza competenze di programmazione) lavorano come **project
  manager**: decidono cosa costruire e coordinano il lavoro.
- Il **docente** cura la parte tecnica insieme a Claude Code.
- Il **prodotto finale è ancora da definire** con la classe (probabilmente un videogame). Per ora
  il repository è uno scaffold con una pagina placeholder.

## Stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**.
- Codice applicativo in **`src/app/`**. Asset statici in **`public/`** (loghi in `public/loghi/`).
- Alias import **`@/*`** → `src/*`.

## Comandi

```bash
npm run dev      # sviluppo locale su http://localhost:3000
npm run build    # build di produzione (deve passare prima di committare)
npm run lint     # ESLint (deve passare prima di committare)
npm run format   # Prettier (formattazione del codice)
```

## Workflow e deploy

- Il branch **`main`** è collegato a **Vercel**: **ogni push su `main` fa un deploy automatico in
  produzione**; gli altri branch generano *preview deploy*.
- Per questo **`main` deve sempre buildare**. Configurazione iniziale: vedi `DEPLOY.md`.

## Definition of done (prima di ogni commit)

1. `npm run build` passa senza errori.
2. `npm run lint` passa senza errori.
3. Le modifiche sono spiegate in italiano in modo chiaro.

## Come collaborare in questo progetto

- **Scrivi e commenta in italiano** (i nomi tecnici di codice restano in inglese): studenti e
  docente leggono questi file. **Messaggi di commit in italiano.**
- **Spiega le scelte in linguaggio semplice**: chi coordina è un project manager, non un
  programmatore. Evita il gergo non necessario; quando serve un termine tecnico, spiegalo.
- **Procedi a piccoli passi verificabili** e tieni `main` sempre funzionante.
- **YAGNI**: non aggiungere motori di gioco, database, autenticazione o test finché la classe non
  li decide.

## Struttura

```
src/app/layout.tsx   # layout, lingua, metadata
src/app/page.tsx     # pagina principale (placeholder)
src/app/globals.css  # stili globali / Tailwind
public/loghi/        # loghi LGA e Confindustria
docs/superpowers/    # spec e piani di progetto
```
````

- [ ] **Step 2: Sostituire `README.md`**

File: `README.md` (contenuto completo, sovrascrive quello di default)
````markdown
# ITS PM 2026 — Progetto AI della classe

Progetto pratico del corso ITS **"Intelligenza Artificiale e strumenti generativi"** (percorso
*Project & Innovation Manager*), promosso da **LGA — ITS Leading Generation Academy** in
collaborazione con **Confindustria Alto Milanese**.

Gli studenti lavorano come **project manager** e definiscono il prodotto da realizzare; il docente
cura la parte tecnica con il supporto di **Claude Code**. Il prodotto finale sarà deciso insieme
alla classe — per ora il sito mostra una pagina di presentazione.

## Tecnologie

- [Next.js 15](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com)
- Deploy automatico su [Vercel](https://vercel.com)

## Avvio in locale

Serve [Node.js 22](https://nodejs.org) (vedi `.nvmrc`: basta `nvm use`).

```bash
npm install      # installa le dipendenze (la prima volta)
npm run dev      # avvia http://localhost:3000
```

Altri comandi: `npm run build`, `npm run lint`, `npm run format`.

## Deploy

Ogni commit su `main` viene pubblicato automaticamente da Vercel. Per la configurazione iniziale
vedi **[DEPLOY.md](./DEPLOY.md)**.

## Come è organizzato

- `src/app/` — pagine e layout dell'applicazione
- `public/loghi/` — loghi dei partner
- `CLAUDE.md` — guida per lavorare con Claude Code
- `docs/superpowers/` — spec e piani del progetto
````

- [ ] **Step 3: Scrivere `DEPLOY.md`**

File: `DEPLOY.md` (contenuto completo)
````markdown
# Deploy su Vercel

Il progetto si pubblica da solo a ogni commit su `main`, una volta fatto **un collegamento
iniziale** tra il repository GitHub e Vercel. Si fa **una sola volta**, dal browser.

## Collegamento iniziale (una tantum)

1. Vai su **[vercel.com](https://vercel.com)** e accedi (consigliato: login con GitHub).
2. **Add New… → Project**.
3. Importa il repository **`alchimia-studio/its-pm-2026`**.
   - Se non compare, clicca *Adjust GitHub App Permissions* e dai a Vercel accesso al repo.
4. Vercel riconosce automaticamente **Next.js**: lascia le impostazioni di default
   (Framework Preset: Next.js). Non serve alcun `vercel.json`.
5. Clicca **Deploy** e attendi il primo build.

Fatto: ottieni un URL pubblico (es. `its-pm-2026.vercel.app`).

## Da qui in poi

- **Ogni push su `main`** → deploy automatico in **produzione**.
- **Ogni push su un altro branch / pull request** → **preview deploy** con URL dedicato (utile per
  mostrare una modifica prima di metterla online).

## Note

- La versione di Node usata da Vercel è fissata a **22** tramite `engines` in `package.json` (e
  `.nvmrc`).
- Per cambiare dominio o impostazioni: dashboard Vercel → progetto → *Settings*.
````

- [ ] **Step 4: Scrivere `.claude/settings.json`**

File: `.claude/settings.json` (allowlist di comandi sicuri e frequenti; il push NON è incluso, resta sotto conferma)
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run dev:*)",
      "Bash(npm run build:*)",
      "Bash(npm run lint:*)",
      "Bash(npm run format:*)",
      "Bash(npm install:*)",
      "Bash(npm ci:*)",
      "Bash(git status:*)",
      "Bash(git diff:*)",
      "Bash(git log:*)",
      "Bash(git add:*)",
      "Bash(git commit:*)"
    ]
  }
}
```

- [ ] **Step 5: Verifica validità JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log('settings.json valido')"
```
Expected: "settings.json valido".

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: guida Claude Code, README, DEPLOY e permessi di progetto" \
  -m "CLAUDE.md (contesto del corso, workflow, definition of done), README in italiano, DEPLOY.md con i passi per collegare Vercel, e .claude/settings.json con allowlist di comandi sicuri per ridurre le conferme in classe." \
  -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Consegna — push su GitHub e collegamento Vercel (richiede OK del docente)

**Files:** nessuno (azioni git/deploy).

- [ ] **Step 1: Riepilogo locale**

Run:
```bash
git log --oneline
git status
```
Expected: 4 commit (spec + 3 di implementazione), working tree pulito.

- [ ] **Step 2: Chiedere conferma per il push**

Il push pubblica sul remote ed è prerequisito per Vercel. **Chiedere esplicitamente l'OK** al docente prima di procedere.

- [ ] **Step 3: Push (solo dopo OK)**

Run:
```bash
git push -u origin main
```
Expected: branch `main` pubblicato su `origin`. (Usa le credenziali GitHub già configurate; se richiede autenticazione, è un'azione del docente.)

- [ ] **Step 4: Collegamento Vercel**

Ricordare al docente i passi di `DEPLOY.md` (collegamento una tantum dal browser). Dopo il primo import, ogni commit su `main` farà il deploy da solo.

---

## Self-Review (compilata)

- **Spec coverage:** stack/Node/Prettier/gitignore/loghi → Task 1; landing+branding+next/image+palette → Task 2; CLAUDE.md/README/DEPLOY/settings → Task 3; Vercel zero-config (nessun `vercel.json`) → coperto in DEPLOY.md; commit locali + push gated → Task 4. Tutte le voci della *definition of done* dello spec sono mappate.
- **Placeholder scan:** nessun TBD/TODO; contenuti dei file completi; hex dei colori concreti.
- **Type consistency:** componenti `RootLayout` e `Home`; `alt` dei loghi coerenti tra page e descrizioni; percorsi `public/loghi/*.jpg` coerenti ovunque.
