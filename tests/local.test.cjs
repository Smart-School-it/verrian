/* Local public data: legacy migration, recoverable errors, idempotent results and 10-bit replay. */
'use strict';const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),L=require(root+'/assets/verrian/local-state.js'),C=require(root+'/assets/verrian/core.js'),config=JSON.parse(fs.readFileSync(root+'/games/verrian/levels.json','utf8'));let n=0;const ok=(v,s)=>{assert.ok(v,s);n++};
const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const state=L.create({storage,revision:'test-revision',maxInputs:C.MAX_REPLAY,maxInput:C.MAX_INPUT,now:()=>10000000});
const result=(score=100)=>({...new C.World(config,2).result(),score});
values.set(L.KEYS.results,JSON.stringify({records:[{difficulty:'adventure',score:90},{difficulty:'bad',score:1}],history:[{score:15,difficulty:'adventure'},{score:10,difficulty:'adventure',assessment:{bosses:1,won:false},completed_at:'2026-10-28T12:00:00Z'}]}));
ok(state.results().history.length===1,'Una riga incompleta non cancella quelle valide');ok(state.results().records.length===1,'Record di modalità ignote scartati');
let a=state.saveResult(result(100),'run-first-123');ok(a.saved&&a.best,'Record migliorato annunciato prima di aggiornare il precedente');
a=state.saveResult(result(100),'run-second-123');ok(a.saved&&!a.best,'Parità non è un nuovo record');
a=state.saveResult(result(70),'run-third-123');ok(a.saved&&!a.best,'Punteggio inferiore non abbassa il record');ok(state.results().records[0].score===100,'Record conservato');
const count=state.results().history.length;a=state.saveResult(result(100),'run-first-123');ok(a.saved&&a.duplicate&&state.results().history.length===count,'Ripetere il salvataggio dello stesso risultato non duplica lo storico');
const write=storage.setItem;storage.setItem=()=>{throw Error('Quota')};a=state.saveResult(result(200),'run-quota-123');ok(!a.saved,'Errore di scrittura comunicato');ok(state.results().records[0].score===100,'Record persistente invariato se fallisce la scrittura');storage.setItem=write;
a=state.saveResult(result(200),'run-quota-123');ok(a.saved&&a.best&&state.results().records[0].score===200,'Riprova conserva il risultato e riconosce il record');
values.set(L.KEYS.results,'{invalid');ok(state.results().history.length===0,'JSON non valido recuperato senza eccezione');
const masks=[0,1,2,4,8,128,192,256,264,512,520,1023],packed=L.pack(masks,C.MAX_REPLAY,C.MAX_INPUT);ok(JSON.stringify(L.unpack(packed,C.MAX_REPLAY,C.MAX_INPUT))===JSON.stringify(masks),'Gli input diagonali a 10 bit sopravvivono alla codifica');
for(const value of [[1024],[-1],[1.5]]){let rejected=false;try{L.pack(value,C.MAX_REPLAY,C.MAX_INPUT)}catch{rejected=true}ok(rejected,'Input non ammessi rifiutati');}
for(const value of ['%%%=', 'AQ==','////']){let rejected=false;try{L.unpack(value,C.MAX_REPLAY,C.MAX_INPUT)}catch{rejected=true}ok(rejected,'Replay non valido rifiutato');}
const run={id:'run-resume-123',seed:2,difficulty:'arcade',inputs:masks};ok(state.saveRun(run),'Bozza scritta');let loaded=state.run();ok(loaded.status==='ready'&&loaded.data.difficulty==='arcade','Bozza pronta con difficoltà originale');ok(JSON.stringify(loaded.data.inputs)===JSON.stringify(masks),'Tutti i bit recuperati');
ok(L.create({storage,revision:'other-revision'}).run().status==='incompatible','Regole cambiate non ripristinano replay vecchi');
let raw=JSON.parse(values.get(L.KEYS.run));raw.seed=3;values.set(L.KEYS.run,JSON.stringify(raw));ok(state.run().status==='invalid','Modifica accidentale della bozza rilevata');state.saveRun(run);
state.clearRun('different-run');ok(state.run().status==='ready','Una scheda non cancella la bozza di un’altra partita');state.clearRun(run.id);ok(state.run().status==='empty','La bozza corretta viene eliminata');
state.savePreferences({effects:false,difficulty:'arcade'});ok(state.preferences().effects===false&&state.preferences().difficulty==='arcade','Preferenze ricordate');state.savePreferences({effects:'yes',difficulty:'wrong'});ok(state.preferences().effects===false&&state.preferences().difficulty==='arcade','Preferenze non valide ignorate');
// Reconstruct real engine states from a replay crossing a world boundary and a workshop.
const fixture=JSON.parse(fs.readFileSync(root+'/tests/fixtures/verrian-win.json','utf8')),bytes=Array.from(Buffer.from(fixture.replay,'base64'));
const original=new C.World(config,fixture.seed,fixture.difficulty);let checkpoint;
for(let i=0;i<bytes.length;i++){original.step(bytes[i]);if(original.levelIndex===1&&i>100){checkpoint=i+1;break;}}
ok(checkpoint>0,'La prova raggiunge davvero il secondo mondo');const prefix=bytes.slice(0,checkpoint);state.saveRun({id:'run-world-two-123',seed:fixture.seed,difficulty:fixture.difficulty,inputs:prefix});const snapshot=state.run().data,recovered=new C.World(config,snapshot.seed,snapshot.difficulty);for(const input of snapshot.inputs)recovered.step(input);ok(JSON.stringify(recovered.result())===JSON.stringify(original.result()),'Mondo, punti, equipaggiamento e statistiche ripristinati');ok(JSON.stringify(recovered.player)===JSON.stringify(original.player),'Posizione, velocità, salute, armi e mezzo identici');ok(recovered.rng===original.rng,'Sequenza casuale conservata');
const before=new C.World(config,1),steps=Array.from({length:45},(_,i)=>i%3?2:C.AIM_UP|8);for(const m of steps)before.step(m);state.saveRun({id:'run-diagonal-123',seed:1,difficulty:'adventure',inputs:steps});const after=new C.World(config,1);for(const m of state.run().data.inputs)after.step(m);ok(JSON.stringify(before.player)===JSON.stringify(after.player),'Ripresa con input diagonali reale e deterministica');
const blocked=L.create({storage:{getItem(){throw Error('Denied')},setItem(){throw Error('Denied')},removeItem(){throw Error('Denied')}},revision:'test'});ok(blocked.results().history.length===0&&!blocked.saveResult(result(),'run-blocked-123').saved,'Storage indisponibile gestito senza interrompere il gioco');
console.log(n+' controlli Verrian salvataggi superati.');
