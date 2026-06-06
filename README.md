# ITS PM 2026 — Progetto AI della classe

Progetto pratico del corso ITS **"Intelligenza Artificiale e strumenti generativi"** (percorso
_Project & Innovation Manager_), promosso da **LGA — ITS Leading Generation Academy** in
collaborazione con **Confindustria Alto Milanese**.

Gli studenti lavorano come **project manager** e definiscono il prodotto da realizzare; il docente
cura la parte tecnica con il supporto di **Claude Code**. Il prodotto finale sarà deciso insieme
alla classe — per ora il sito mostra una pagina di presentazione.

## Tecnologie

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
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
