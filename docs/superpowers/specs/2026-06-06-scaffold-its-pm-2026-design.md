# Spec — Scaffold del progetto `its-pm-2026`

- **Data:** 2026-06-06
- **Stato:** approvato (in attesa di revisione finale dello spec)
- **Autore:** docente + Claude Code

## 1. Contesto

Repository per un progetto pratico del corso ITS **"Intelligenza Artificiale e strumenti
generativi"** (percorso _Project & Innovation Manager_). La classe (19 studenti, 19-20 anni,
**senza competenze di programmazione**) lavora come **project manager**: definisce e coordina il
prodotto. Il **docente cura la parte tecnica** con il supporto di **Claude Code**.

Il corso è promosso da **LGA — ITS Leading Generation Academy** in collaborazione con
**Confindustria Alto Milanese**.

Il prodotto finale (**probabilmente un videogame**) sarà definito **in seguito, insieme agli
studenti**. Questo task NON sceglie il prodotto: prepara solo le fondamenta.

## 2. Obiettivo del task

Avere un sistema **già pronto** per:

1. **Deploy automatico su Vercel** a ogni commit su `main`.
2. **Sviluppo immediato con Claude Code** (repo "strumentato" per questo).
3. Una **pagina placeholder curata** da mostrare in classe al primo deploy.

Massima flessibilità sul prodotto futuro: nessuna scelta tecnica irreversibile ora.

## 3. Principi

- **YAGNI**: niente motore di gioco, database, autenticazione o testing finché non servono.
- **Tutto in italiano**: README, `CLAUDE.md`, `DEPLOY.md`, pagina placeholder, messaggi di
  commit e commenti (la classe legge questi file).
- **`main` sempre verde**: la _definition of done_ di ogni modifica è `npm run build` e
  `npm run lint` puliti, così il deploy live non si rompe mai davanti agli studenti.

## 4. Stack tecnico

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS**, generato con `create-next-app` ufficiale.
- Struttura **`src/`**, alias import **`@/*`**, **ESLint + Prettier**.
- **Package manager: npm** (universale; Vercel lo rileva dal lockfile).
- **Node fissato a 22 LTS** via `.nvmrc` (`22`) e `engines.node` (`22.x`) in `package.json`.
  Il locale ha Node 25 (ok per sviluppo); fissiamo 22 per allinearci all'ambiente di build di
  Vercel. Con `.nvmrc` si può fare `nvm use` per allineare anche il locale.

**Perché Next.js:** framework "di casa" di Vercel (deploy zero-config), ottimo supporto in Claude
Code, e adattabile a qualunque prodotto futuro (web app, tool, o browser game aggiungendo
Canvas/Phaser/Pixi come semplice dipendenza — senza rifare lo scaffold).

## 5. Struttura del repository

```
its-pm-2026/
├── .claude/
│   └── settings.json     # permessi pre-approvati -> meno conferme in classe
├── .nvmrc                # 22
├── .gitignore            # include .DS_Store
├── CLAUDE.md             # "manuale operativo" per Claude Code (italiano)
├── README.md             # contesto progetto + come si lavora (italiano)
├── DEPLOY.md             # guida passo-passo per collegare Vercel (italiano)
├── package.json
├── next.config.ts · tsconfig.json · eslint.config.mjs · .prettierrc
├── docs/superpowers/specs/   # questo spec e i futuri
├── public/
│   └── loghi/
│       ├── lga.jpg
│       └── confindustria.jpg
└── src/app/
    ├── layout.tsx        # lang="it", metadata (titolo/descrizione/OG)
    ├── page.tsx          # landing placeholder
    └── globals.css
```

## 6. Pagina placeholder (landing curata)

Una landing pulita, moderna e **responsive**, in italiano, che comunica:

- **Nome/identità del progetto** e che è un progetto del corso ITS _"AI e strumenti generativi"_.
- **Stato "in costruzione con la classe"** (work in progress).
- **Branding partner**: fascia dedicata "**Un progetto di** _LGA — ITS Leading Generation
  Academy_" e "**in collaborazione con** _Confindustria Alto Milanese_".

**Palette** (accenti dai colori LGA; valori da rifinire campionando i file):

- Blu primario `~#005CA9`, verde lime accento `~#C0D11A`, blu acciaio Confindustria `~#2E5C9A`.

**Gestione loghi:**

- File spostati da `images/` a **`public/loghi/`** (la cartella `images/` a root viene rimossa).
- Mostrati con **`next/image`** (ridimensionamento/ottimizzazione automatici; i file sorgente sono
  grandi: 2000×1033 e 2143×1419).
- Poiché sono **JPEG con sfondo bianco**, vanno in **card/contenitori bianchi arrotondati** con
  padding, così risultano puliti su qualunque sfondo del tema.
- **`alt`** descrittivi: "ITS Leading Generation Academy (LGA)" e "Confindustria Alto Milanese".

**Look esatto** (tema chiaro vs scuro, trattamento hero): proposto e mostrato **già renderizzato in
fase di build**, con eventuali varianti. Default di partenza: tema chiaro e pulito con accenti blu +
lime e i loghi in una fascia "credits". Nessuna libreria UI pesante.

## 7. Strumentazione per Claude Code

### `CLAUDE.md` (italiano)

- **Contesto** del corso e dei ruoli: studenti = PM (non programmatori), docente = parte tecnica.
- **Stack e convenzioni**: App Router, TypeScript, Tailwind, dove va cosa (`src/app`, `public/`).
- **Comandi**: `npm run dev`, `npm run build`, `npm run lint`.
- **Workflow**: ogni commit su `main` → deploy automatico Vercel; quindi `main` deve sempre buildare.
- **Definition of done**: `npm run build` e `npm run lint` puliti prima di committare.
- **Stile di collaborazione**: spiegare le modifiche in **linguaggio semplice** (si lavora
  davanti/insieme agli studenti-PM); commit e testi in italiano.

### `.claude/settings.json`

Allowlist di permessi per comandi **sicuri e frequenti**, così in classe Claude Code chiede meno
conferme. Indicativamente: `npm run dev/build/lint`, `npm install`/`npm ci`, `git
status/diff/add/commit/log`, lettura file. **Nessun** permesso pericoloso pre-approvato
(niente push, rm, comandi distruttivi). Sintassi esatta delle regole finalizzata in implementazione.

## 8. Integrazione Vercel

- Next.js è **zero-config** su Vercel: **nessun `vercel.json`** necessario.
- La CLI Vercel e il login non sono disponibili in questo ambiente: la **connessione iniziale la fa
  il docente una volta sola dal browser**, seguendo `DEPLOY.md`:
  1. Importare il repo GitHub su vercel.com.
  2. Vercel rileva Next.js (build e output automatici).
  3. Push su `main` = **deploy in produzione**; ogni altro branch = **preview deploy**.
- Dopo il collegamento, ogni commit aggiorna il sito da solo.

## 9. Git e primo deploy

- Creo i file e faccio i **commit in locale** (messaggi in italiano).
- **Il push su GitHub avviene solo con l'ok esplicito del docente** (azione che pubblica sul remote
  e abilita Vercel). Userà le credenziali GitHub già configurate sulla macchina.
- Lo spec stesso viene committato in locale come parte del processo.

## 10. Fuori scope (ora)

Scelta del prodotto/motore di gioco, slash command didattici custom, testing automatico,
autenticazione, database, internazionalizzazione. Si aggiungono quando la classe li deciderà.

## 11. Definition of done del task

- [ ] Scaffold `create-next-app` (Next 15, App Router, TS, Tailwind, ESLint, `src/`, `@/*`).
- [ ] `.nvmrc` (22) + `engines.node` 22.x; `.gitignore` include `.DS_Store`; Prettier configurato.
- [ ] Loghi spostati in `public/loghi/`; cartella `images/` rimossa.
- [ ] Landing placeholder in italiano, responsive, con i due loghi partner in card bianche.
- [ ] `CLAUDE.md`, `README.md`, `DEPLOY.md` in italiano.
- [ ] `.claude/settings.json` con allowlist sicura.
- [ ] `npm run build` e `npm run lint` puliti.
- [ ] Commit in locale (italiano). Push su GitHub + connessione Vercel: su ok del docente.
