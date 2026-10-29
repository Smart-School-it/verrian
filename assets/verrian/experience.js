/* Presentation and controls shared by the two renderers; no scoring rules. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f();else g.VerrianExperience=f();})(globalThis,()=>{
'use strict';
const ACTIONS={left:{bit:1,key:'ArrowLeft',name:'Sinistra'},right:{bit:2,key:'ArrowRight',name:'Destra'},jump:{bit:4,key:'Space',name:'Salto'},attack:{bit:8,key:'KeyJ',name:'Attacco'},dash:{bit:16,key:'KeyK',name:'Scatto'},pulse:{bit:32,key:'KeyL',name:'Impulso'},weapon:{bit:64,key:'KeyQ',name:'Cambia arma'},crouch:{bit:128,key:'ArrowDown',name:'Abbassati'},aimUp:{bit:256,key:'KeyR',name:'Mira su'},aimDown:{bit:512,key:'KeyF',name:'Mira giù'}};
const DEFAULT_MAP={ArrowLeft:1,KeyA:1,ArrowRight:2,KeyD:2,ArrowUp:4,KeyW:4,Space:4,KeyJ:8,KeyX:8,KeyK:16,ShiftLeft:16,ShiftRight:16,KeyL:32,KeyC:32,KeyQ:64,KeyE:64,ArrowDown:128,KeyS:128,KeyR:256,KeyF:512};
const validKey=code=>typeof code==='string'&&/^(Key[A-OQ-Z]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right))$/.test(code);
function keymap(custom={}){const map={...DEFAULT_MAP};for(const [action,code]of Object.entries(custom)){const a=ACTIONS[action];if(!a||!validKey(code))continue;for(const k of Object.keys(map))if(map[k]===a.bit)delete map[k];map[code]=a.bit;}return map;}
function binding(custom,action,code){if(!ACTIONS[action]||!validKey(code))return false;const m=keymap(custom);return !m[code]||m[code]===ACTIONS[action].bit;}
const keyLabel=code=>({ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'Spazio',ShiftLeft:'Shift sx',ShiftRight:'Shift dx'}[code]||code.replace('Key',''));
const QUALITY={low:{particles:.3,fps:30},standard:{particles:.7,fps:60},high:{particles:1,fps:60}};
const HINTS=[
 {id:'move',title:'Esplora le rovine',text:'Muoviti con ← → oppure A e D. Su touch usa le frecce.',done:w=>Math.abs(w.player.x-100)>80},
 {id:'jump',title:'Supera gli ostacoli',text:'Spazio o ↑ per saltare. Premi ancora in aria per il doppio salto.',done:w=>w.player.jumps>0},
 {id:'attack',title:'Difendi il codice',text:'J o X per attaccare. Tre fendenti di seguito spezzano gli scudi.',done:w=>w.player.attack>0||w.kills>0},
 {id:'dash',title:'Schiva e contrattacca',text:'K o Shift per lo scatto. Su touch apri ⋯ e scegli Scatto.',done:w=>w.player.dash>0||w.dodges>0},
 {id:'node',title:'Riattiva il primo nodo',text:'Avvicinati al nodo luminoso: diventa un checkpoint e ti ripara.',done:w=>w.relays>0}
];
function hint(world,seen=[]){if(world.levelIndex!==0||world.shop)return null;return HINTS.find(h=>!seen.includes(h.id))||null;}
function padInput(pad){if(!pad||pad.mapping&&pad.mapping!=='standard')return {mask:0,pause:false};const down=n=>!!pad.buttons?.[n]?.pressed;let mask=0;const x=pad.axes?.[0]||0;if(x<-.3||down(14))mask|=1;if(x>.3||down(15))mask|=2;if(down(0)||down(12))mask|=4;if(down(2))mask|=8;if(down(1))mask|=16;if(down(3))mask|=32;if(down(4))mask|=64;if(down(13)||(pad.axes?.[1]||0)>.65)mask|=128;if(down(5))mask|=192;if(down(6))mask|=512;if(down(7))mask|=256;return {mask,pause:down(9)};}
const BADGES=[{id:'node',name:'Riaccendi la rete',text:'Attiva almeno un nodo.',test:r=>r.relays>0},{id:'boss',name:'Guardiano del codice',text:'Sconfiggi il primo boss.',test:r=>r.bosses>0},{id:'rescue',name:'Soccorso digitale',text:'Libera almeno un tecnico.',test:r=>r.rescues>0},{id:'victory',name:'Speranza per il 2148',text:'Completa tutti i mondi.',test:r=>r.won===true}];
function achievements(history,earned=[]){const ids=new Set(earned);for(const row of history||[])for(const b of BADGES)if(b.test(row.assessment||{}))ids.add(b.id);return [...ids].filter(id=>BADGES.some(b=>b.id===id));}
return {ACTIONS,DEFAULT_MAP,validKey,keymap,binding,keyLabel,QUALITY,HINTS,hint,padInput,BADGES,achievements};
});
