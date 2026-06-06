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

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS**.
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
