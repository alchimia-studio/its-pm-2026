# Specifiche — Duello tra Cannoni (gioco 1vs1 a turni)

- **Data:** 2026-06-19
- **Stato:** approvato in brainstorming, pronto per il piano di implementazione
- **Versione:** v1 (prima versione giocabile)

> Documento pensato per essere letto sia dal docente sia dagli studenti (project
> manager, senza competenze di programmazione). I termini tecnici sono spiegati la prima
> volta che compaiono.

---

## 1. Cos'è e a cosa serve

Un piccolo videogioco **2D**, giocabile nel browser su **computer e smartphone**
(smartphone in orizzontale). È un **duello 1 contro 1 a turni sullo stesso dispositivo**:
i due giocatori si passano il telefono/mouse e tirano a turno. **Niente collegamenti via
rete**, niente account, niente salvataggi.

Ogni giocatore ha un cannone (uno **rosso**, uno **blu**) appoggiato su un terreno
generato a caso. A turno si mira e si spara una palla che segue le **leggi del moto
parabolico**. Lo scopo è **colpire il cannone avversario** finché la sua vita arriva a 0%.

Questo documento descrive **cosa** costruiamo nella prima versione (v1). Il **come** in
dettaglio (passi di lavoro) sarà nel piano di implementazione successivo.

### Glossario rapido

- **Canvas**: un'area di disegno dentro la pagina web in cui il programma disegna grafica e
  animazioni con il codice (qui usiamo un singolo canvas a tutto schermo).
- **Moto parabolico**: il percorso a forma d'arco di un oggetto lanciato, dovuto alla
  spinta iniziale e alla gravità che lo tira verso il basso.
- **Frame**: una singola immagine dell'animazione; il gioco ne disegna circa 60 al secondo.
- **HUD** (Heads-Up Display): le informazioni mostrate sopra il gioco (barre vita, di chi è
  il turno).

---

## 2. Regole di gioco (confermate)

1. Partita **1vs1 a turni** sullo stesso dispositivo.
2. Ogni giocatore parte con **vita 100%**.
3. Ogni **colpo a segno** toglie **20%** di vita → servono **5 colpi** per vincere.
4. **Solo colpo diretto**: la palla deve toccare la **sagoma del cannone** avversario. Per
   equità la sagoma-bersaglio è **generosa** (conta tutto il corpo del cannone, non solo la
   punta della canna).
5. **Terreno fisso**: il terreno non si distrugge e non cambia durante la partita.
6. **Solo gravità**: niente vento.
7. **Inizia un giocatore a caso.**
8. Un cannone **non si danneggia da solo** con il proprio tiro (niente autogol).
9. Vince chi per primo porta l'avversario a **0%**.

---

## 3. Il comando "a fionda" (cuore del gioco)

Nel proprio turno il giocatore usa il cannone **come una fionda**. Funziona allo stesso modo
con il **mouse** (desktop) e con il **dito** (smartphone):

1. **Inizio**: il giocatore preme **sul proprio cannone** (entro una piccola distanza dal
   cannone, così un tocco a caso sullo schermo non fa partire nulla).
2. **Trascinamento**: tenendo premuto, trascina. Il programma misura il **vettore di
   trascinamento** (la freccia dal punto in cui ha premuto al punto attuale del cursore/dito).
3. **Direzione**: si spara nel verso **opposto** al trascinamento (come una vera fionda:
   tiro indietro-in basso → la palla parte in avanti-in alto). La **canna ruota** per
   mostrare la direzione di tiro.
4. **Potenza**: più **lungo** è il trascinamento, più **forte** è il tiro, fino a un
   **massimo**. Un trascinamento troppo corto (sotto una soglia minima) **annulla** il tiro.
5. **Aiuto alla mira**: durante il trascinamento appare una **freccia** che indica forza e
   direzione. **Non** viene mostrato dove cadrà la palla (scelta di difficoltà voluta).
6. **Rilascio**: al rilascio parte la palla. Durante il volo i comandi sono **bloccati**
   fino alla fine del tiro.

> Nota di bilanciamento: la combinazione "freccia senza anteprima dell'arco + solo colpo
> diretto" rende il gioco impegnativo. È una scelta voluta; la sagoma-bersaglio generosa
> (punto 2.4) la compensa. Se col playtest risultasse troppo difficile, basterà allargare il
> raggio del bersaglio o introdurre un piccolo raggio d'impatto (cambio minimo).

---

## 4. Fisica e proiettile

- **Modello**: velocità iniziale (da potenza + direzione) + **gravità costante** verso il
  basso. La posizione della palla è ricalcolata a ogni passo di simulazione.
- **Passo a tempo fisso**: la simulazione avanza a passi di durata fissa (es. 1/60 di
  secondo). Questo rende il comportamento **stabile e identico** su computer e telefono,
  indipendentemente dalla velocità dello schermo.
- **Nessun rimbalzo**: al primo contatto (terreno o cannone) la palla **esplode** e il tiro
  finisce.
- **Confini**: se la palla esce dai lati (sinistra/destra) o non colpisce nulla, è un **tiro
  a vuoto**. La palla **può** salire oltre il bordo superiore e poi ricadere (nessun
  "soffitto").
- **Esiti di un tiro**:
  - tocca la sagoma del **cannone avversario** → **colpo** (−20% all'avversario);
  - tocca il **terreno** → tiro a vuoto;
  - esce dai **lati** dello schermo → tiro a vuoto;
  - tocca il **proprio** cannone → ignorato (nessun danno).
- In tutti i casi, finito il tiro **passa il turno** all'altro giocatore (a meno che la
  partita sia finita).

---

## 5. Il campo di battaglia

- **Un solo schermo, niente scorrimento**: l'intero campo è sempre visibile. Il canvas si
  adatta alla dimensione della finestra.
- **Terreno casuale a ogni partita**: profilo con **alture diverse**; rappresentato come una
  "mappa di altezze" (per ogni colonna orizzontale si conosce l'altezza del suolo).
- **Larghezza variabile**: la **distanza tra i due cannoni** cambia a ogni partita perché i
  **margini** dai bordi (sinistro e destro) vengono sorteggiati in un intervallo. Tutto
  resta comunque dentro lo schermo.
- **Cannoni appoggiati al terreno**: il cannone rosso vicino al bordo **sinistro**, il blu
  vicino al bordo **destro**, ciascuno posato sul suolo alla propria posizione. Sotto ogni
  cannone il terreno viene **leggermente spianato** (una piccola piattaforma) così il cannone
  poggia stabile.
- Il terreno lascia sempre **spazio di cielo** sopra (per gli archi di tiro) e **profondità**
  sotto.

---

## 6. Stile grafico — Retro arcade / neon

Direzione visiva scelta (opzione C del brainstorming):

- **Cielo notturno** blu scuro con **stelle** puntiformi.
- **Terreno a blocchi "pixel"** (colonne squadrate), look anni '90.
- **Cannoni al neon**: rosso e blu con leggero **bagliore**.
- **Palla** e **freccia di mira** luminose; eventuale scia luminosa della palla in volo.
- **Barre vita** e indicatore di turno in stile arcade.
- **Nessuna immagine esterna**: tutto disegnato con **forme geometriche** → leggero, veloce e
  facile da modificare. I colori giocatore restano **rosso** e **blu** come da regole.

---

## 7. Schermate e flusso

Tre stati principali, semplici:

1. **Titolo**: nome del gioco + pulsante **"Gioca"**.
2. **Partita**:
   - alla partenza: genera il campo, posiziona i cannoni, **sorteggia chi inizia** e lo
     annuncia ("Inizia ROSSO/BLU");
   - HUD sempre visibile: **barre vita** dei due giocatori e **di chi è il turno**;
   - sotto-fasi interne: *mira* → *palla in volo* → *risoluzione* → turno successivo.
3. **Fine partita**: schermata **"Vince ROSSO/BLU"** + pulsante **"Rigioca"** (rigenera un
   nuovo campo).

**Smartphone in verticale**: poiché il gioco è in orizzontale, se il dispositivo è in
verticale mostriamo un avviso **"ruota il dispositivo"** finché non viene girato.

---

## 8. Comandi e dispositivi (input)

- Mouse e tocco gestiti in modo **unificato** tramite gli eventi puntatore del browser
  (Pointer Events), così lo stesso codice funziona su desktop e mobile.
- Sul tocco vengono **disabilitati** scorrimento e zoom accidentali durante il gioco.
- Gestione di interruzioni del gesto (es. dito che esce dallo schermo) → il tiro in
  preparazione viene **annullato** senza sparare.
- Il canvas si **adatta** alle dimensioni della finestra (con nitidezza corretta sugli
  schermi ad alta densità). Un ridimensionamento importante (es. rotazione) ha effetto pieno
  **dalla partita successiva**; il ridimensionamento durante un turno è un caso limite noto e
  accettato in v1.

---

## 9. Architettura tecnica

Tutto dentro **Next.js**, **nessuna libreria esterna** (niente motori di gioco, coerente con
le regole del progetto). Una pagina di gioco "client" con un **singolo `<canvas>`** a tutto
schermo, e la logica divisa in **piccoli moduli** con un compito chiaro ciascuno.

### Moduli (in `src/game/`)

| Modulo | Compito | Dipende da |
|---|---|---|
| `types` | tipi condivisi (stato di gioco, cannone, palla, terreno) | — |
| `terrain` | genera il profilo casuale del terreno; fornisce l'altezza del suolo per ogni colonna; spiana le piattaforme sotto i cannoni | `types` |
| `physics` | calcolo del moto parabolico passo per passo; conversione potenza+direzione → velocità iniziale | `types` |
| `input` | traduce gli eventi puntatore (mouse/tocco) in stato di mira (potenza, angolo) e segnala il rilascio | `types` |
| `engine` | tiene lo **stato del gioco**, gestisce turni, vita, collisioni, condizioni di vittoria e le transizioni tra schermate | `types`, `terrain`, `physics` |
| `render` | disegna tutto sul canvas in stile retro neon | `types` |

**Principio di progettazione**: ogni modulo ha un solo scopo, si usa attraverso un'interfaccia
chiara e si può capire da solo. La logica di `terrain`, `physics` ed `engine` è scritta come
**funzioni pure** quando possibile (stessi input → stessi output), così è facile ragionarci e,
in futuro, testarla.

### Componente e pagina (in `src/`)

- `src/components/GameCanvas.tsx` — **componente client** React che monta il canvas, avvia il
  **ciclo di animazione** (aggiorna `engine` e ridisegna con `render` ~60 volte al secondo),
  collega gli eventi puntatore a `input`/`engine` e gestisce ridimensionamento/orientamento.
- `src/app/gioco/page.tsx` — la **rotta `/gioco`** che mostra il gioco.
- `src/app/page.tsx` — la landing attuale **resta** col suo branding; aggiungiamo un pulsante
  **"Gioca"** che porta a `/gioco`.

### Parametri di bilanciamento (valori iniziali, da rifinire col playtest)

In coordinate del canvas (pixel); il tempo in secondi. Sono punti di partenza, **non**
definitivi.

| Parametro | Valore iniziale | Significato |
|---|---|---|
| gravità | ~900 px/s² | spinta verso il basso |
| passo di simulazione | 1/60 s | durata fissa di ogni passo |
| velocità minima / massima | ~250 / ~1100 px/s | spinta iniziale della palla |
| trascinamento massimo | ~220 px | oltre questa lunghezza la potenza è al 100% |
| soglia minima di trascinamento | ~12 px | sotto questa, il tiro è annullato |
| raggio della palla | ~6 px | dimensione del proiettile |
| raggio bersaglio del cannone | ~26 px | quanto è generosa la sagoma colpibile |
| distanza per "afferrare" il cannone | ~60 px | quanto vicino premere per iniziare a mirare |
| margini laterali (sorteggiati) | ~6%–16% della larghezza | fanno variare la distanza tra i cannoni |

---

## 10. Fuori dalla v1 (YAGNI — da decidere con la classe)

Non realizziamo ora: suono/musica, terreno distruttibile, vento, anteprima completa della
traiettoria, ostacoli, più armi o tipi di colpo, punteggi/statistiche salvati, gioco online,
test automatici. Sono possibili evoluzioni future, da valutare con la classe.

---

## 11. Come verifichiamo (Definition of Done)

Coerente con le regole del progetto (niente test automatici finché la classe non li decide):

1. **`npm run build`** passa senza errori (così `main` resta sempre pubblicabile su Vercel).
2. **`npm run lint`** passa senza errori.
3. **Playtest manuale** nel browser: partita completa su desktop (mouse) e in simulazione
   mobile (tocco, orizzontale), verificando: generazione del campo, sorteggio iniziale, tiro
   a fionda, fisica della palla, colpo a segno (−20%), passaggio del turno, vittoria a 0% e
   "Rigioca".
4. Modifiche **spiegate in italiano** in modo semplice.

---

## 12. Rischi e attenzioni

- **Difficoltà**: con "solo colpo diretto" il gioco può risultare duro; mitigato dalla sagoma
  generosa e regolabile coi parametri di bilanciamento.
- **Tocco su mobile**: gestire bene scorrimento/zoom indesiderati e l'orientamento.
- **Coerenza PC/telefono**: garantita dal passo di simulazione a tempo fisso.
- **`main` sempre funzionante**: si lavora a piccoli passi; ogni passo deve buildare.
