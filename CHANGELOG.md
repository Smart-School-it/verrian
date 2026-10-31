# Changelog

## 2026-10-31 — Pulsanti di avvio in stile arcade

- Nella schermata iniziale anche «Entra nel sistema» / «Nuova partita», «Riprendi la partita» e «Guarda la demo» hanno lo stile da cabinato dei pulsanti di modalità: maiuscole monospazio, angoli squadrati, ombra a blocchi, pressione visibile e bagliore al neon.
- Colori per funzione: giallo «insert coin» per entrare nel sistema, verde con cursore ▶ lampeggiante per riprendere (con la ripresa disponibile «Nuova partita» diventa contornata in giallo), blu con spia rossa per la demo. Su telefono «Guarda la demo» va a capo a tutta larghezza; con movimento ridotto niente lampeggio né spostamenti.

## 2026-10-30 — Scelta della modalità in stile arcade

- Il menu a tendina della schermata iniziale è sostituito da due pulsanti in stile cabinato: **Avventura** («Consigliata», 8 integrità · 3 vite) e **Arcade** («Per esperti», nemici più resistenti · punti ×1,25). Bordi al neon (ciano per Avventura, magenta per Arcade), cursore ▶ lampeggiante, ombra squadrata e suono di selezione.
- Gruppo di scelta accessibile (`role="radiogroup"`): frecce per cambiare, Tab per entrare e uscire. Scelta ricordata nel browser come prima; record personale aggiornato in base alla modalità. Con movimento ridotto il cursore non lampeggia.

## 2026-10-30 — Ritorno al menu dopo una partita

- Corretto il blocco della schermata iniziale dopo una partita o la demo: «Entra nel sistema» e «Guarda la demo» restavano disattivati con la barra «Preparazione del gioco…» ferma, perché il menu veniva ricostruito dalla versione salvata al caricamento della pagina. Ora pulsanti e barra di caricamento vengono aggiornati a ogni ritorno al menu (verificato con Canvas e WebGL, dopo la demo e dopo una partita abbandonata).

## 2026-10-30 — Video promozionale per i social

- Spot verticale di 33 secondi per studenti delle medie e delle superiori (`assets/verrian/video/verrian-promo-v1.webm`, 720×1280, VP8 + Opus, copertina `verrian-promo-v1-poster.png`), pensato per Instagram, TikTok e YouTube Shorts: domanda d’apertura («Hai 5 minuti tra una lezione e l’altra?»), Milano 2148, luoghi dei mondi, boss, gioco dal telefono (gratis, senza account, niente da scaricare), sfida del record di classe, laboratorio del Verri e QR code finale.
- Riprese reali del gioco, musica ed effetti generati da `audio.js`. Script in `scripts/promo/`.

## 2026-10-30 — QR code

- Locandina con QR code verso https://verrian.verri.edu.it (`assets/verrian/qr/verrian-qr.png`, 1080×1560, e `verrian-qr.svg`): moduli a pallini, ritratto di Verrian al centro, fumetto «Inquadrami!» e invito «Scansiona e gioca subito»; in basso solo «I.I.S.S. Pietro Verri · Milano». Correzione d’errore H; lettura verificata da 160 a 900 pixel di larghezza. Generatore in `scripts/qr-code.cjs`.

## 2026-10-29 — Nuovo trailer

- Trailer rigirato con la versione attuale del gioco (`assets/verrian/video/verrian-trailer-v3.webm`, 63 secondi, 1280×720, VP8 + Opus, copertina `verrian-trailer-v3-poster.png`): sfondi Milano 2148 (Duomo, Stazione Centrale, Naviglio Grande, Castello Sforzesco), nuovo tecnico, piattaforme illustrate e titoli con i luoghi. Il trailer v2 resta disponibile.

## 2026-10-29 — Smartwatch del tecnico

- Aggiunto uno smartwatch al polso sinistro del tecnico in entrambe le pose; rimossi gli altri bracciali blu. Conservate le illustrazioni precedenti.

## 2026-10-29 — Abbigliamento del tecnico informatico

- Nuova variante con gilet da laboratorio, camicia, strumenti e tesserino, nelle pose prima e dopo la liberazione.
- Conservate le precedenti immagini con maglione e con giacca; PNG, WebP e prompt della nuova variante inclusi.

## 2026-10-29 — Variante formale del tecnico

- Aggiunta una variante del tecnico con giacca e camicia, mantenendo la somiglianza, la capsula e le pose prima e dopo la liberazione.
- Conservata la versione con maglione come riserva, oltre all’atlante originale; PNG, WebP e prompt della variante sono inclusi.

## 2026-10-29 — Tecnico di laboratorio

- Nuova illustrazione del tecnico da salvare, ispirata alla fotografia fornita: capsula chiusa e posa dopo la liberazione, coordinate con lo stile del gioco.
- Originale PNG, versione WebP e prompt conservati; l’atlante precedente resta disponibile come riserva. La fotografia non è pubblicata nel progetto.
- Verificati caricamento, allineamento, stati e ricompensa nei renderer Canvas e WebGL.

## 2026-10-29 — Revisione grafica generale

- Uniformati cabinet, barra, indicatori, pulsanti, officina, impostazioni, riepilogo e schede informative con superfici e bordi coerenti.
- Ridisegnati frammenti, crediti, integrità, energia, Overdrive e cornici dei mezzi, con simboli più distinguibili e disegni condivisi in cache da Canvas e WebGL.
- Colpi con nucleo e scie stratificate, centro delle mine più visibile e indicatore del boss più rifinito. I segnali principali rimangono visibili con effetti disattivati.
- Estesa con intensità ridotta la nebbia ai panorami milanesi successivi al Duomo; rispettate le preferenze di movimento ridotto.
- Nessuna modifica a livelli, collisioni, punteggi o salvataggi.


## 2026-10-29 — Schermata iniziale su smartphone

- In verticale la foto della scuola nel 2148 resta visibile in tutto il riquadro: velatura scura più leggera, concentrata solo dietro i comandi in basso, e ombra sotto titolo e racconto per mantenerli leggibili.

## 2026-10-29 — Piattaforme e ostacoli illustrati

- Piattaforme sospese e mobili corazzate, con bordi luminosi, griglie, fissaggi e propulsori antigravità; rimossi i sostegni verticali decorativi.
- Terreno con pannelli metallici, rinforzi, prese d’aria e segni di usura; punte con lame metalliche, inserti luminosi e fasce di pericolo.
- Emettitori laser con stati spento/preavviso/attivo distinti; barriere fratturabili con pannelli e crepe progressive.
- Nuovo modulo grafico condiviso `terrain-art.js`: immagini nella cache e sprite riutilizzati in WebGL. Aggiornamento della grafica statica quando si attivano o disattivano gli effetti.
- Regole, geometria dei livelli, collisioni e punteggi invariati. Verificati i quattro mondi in Canvas/WebGL, i margini delle immagini, gli stati dei laser e gli effetti ridotti su smartphone.

## 2026-10-29 — Milano 2148 e sfondi originali selezionabili

- Nuovi panorami di Stazione Centrale, Naviglio Grande e Castello Sforzesco, diroccati e coerenti con le palette dei mondi. Conservati Duomo, scuola e tutti gli sfondi digitali originali.
- Selettore Ambientazione nelle impostazioni: Milano 2148 predefinita oppure Mondi digitali; scelta persistente nel browser e cambio durante la pausa senza modificare la partita.
- Luoghi indicati nel menu, nell’HUD e nei passaggi di mondo; caricamento al bisogno e cache separate per entrambe le varianti in Canvas e WebGL.
- Originali PNG, WebP ottimizzati e prompt con riferimenti di stile conservati. Estesi i controlli di associazione degli sfondi e delle preferenze; motore e configurazione dei livelli invariati.


## 2026-10-29 — Il guardiano del codice

- Sottotitolo corretto in «Il guardiano del codice» (Verrian è un solo guardiano): titolo della pagina, anteprime social, dati strutturati, configurazione dei mondi, README e trailer.
- Nuova immagine Open Graph `og-verrian-v2.jpg`, ricavata dall’originale ad alta risoluzione corretto (`og-verrian-source-v2.png`), con «IL GUARDIANO DEL CODICE» e «GIOCA SUBITO» al posto di «GIOCA NEL BROWSER»; testo alternativo aggiornato. Le versioni v1 restano come originali.
- Trailer rigenerato (`verrian-trailer-v2.webm`) con la nuova copertina e «Gioca subito: gratis e senza account».

## 2026-10-29 — Video promozionale

- Trailer di 62 secondi (1280×720, WebM VP8 + Opus) in `assets/verrian/video/verrian-trailer-v2.webm`, con copertina `verrian-trailer-v2-poster.png`: copertina, Milano, primo boss, i quattro mondi, scontro finale con KERNEL PANIC e schermata con l’indirizzo del gioco.
- Riprese reali del gioco (renderer Canvas) guidate dalla partita vincente dei test, con musica ed effetti del gioco; titoli e sottotitoli composti nel browser. Script per rigenerarlo in `scripts/trailer/`.

## 2026-10-29 — Avvio su smartphone

- Sui dispositivi touch la partita (e la demo) parte a schermo intero, in verticale e in orizzontale.
- Musica e suoni sono accesi di base sugli smartphone e restano spenti sui computer; la scelta fatta con i pulsanti viene ricordata.
- Schermo intero in verticale: barra, indicatori compatti, campo e controller disposti in colonna.

## 2026-10-29 — Gamepad virtuale per smartphone

- Comandi touch in stile gioco Android: joystick mobile a sinistra (destra/sinistra, in basso per abbassarsi) e pulsanti rotondi a destra per Salta, Lama/Spara, Scatto e Impulso; Arma, Mezzo e Mira compaiono quando servono. Più dita insieme e breve vibrazione alla pressione.
- In orizzontale il gamepad è semitrasparente sopra il campo e la partita parte a schermo intero; in verticale diventa un pannello sotto il campo.
- In orizzontale pulsanti e joystick restano molto trasparenti finché non si toccano.
- Opzione «Comandi touch sovrapposti al gioco (joystick)» nelle impostazioni per tornare alla barra classica; suggerimenti del tutorial aggiornati.

## 2026-10-29 — Musica e suoni separati

- Due interruttori indipendenti nella barra e nelle impostazioni: «Musica» (sottofondo, anche nel menu) e «Suoni» (effetti del gioco).
- Scelte ricordate nel browser; dopo un ricaricamento l’audio riparte al primo clic o tasto, come richiesto dai browser. Spenti alla prima visita.

## 2026-10-29 — Riprendi accanto a Nuova partita

- Con una partita salvata, «Riprendi la partita» compare sulla stessa riga di «Nuova partita», che si restringe; sui telefoni «Guarda la demo» va a capo.

## 2026-10-29 — Tema musicale originale

- Nuovo tema «Custodi del 2148» generato in tempo reale con Web Audio, senza file audio: riff in minore orecchiabile, con tritono e seconda bemolle per un tono inquieto.
- Quattro sezioni che si alternano (introduzione, tema, tema con eco di campanelli, pausa da carillon); tonalità e tempo diversi per ciascun mondo.
- La musica si ferma in pausa, nell’officina, a scheda nascosta e con l’opzione «Musica dei mondi» disattivata; segue il volume generale.
- Eliminati i clic udibili all’avvio di suoni ed effetti (guadagno iniziale a zero).

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
