/* Student-made levels: one world, cleaned, checked and packed into a shareable code. Shared by the editor, the game and the tests. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f();else g.VerrianLevels=f();})(globalThis,()=>{
'use strict';
// Themes reuse the official worlds: background, music, boss look and boss attacks follow the world index.
const THEMES=[{id:'neon-frontier',name:'Milano · Frontiera al neon',color:'#71e9ff',secondary:'#4576ed',boss:'N.U.L.L. · Il predatore del bus',attack:'carica a testa bassa'},{id:'memory-forge',name:'Forgia della memoria',color:'#ffbb78',secondary:'#ba4c81',boss:'SEGFAULT · Il divoratore di memoria',attack:'sfere dall’alto e colpi mirati'},{id:'glitch-depths',name:'Abisso dei glitch',color:'#bc9aff',secondary:'#4267e5',boss:'DEADLOCK · Il guardiano dei cicli',attack:'ventaglio di tre colpi'},{id:'kernel-citadel',name:'Cittadella del kernel',color:'#79f4c3',secondary:'#3589cc',boss:'KERNEL PANIC · La corruzione finale',attack:'raggi dal suolo e colpi mirati'}];
const ENEMIES={crawler:'Strisciante',drone:'Drone',sentinel:'Sentinella con scudo',phase:'Spettro di fase',leaper:'Saltatore',mite:'Acaro',turret:'Torretta',wraith:'Fantasma volante'},FLYING=new Set(['drone','wraith']);
const PICKUPS={shard:'Frammento',health:'Integrità +3',energy:'Impulso',overdrive:'Overdrive',credits:'Crediti',vehicle:'Mezzo'},VEHICLES={glider:'Ali di plasma',jetpack:'Zaino a reazione',bike:'Moto a levitazione'};
const GROUND=520,FORMAT='verrian-level',VERSION=1,PREFIX='1.',LIMITS={platforms:200,relays:8,enemies:80,traps:60,pickups:300,movers:30,vents:20,lasers:20,secrets:10,encounters:20,pads:20};
const has=(o,k)=>typeof k==='string'&&Object.hasOwn(o,k),int=(v,a,b,d)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(a,Math.min(b,n)):d;};
// Text ends up in banners and screen-reader messages: plain characters only, no markup or control codes.
const str=(v,max,d='')=>{const s=String(v??'').replace(/[\u0000-\u001f\u007f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);return s||d;};
const color=(v,d)=>/^#[0-9a-f]{6}$/i.test(String(v))?String(v).toLowerCase():d;
const list=(v,max,map)=>(Array.isArray(v)?v:[]).slice(0,max).map(map).filter(Boolean);
function clean(input){
 const src=input&&typeof input==='object'?input:{},raw=src.format===FORMAT?src.level||{}:src,theme=int(src.theme??THEMES.findIndex(t=>t.id===raw.id),0,3,0),t=THEMES[theme],width=int(raw.width,1600,8000,4200),X=v=>int(v,0,width,0),Y=v=>int(v,-1600,GROUND+100,GROUND);
 const level={id:t.id,title:str(raw.title,60,'Il mio livello'),story:str(raw.story,160,'Un mondo costruito da un guardiano del laboratorio.'),color:color(raw.color,t.color),secondary:color(raw.secondary,t.secondary),width,
  platforms:list(raw.platforms,LIMITS.platforms,q=>Array.isArray(q)&&[int(q[0],-200,width,0),Y(q[1]),int(q[2],20,width+200,100),int(q[3],10,400,20)]),
  relays:list(raw.relays,LIMITS.relays,q=>q&&{x:X(q.x),y:Y(q.y)}),
  enemies:list(raw.enemies,LIMITS.enemies,q=>{if(!q||!has(ENEMIES,q.type))return null;const x=X(q.x),fixed=q.type==='turret',min=fixed?x:Math.min(x,X(q.min??x-100)),max=fixed?x:Math.max(x,X(q.max??x+100));return {type:q.type,x,y:Y(q.y),min,max};}),
  traps:list(raw.traps,LIMITS.traps,q=>Array.isArray(q)&&[X(q[0]),Y(q[1]),int(q[2],20,400,60)]),
  pickups:list(raw.pickups,LIMITS.pickups,q=>{if(!q||!has(PICKUPS,q.kind))return null;const p={kind:q.kind,x:X(q.x),y:Y(q.y)};if(q.kind==='vehicle'){if(!has(VEHICLES,q.vehicle))return null;p.vehicle=q.vehicle;}return p;}),
  gate_x:0,exit_x:0,boss:null,
  movers:list(raw.movers,LIMITS.movers,q=>q&&{x:X(q.x),y:Y(q.y),width:int(q.width,40,300,110),axis:q.axis==='x'?'x':'y',amplitude:int(q.amplitude,0,300,50),period:int(q.period,60,600,180)}),
  vents:list(raw.vents,LIMITS.vents,q=>q&&{x:X(q.x),y:Y(q.y),width:int(q.width,30,200,60)}),
  lasers:list(raw.lasers,LIMITS.lasers,q=>{if(!q)return null;const period=int(q.period,60,600,180);return {x:X(q.x),y:Y(q.y),width:int(q.width,20,300,85),height:int(q.height,10,300,42),period,on:int(q.on,10,period-25,40),offset:int(q.offset,0,period,0)};}),
  secrets:list(raw.secrets,LIMITS.secrets,q=>q&&{x:X(q.x),y:Y(q.y),width:int(q.width,20,80,34),height:int(q.height,40,300,150)}),
  encounters:list(raw.encounters,LIMITS.encounters,q=>q&&(q.kind==='technician'||q.kind==='cache')&&{kind:q.kind,x:X(q.x),y:Y(q.y)}),
  pads:list(raw.pads,LIMITS.pads,q=>{if(!q)return null;if(q.kind==='speed')return {kind:'speed',x:X(q.x),y:Y(q.y),width:int(q.width,40,300,120),direction:Number(q.direction)<0?-1:1};if(q.kind==='spring')return {kind:'spring',x:X(q.x),y:Y(q.y),width:int(q.width,30,200,56),power:int(q.power,10,30,20)};return null;})};
 level.exit_x=int(raw.exit_x,700,width-40,width-130);level.gate_x=int(raw.gate_x,300,level.exit_x-300,level.exit_x-590);
 const b=raw.boss||{};level.boss={name:str(b.name,60,t.boss),hp:int(b.hp,10,80,30),x:int(b.x,level.gate_x+150,level.exit_x-100,level.exit_x-220),y:GROUND};
 return {format:FORMAT,version:VERSION,theme,author:str(src.author,30,''),level};
}
const top=(level,x,y,tol=3)=>level.platforms.some(q=>x>=q[0]&&x<=q[0]+q[2]&&Math.abs(q[1]-y)<=tol);
const floorAt=(level,x)=>level.platforms.find(q=>q[1]===GROUND&&q[0]<=x&&q[0]+q[2]>=x);
// Errors stop a test run (the engine would get stuck); warnings only point out probable mistakes.
function check(pack){
 const L=pack.level,errors=[],warnings=[],add=(a,text,x)=>a.push({text,x});
 if(!floorAt(L,100))add(errors,'Serve un suolo all’altezza 520 sotto la partenza di Verrian (x = 100).',100);
 const arena=floorAt(L,L.gate_x);if(!arena||arena[0]+arena[2]<L.exit_x)add(errors,'L’arena del boss richiede un suolo continuo dal varco del boss all’uscita.',L.gate_x);
 if(!L.relays.length)add(errors,'Aggiungi almeno un nodo: il varco del boss si apre quando sono tutti attivi.',L.gate_x);
 for(const n of L.relays){if(n.x>=L.gate_x-20)add(errors,'Un nodo si trova oltre il varco del boss: spostalo prima del varco.',n.x);else if(!top(L,n.x,n.y))add(warnings,'Un nodo non poggia su una piattaforma.',n.x);}
 for(const e of L.enemies){if(!FLYING.has(e.type)&&!top(L,e.x,e.y))add(warnings,ENEMIES[e.type]+' sospeso nel vuoto: appoggialo su una piattaforma.',e.x);if(e.x>L.gate_x-40&&e.x<L.exit_x)add(warnings,ENEMIES[e.type]+' dentro l’arena del boss.',e.x);}
 for(const q of L.encounters)if(!top(L,q.x,q.y))add(warnings,(q.kind==='technician'?'Una capsula del tecnico':'Una cassa')+' non poggia su una piattaforma.',q.x);
 const floors=L.platforms.filter(q=>q[1]===GROUND).sort((a,b)=>a[0]-b[0]);
 for(let i=1;i<floors.length;i++){const a=floors[i-1][0]+floors[i-1][2],b=floors[i][0];if(b-a>260&&!L.platforms.some(q=>q[1]<GROUND&&q[0]<b&&q[0]+q[2]>a)&&!L.movers.some(m=>m.x+m.width>a&&m.x<b))add(warnings,'Buca larga '+(b-a)+' px senza appigli: forse impossibile da saltare.',a);}
 if(!L.pickups.some(p=>p.kind==='shard'))add(warnings,'Nessun frammento da raccogliere.',200);
 return {ok:!errors.length,errors,warnings};
}
// A starting point for an empty level: ground, a node, the arena.
function blank(theme=0){return clean({format:FORMAT,theme,level:{title:'Il mio livello',width:3000,platforms:[[0,GROUND,1200,200],[1400,GROUND,1600,200],[520,410,200,20]],relays:[{x:900,y:GROUND}],enemies:[{type:'crawler',x:700,y:GROUND,min:560,max:1100}],pickups:[{kind:'shard',x:580,y:368},{kind:'shard',x:660,y:368}],gate_x:2000,exit_x:2870}});}
const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
const unb64=text=>{const s=atob(text.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0));};
async function pipe(bytes,stream){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());}
// Short code for links: compressed JSON, URL-safe base64. Codes stay in the #fragment, so they never reach the server.
async function encode(pack){const json=JSON.stringify(clean(pack));return PREFIX+b64(await pipe(new TextEncoder().encode(json),new CompressionStream('deflate-raw')));}
async function decode(code){
 const text=String(code||'').trim().replace(/^.*[#&]livello=/,'');if(!text.startsWith(PREFIX)||text.length>60000)throw Error('Codice del livello non riconosciuto.');
 let json;try{json=new TextDecoder().decode(await pipe(unb64(text.slice(PREFIX.length)),new DecompressionStream('deflate-raw')));}catch{throw Error('Codice del livello incompleto o danneggiato.');}
 if(json.length>400000)throw Error('Livello troppo grande.');return clean(JSON.parse(json));
}
async function fromHash(hash){const m=/[#&]livello=([^&]+)/.exec(hash||'');return m?decode(decodeURIComponent(m[1])):null;}
// Custom runs keep the player's preferences but play and save everything else in memory, away from the official records.
function sandboxStorage(real,shared){const mem=new Map();return {getItem:k=>k===shared?real.getItem(k):mem.has(k)?mem.get(k):null,setItem:(k,v)=>k===shared?real.setItem(k,v):mem.set(k,String(v)),removeItem:k=>k===shared?real.removeItem(k):mem.delete(k)};}
return {THEMES,ENEMIES,FLYING,PICKUPS,VEHICLES,GROUND,FORMAT,LIMITS,clean,check,blank,encode,decode,fromHash,sandboxStorage};
});
