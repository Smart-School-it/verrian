# Changelog

## 2026-10-29 — Tutorial, officina, mondi e impostazioni

- Tutorial contestuale, mappa dei nodi, indicazioni di vulnerabilità dei boss e quattro traguardi locali persistenti.
- Officina senza conto alla rovescia nelle nuove partite Avventura, con navigazione Tab/frecce/Invio e focus aggiornato immediatamente; Arcade mantiene il tempo limitato. Bozze precedenti compatibili conservano le regole originali.
- Tre nuovi panorami originali per Forgia, Abisso e Cittadella; PNG, WebP e prompt conservati. Caricamento dei panorami al bisogno e anticipato dall’officina.
- Impostazioni di qualità, volume, atmosfera sonora, scuotimento, lampi e aiuti; tasti personalizzabili e supporto dei controller standard.
- Sottofondo Web Audio distinto per mondo, attivato da gesto utente e sospeso in pausa; effetti audio separati in un modulo dedicato.
- Pose con corsa/arresto più morbidi e riepiloghi non bloccanti tra mondi.
- Pixi caricato soltanto se utilizzato, indicatore di caricamento immagini, mantenimento delle preferenze al ripiego su Canvas. Rimosso dal controller il codice inattivo della vecchia integrazione scolastica.
- Estesi i test di regressione a regole dell’officina, vecchie bozze, controller, rimappature, tutorial, traguardi e pose.

## 2026-10-29 — Grafica, salvataggi e uso su smartphone

- Corretto il primo caricamento Canvas: attesa delle risorse, invalidazione delle cache e nessun disegno continuo del campo coperto dal menu.
- Nuovo modulo per risultati validati e compatibili con lo storico esistente; nuovo record corretto, scritture fallite segnalate e tentativi successivi senza duplicazioni.
- Bozza automatica e pulsante Riprendi: seed e replay a 16 bit mantengono anche i comandi diagonali. Bozza rimossa dopo il risultato salvato, demo separata e revisioni delle regole controllate.
- Preferenze di effetti e difficoltà ricordate; il movimento ridotto rimane rispettato.
- Campo mobile più grande, indicatori compatti, pulsanti principali di almeno 44 pixel e pannello espandibile con comandi contestuali.
- Verificati Canvas e WebGL, ricaricamento, errori di storage, input touch simultanei, orientamento e schermo intero; aggiunti test di regressione dei salvataggi.

## 2026-10-29 — Revisione funzionale e grafica

- Documentati problemi riprodotti di cache grafica, record, storage, ripresa e preferenze.
- Verificati layout mobile, officina, caricamento e resa dei quattro mondi; definiti interventi proposti e criteri di verifica.
- Questa revisione aggiunge documentazione; non applica ancora le modifiche al gioco.

## 2026-10-29 — Denominazione dell’istituto

- Corretta la sigla in I.I.S.S. Pietro Verri nella schermata iniziale, nel testo alternativo, nel footer, nei dati strutturati e nella documentazione.

## 2026-10-29 — Racconto in prima pagina e avvio diretto

- Frase narrativa sotto il titolo nella pagina iniziale, con comparsa progressiva e copia accessibile completa.
- Entra nel sistema avvia direttamente la partita alla difficoltà selezionata, senza prologo intermedio e senza attendere la fine del testo.
- Eliminati template e controller del dialogo; mantenuto il modulo di presentazione del testo con pulizia dell’animazione all’avvio.
- Adattata la disposizione su telefoni e schermi bassi al testo aggiunto.

## 2026-10-29 — Titoli in alto

- Luogo, sottotitolo e titolo spostati in alto nella schermata iniziale; difficoltà e pulsanti mantenuti in basso.
- Ritratto riposizionato sui telefoni per evitare sovrapposizioni con le scritte.

## 2026-10-29 — Schermata iniziale cinematografica

- Sfondo della scuola nel 2148 visibile fin dall’apertura, insieme al ritratto del protagonista e ai comandi originali.
- Stile condiviso con il prologo; testo progressivo conservato dopo Entra nel sistema, senza duplicazioni.
- Rimossi dalla schermata iniziale HUD e comandi riservati alla partita; stato iniziale dichiarato nell’HTML per evitare cambi di layout al caricamento.
- Disposizione adattata a desktop, telefoni, schermi bassi e modalità a schermo intero.

## 2026-10-28 — Presentazione arcade

- Rimossi il testo narrativo duplicato dalla schermata iniziale e il blocco `vr-heading`.
- Prologo con scrittura progressiva, pause sulla punteggiatura e comando Mostra tutto prima dell’avvio.
- Accessibilità: frase completa per lettori di schermo, movimento ridotto rispettato, nessun salto dei pulsanti e arresto dell’animazione alla chiusura.
- Logo, titolo e sottotitolo collegati alla pagina iniziale; mantenuto un unico H1 nella barra.

## 2026-10-28 — Prologo alla scuola nel 2148

- Introduzione narrativa prima di ogni nuova missione, con scuola riconoscibile in stile oscuro e decadente.
- Comandi per iniziare, saltare con Esc o tornare al menu; timer e simulazione fermi durante la lettura.
- Dialogo con focus gestito, supporto mobile ed effetti ridotti.
- Immagine originale generata, WebP, fotografia di riferimento e prompt conservati nel progetto.


## 2026-10-28 — Ambientazione e missione di Verrian

- Descrizione ambientata nel 2148: il cyborg custode del codice cerca di salvare l’umanità dall’avvento scellerato dell’intelligenza artificiale.
- Aggiornati presentazione iniziale, descrizione dei mondi, metadati SEO/social, dati strutturati e README.


## 2026-10-28 — Cannone con mira diagonale

- Spari a 45° verso l’alto e il basso con R/F più J/X, anche in salto e da abbassati.
- Pulsanti touch di mira e comando Spara quando il cannone è selezionato.
- Canna, lampo e traiettorie allineati con un unico riferimento per motore, Canvas e WebGL.
- Velocità e danni conservati; test di collisione, orientamento e input simultanei.


## 2026-10-28 — Progetto autonomo definitivo

- Nuovo dominio e cartella come unica installazione di sviluppo e pubblicazione.
- Trasferiti dal laboratorio mondi, prompt, immagini originali, fixture e test.
- Aggiunti aggiornamento della pagina e controlli autonomi, senza rigenerare o perdere i metadati Open Graph.
- Rimossa la dipendenza dal precedente generatore del laboratorio.


## 2026-10-28

- Copertina originale per condivisione, con Verrian e Milano: JPEG 1200×630 e PNG sorgente.
- Metadati Open Graph completi e Twitter Card con anteprima grande e testo alternativo.
- URL canonico del nuovo dominio, descrizione SEO e JSON-LD VideoGame.
- Sitemap, robots e documentazione per il sito autonomo.
