# Verrian — I guardiani del codice

Avventura arcade 2D per il browser, nata nel laboratorio di informatica dell’I.I.S. Pietro Verri di Milano. Nell’anno 2148, Verrian, un cyborg custode del codice, cerca di salvare l’umanità dall’avvento scellerato dell’intelligenza artificiale. Attraversa quattro mondi digitali, a partire dalle rovine di Milano: riattiva i nodi, sconfigge i bug e affronta un boss alla fine di ogni mondo.

**Gioca:** https://verrian.verri.edu.it/

## Caratteristiche

- Motore deterministico a 30 tick al secondo (`assets/verrian/core.js`): la stessa sequenza di comandi produce sempre la stessa partita, quindi ogni partita si può riprodurre e verificare.
- Grafica con WebGL (PixiJS 8) quando c’è una GPU, altrimenti Canvas 2D; schermo intero anche in 21:9.
- Combattimento con lama, armi a distanza, scatto, impulso, colpi da accovacciati e parate.
- Officina fra un mondo e l’altro: armi, armature, vitalità e mezzi (aliante, jetpack, moto).
- Prologo ambientato nel 2148 davanti all’I.I.S. Pietro Verri in rovina, con testo a scrittura progressiva (Esc per saltarlo).
- Cannone con mira diagonale: R o F insieme allo sparo; su touch i pulsanti Mira su e Mira giù.
- Porte segrete, torri e percorsi in verticale.
- Nessun account e nessun server: record e storico restano nel browser (`localStorage`).

## Comandi

| Tasto | Azione |
| --- | --- |
| ← → / A D | Muoversi |
| Spazio / ↑ W | Salto (doppio salto in aria) |
| S / ↓ | Accovacciarsi |
| J / X | Attacco |
| K / Maiusc | Scatto |
| L / C | Impulso |
| Q / E | Cambio arma |
| ↓ + Q | Salire o scendere dal mezzo |
| R / F (con il cannone) | Mirare in diagonale in alto / in basso |
| P / Esc | Pausa |

Su telefono e tablet compaiono i pulsanti a schermo.

## Avvio in locale

È un sito statico: basta un qualsiasi server web nella cartella del progetto.

```sh
python3 -m http.server 8000
# poi apri http://localhost:8000/
```

Parametri utili: `?renderer=canvas` o `?renderer=pixi` per forzare il motore grafico, `?fps=1` per vedere i fotogrammi al secondo.

## Test

Richiedono Node.js 18 o successivo, senza dipendenze.

```sh
npm test
```

- `tests/core.test.cjs`: regole di gioco, limiti, determinismo e una partita completa vincente (`tests/fixtures/verrian-win.json`).
- `tests/art.test.cjs`: pose, atlanti e ritagli delle immagini.

`tools/verify-replay.cjs` riproduce una partita a partire da seme, difficoltà e comandi (JSON su stdin) e stampa il risultato: è lo strumento con cui un server può verificare un punteggio.

## Struttura

```
index.html                 pagina del gioco (configurazione dei livelli inclusa)
assets/verrian/core.js     motore di gioco puro, condiviso da browser e Node
assets/verrian/game.js     interfaccia, comandi, salvataggi
assets/verrian/prologue.js prologo prima della missione
assets/verrian/render.js   renderer Canvas 2D
assets/verrian/render-pixi.js  renderer WebGL (PixiJS)
assets/verrian/art.js      pose e ritagli degli atlanti grafici
assets/verrian/*.webp      fondali, personaggi, nemici, oggetti, officina
assets/vendor/pixi-8.22.0  PixiJS (licenza MIT)
games/verrian/levels.json  livelli (stessa configurazione di index.html)
games/verrian/art-prompts.json  provenienza delle immagini
```

## Crediti

- Gioco, codice e livelli: laboratorio di informatica dell’I.I.S. Pietro Verri, Milano.
- Immagini generate con strumenti di intelligenza artificiale a partire dal ritratto originale del personaggio; prompt e riferimenti sono in `games/verrian/art-prompts.json` e `assets/verrian/og-verrian-v1.json`.
- Lo sfondo del prologo reinterpreta la sede dell’I.I.S. Pietro Verri di Milano; la fotografia usata come riferimento non è inclusa nel repository.
- Facciata del Duomo di riferimento: [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Milan-duomo-front-facade.jpg), CC0.
- [PixiJS](https://pixijs.com/) 8.22.0, licenza MIT (`assets/vendor/pixi-8.22.0/LICENSE`).

## Licenza

Codice, livelli e immagini del gioco sono distribuiti con licenza [MIT](LICENSE): si possono usare, modificare e ridistribuire liberamente, anche per scopi commerciali, mantenendo l’avviso di copyright. PixiJS resta soggetto alla propria licenza MIT (`assets/vendor/pixi-8.22.0/LICENSE`).
