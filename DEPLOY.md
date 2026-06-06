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
