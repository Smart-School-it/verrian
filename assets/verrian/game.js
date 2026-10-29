(async()=>{'use strict';const root=document.getElementById('verrian');if(!root)return;const $=id=>document.getElementById('vr-'+id),C=VerrianCore,config=JSON.parse($('config').textContent),fmt=n=>Number(n).toLocaleString('it-IT');
// WebGL (PixiJS) by default on a hardware-accelerated GPU; Canvas 2D when WebGL is missing, only emulated in software, fails to start or loses its context. ?renderer=canvas|pixi forces one.
const query=new URLSearchParams(location.search),forced=query.get('renderer'),gpu=(forced==='canvas'||forced==='pixi')?false:(()=>{try{const c=document.createElement('canvas'),o={failIfMajorPerformanceCaveat:true},gl=c.getContext('webgl2',o)||c.getContext('webgl',o);gl?.getExtension('WEBGL_lose_context')?.loseContext();return !!gl;}catch{return false;}})();
let pixi=forced!=='canvas'&&(forced==='pixi'||gpu),renderer;if(pixi)try{await VerrianGraphics.webgl($('webgl-scripts'));}catch(e){pixi=false;console.warn('Verrian: uso Canvas 2D.',e);}
function canvasFallback(reason){if(!pixi)return renderer;pixi=false;console.warn('Verrian: grafica Canvas 2D di riserva.',reason);const old=$('canvas'),fresh=old.cloneNode(true),effects=renderer.effects,h=renderer.h||renderer,profile={quality:h.quality,particleScale:h.particleScale,shakeEnabled:h.shakeEnabled,flashEnabled:h.flashEnabled,keyLabels:h.keyLabels};old.replaceWith(fresh);renderer=new VerrianRenderer(fresh);Object.assign(renderer,profile);renderer.effects=effects;renderer.onProgress=updateLoading;renderer.ready.then(updateLoading);fitView();renderer.reset(world);renderer.prepareWorld?.(world.level);if(running&&!paused)fresh.focus({preventScroll:true});return renderer;}
try{renderer=pixi?new VerrianPixiRenderer($('canvas')):new VerrianRenderer($('canvas'));}catch(e){if(!pixi){$('status').textContent=e.message;$('start').disabled=$('demo').disabled=true;return;}pixi=false;renderer=new VerrianRenderer($('canvas'));}
if(pixi){renderer.ready=renderer.ready.catch(e=>canvasFallback(e).ready);$('canvas').addEventListener('webglcontextlost',e=>canvasFallback(e),{once:true});}
let world=new C.World(config,1),data=null,inputs=[],running=false,paused=false,demo=false,busy=false,keys=new Set(),touch=new Map(),pulse=0,acc=0,last=0,hudAt=0,bannerTimer=0,sound=false,storageWarning=false,runSeed=0,runId=null,pendingResult=null,runRules='relaxed-shop',map={...VerrianExperience.DEFAULT_MAP},padMask=0,padPause=false,drawAt=0,guideKey='';const lobby=$('overlay').innerHTML;let stopStory=()=>{};
const say=text=>{$('status').textContent=text;};
function state(value){root.dataset.state=value;}
const audioSystem=VerrianAudio.create();
function soundEvent(type,e){audioSystem.event(type,e);}
function setAudio(){ $('audio').setAttribute('aria-pressed',String(sound));$('audio').textContent='Suoni: '+(sound?'on':'off');}
function refocus(){if(running&&!paused)$('canvas').focus({preventScroll:true});}
function clearControls(){keys.clear();touch.clear();pulse=0;}
function persist(){
 if(demo||!runId)return;
 const saved=localState.saveRun({id:runId,seed:runSeed,difficulty:world.difficulty,inputs,finished:world.ended,reason:world.reason,rules:runRules});
 if(!saved&&!storageWarning){storageWarning=true;say('Ripresa locale non disponibile: il browser non riesce a salvare. Mantieni aperta questa pagina.');}
 if(saved)storageWarning=false;
}
function record(){const mode=$('difficulty')?.value||world.difficulty||'adventure',r=data?.records?.find(r=>r.difficulty===mode);$('record').textContent='Record personale: '+(r?fmt(r.score)+' punti':'—');if(!data?.history?.length){$('history').textContent='Le partite concluse su questo dispositivo compariranno qui.';return;}const list=document.createElement('ol');for(const r of [...data.history].reverse().slice(0,5)){const li=document.createElement('li');li.textContent=fmt(r.score)+' punti · '+(r.difficulty==='arcade'?'Arcade':'Avventura')+' · '+r.assessment.bosses+' boss · '+new Date(r.completed_at).toLocaleString('it-IT')+(r.assessment.won?' · Sistema ripristinato':'');list.append(li);}$('history').replaceChildren(list);}
function banner(text){clearTimeout(bannerTimer);$('banner').textContent=text;$('banner').classList.add('is-visible');bannerTimer=setTimeout(()=>$('banner').classList.remove('is-visible'),2300);}
// The HUD only touches the DOM when a value changes, so style and layout work stays off the frame budget.
const shown={},text=(id,v)=>{v=String(v);if(shown[id]!==v){shown[id]=v;$(id).textContent=v;}},css=(id,k,v)=>{const key=id+k;if(shown[key]!==v){shown[key]=v;$(id).style[k]=v;}};
function hud(){const p=world.player,level=world.level,boss=world.enemies.find(e=>e.type==='boss');text('health',p.hp+' / '+world.maxHp());css('health-bar','transform','scaleX('+p.hp/world.maxHp()+')');text('lives',p.lives);text('energy',p.energy);text('score',String(world.score).padStart(6,'0'));text('level',(world.levelIndex+1)+' / '+config.levels.length);const sec=Math.max(0,Math.ceil((C.MAX_TICKS-world.clock)/30));text('credits',world.credits+(p.medkits?' · KIT '+p.medkits:''));text('time',Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0'));const nextNode=world.nodes.find(n=>!n.active);text('nodes','Nodi '+world.nodes.filter(n=>n.active).length+' / '+world.nodes.length+(nextNode?' · Prossimo '+(nextNode.x<p.x-40?'←':nextNode.x>p.x+40?'→':'')+(nextNode.y<p.y-65?' ↑':''):''));text('objective-text',boss?.stun>0?'Boss vulnerabile · danni ×2':boss?.windup>0?'Attacco in arrivo · preparati a schivare':world.bossDefeated?'Attraversa il varco':world.bossSpawned?'Sconfiggi il guardiano corrotto':world.nodes.every(n=>n.active)?'Raggiungi il varco del boss':'Riattiva i nodi di ripristino');text('zone','0'+(world.levelIndex+1)+' / '+level.title.toUpperCase());text('briefing',level.story);text('combat',(C.WEAPONS[p.weapon]?.name||'').toUpperCase()+(p.weapon==='blaster'&&p.aim?(p.aim<0?' · MIRA DIAGONALE ALTA':' · MIRA DIAGONALE BASSA'):'')+(p.vehicle?' · '+C.VEHICLES[p.vehicle].name.toUpperCase()+(p.vehicle==='jetpack'?' '+Math.round(p.fuel/C.JET_FUEL*100)+'%':''):'')+' · '+(p.overdrive?'OVERDRIVE · '+Math.ceil(p.overdrive/30)+'s':p.attack||world.tick<p.comboUntil?'COMBO '+p.combo+' / 3':'COMBO · TERZO COLPO POTENTE'));for(const b of root.querySelectorAll('[data-aim]')){const up=b.dataset.aim==='up',active=p.weapon==='blaster';if(b.hidden!==!active)b.hidden=!active;const pressed=active&&p.aim===(up?-1:1);if(b.getAttribute('aria-pressed')!==String(pressed))b.setAttribute('aria-pressed',String(pressed));const label=(up?(p.face>0?'↗':'↖'):(p.face>0?'↘':'↙'))+' Mira '+(up?'su':'giù');if(b.textContent!==label)b.textContent=label;}for(const b of root.querySelectorAll('[data-context]'))b.hidden=b.dataset.context==='weapon'?p.weapons.length<2:p.vehicles.length===0;const attack=root.querySelector('.vr-attack'),attackLabel=p.weapon==='blaster'?'Spara':p.weapon==='blade'?'Lama':'Attacca';if(attack&&attack.textContent!==attackLabel)attack.textContent=attackLabel;if(shown.od!==p.overdrive>0){shown.od=p.overdrive>0;$('combat').classList.toggle('is-overdrive',shown.od);}text('dash-label',p.dashCooldown?'SCATTO IN RICARICA':'SCATTO PRONTO');css('dash-bar','width',(1-p.dashCooldown/60)*100+'%');updateGuide();updateRoute();const bossStatus=boss?.stun>0?'vulnerable':boss?.windup>0?'attacking':'normal';if(root.dataset.bossStatus!==bossStatus)root.dataset.bossStatus=bossStatus;if(shown['--vr-cyan']!==level.color){shown['--vr-cyan']=level.color;root.style.setProperty('--vr-cyan',level.color);}}
function setup(seed,difficulty,replay=[],level=0,finished=false){stopStory();world=new C.World(config,seed,difficulty,level,{relaxedShop:runRules==='relaxed-shop'});for(const input of replay)world.step(input);if(finished&&!world.ended)world.finish('retired');inputs=[...replay];clearControls();renderer.reset(world);renderer.prepareWorld?.(world.level);acc=0;running=true;paused=false;$('overlay').hidden=true;$('pause').disabled=false;$('pause').textContent=demo?'Esci dalla demo':'Pausa';$('mode').textContent=demo?'DEMO · NESSUN SALVATAGGIO':difficulty==='arcade'?'MODALITÀ ARCADE':'MODALITÀ AVVENTURA';state('playing');hud();$('canvas').focus({preventScroll:true});root.scrollIntoView({block:'start',behavior:renderer.reduced?'instant':'smooth'});if(world.ended)finish();else{banner(replay.length?'AVVENTURA RIPRISTINATA':world.level.title.toUpperCase());say(demo?'Demo automatica. Usa Esci dalla demo per prendere il comando.':'Esplora, salta e riattiva i nodi. La lama colpisce davanti a Verrian.');}}
// Public edition (data-mode="public", e.g. verrian.verri.edu.it): no account and no server; records stay in this browser.
const publicMode=root.dataset.mode==='public';
const coreVersion=new URL(document.querySelector('script[src*="verrian/core.js"]').src).searchParams.get('v')||'dev';
const revisionFor=core=>VerrianLocal.hash(JSON.stringify({core,tick_rate:config.tick_rate,max_ticks:config.max_ticks,levels:config.levels}));const localRevision=revisionFor(coreVersion);
let browserStorage;try{browserStorage=localStorage;}catch{browserStorage={getItem(){throw new DOMException('Storage unavailable','SecurityError');},setItem(){throw Error('Storage unavailable');},removeItem(){throw Error('Storage unavailable');}};}
const localState=VerrianLocal.create({storage:browserStorage,revision:localRevision,maxInputs:C.MAX_REPLAY,maxInput:C.MAX_INPUT,legacyRevisions:[revisionFor('7df298af24f8')]});
let preferences=localState.preferences();if(preferences.effects!==null&&!renderer.reduced)renderer.effects=preferences.effects;
function publicData(){return localState.results();}
function savePublicResult(){
 if(!pendingResult)return;
 const outcome=localState.saveResult(pendingResult,runId);data=outcome.data;
 if(outcome.saved){
  localState.clearRun(runId);pendingResult=null;runId=null;rememberAchievements();
  $('verification').textContent=(outcome.best?'Nuovo record personale! ':'')+'Punti e record salvati in questo browser.';
  $('retry-save').hidden=true;$('back').textContent='Nuova avventura →';say('Avventura conclusa: '+fmt(world.score)+' punti salvati.');
 }else{
  $('verification').textContent='Risultato non salvato: il browser non consente la scrittura. I punti restano in questa scheda; riprova il salvataggio.';
  $('retry-save').hidden=false;$('back').textContent='Nuova partita · risultato non salvato';say('Salvataggio non riuscito. Usa Riprova il salvataggio prima di chiudere la pagina.');
 }
 record();
}
async function begin(resume=false){
 if(busy)return;busy=true;$('start')?.setAttribute('disabled','');$('resume-local')?.setAttribute('disabled','');
 try{
  if(publicMode){
   const snapshot=resume?localState.run():null;
   if(resume&&snapshot.status!=='ready')throw Error('Questa partita non è più disponibile. Puoi avviarne una nuova.');
   const saved=snapshot?.data,seed=saved?.seed||(crypto.getRandomValues(new Uint32Array(1))[0]||1),difficulty=saved?.difficulty||$('difficulty').value;
   say(resume?'Ripristino della partita…':'Caricamento delle risorse di gioco…');
   await renderer.ready;
   demo=false;pendingResult=null;runId=saved?.id||crypto.randomUUID();runSeed=seed;runRules=saved?.rules||'relaxed-shop';
   localState.savePreferences({difficulty});
   setup(seed,difficulty,saved?.inputs||[],0,saved?.finished||false);
   if(!world.ended)persist();
   return;
  }

 }catch(e){say(e.message);}finally{busy=false;$('start')?.removeAttribute('disabled');$('resume-local')?.removeAttribute('disabled');}
}
async function startDemo(level=0){if(busy)return;if(running&&!demo){say('Metti in pausa e concludi la tua avventura prima di avviare una demo.');return;}busy=true;try{await renderer.ready;demo=true;setup(2,'adventure',[],level);}finally{busy=false;}}
function offerResume(){
 if(publicMode){
  $('resume-local')?.remove();const snapshot=localState.run();
  if(snapshot.status==='ready'){
   const b=document.createElement('button');b.id='vr-resume-local';b.type='button';b.className='vr-secondary vr-resume-button';
   b.textContent=snapshot.data.finished?'Recupera il risultato della partita':'Riprendi la partita';b.onclick=()=>begin(true);
   $('start').closest('.vr-launch-actions').before(b);$('start').textContent='Nuova partita';
   $('cover-note').textContent='Partita conservata in questo browser · '+new Date(snapshot.data.updated_at).toLocaleString('it-IT')+'. Nuova partita sostituisce questa bozza.';
  }else if(snapshot.status==='incompatible')$('cover-note').textContent='La bozza appartiene a una versione precedente del gioco. Puoi iniziare una nuova partita; i record sono conservati.';
  else if(snapshot.status==='invalid'||snapshot.status==='unavailable')$('cover-note').textContent='Ripresa locale non disponibile. Puoi iniziare una nuova partita.';
  return;
 }
}

function bindLobby(){
 stopStory();stopStory=VerrianPrologue.mountStory({element:$('welcome-story'),story:config.description,reducedMotion:renderer.reduced});
 if(publicMode){$('difficulty').value=localState.preferences().difficulty;offerResume();}
 $('start').onclick=()=>begin();$('demo').onclick=()=>startDemo();$('difficulty').onchange=()=>{if(publicMode)localState.savePreferences({difficulty:$('difficulty').value});record();};
}
function lobbyScreen(){shopKey='';$('shop').hidden=true;root.removeAttribute('data-shop');running=false;paused=false;demo=false;clearControls();runId=null;runSeed=0;world=new C.World(config,1);renderer.reset(world);$('overlay').innerHTML=lobby;$('overlay').hidden=false;$('pause').disabled=true;$('pause').textContent='Pausa';state('idle');bindLobby();hud();record();$('mode').textContent='IL SISTEMA ATTENDE UN GUARDIANO';$('start').focus({preventScroll:true});}
function pause(){if(!running||world.ended)return;if(demo){lobbyScreen();say('Demo conclusa. Ora puoi prendere il comando.');return;}paused=!paused;clearControls();audioSystem.scene(world.levelIndex,!paused);persist();$('pause').textContent=paused?'Riprendi':'Pausa';$('overlay').hidden=!paused;state(paused?'paused':'playing');if(paused){$('overlay').innerHTML='<div class="vr-result"><p class="vr-eyebrow">SISTEMA IN ATTESA</p><h2>Riprendi fiato, guardiano.</h2><p>Il tempo è fermo. L’avventura ti aspetta.</p><button class="vr-launch" type="button" id="vr-resume">Riprendi l’avventura</button><br><button type="button" class="vr-secondary" id="vr-retire">Concludi e salva i punti</button></div>';$('resume').onclick=pause;$('retire').onclick=()=>{if(inputs.length){world.finish('retired');finish();}else lobbyScreen();};$('resume').focus({preventScroll:true});say('Avventura in pausa.');}else{acc=0;$('canvas').focus({preventScroll:true});say('Avventura ripresa.');}}
function finish(){shopKey='';$('shop').hidden=true;root.removeAttribute('data-shop');running=false;paused=false;clearControls();hud();persist();state('done');$('pause').disabled=true;$('overlay').hidden=false;const r=world.result();$('overlay').innerHTML='<div class="vr-result"><p class="vr-eyebrow">'+(demo?'DEMO · NESSUN SALVATAGGIO':r.won?'IL CODICE È DI NUOVO LIBERO':'OGNI GUARDIANO SI RIALZA')+'</p><h2>'+(r.won?'Il sistema è salvo.':r.reason==='retired'?'Missione conclusa.':r.reason==='timeout'?'Tempo esaurito.':'Verrian tornerà.')+'</h2><div class="vr-result-score">'+fmt(r.score)+' <small>punti</small></div><div class="vr-result-grid"><div><strong>'+r.bosses+' / '+config.levels.length+'</strong><small>BOSS</small></div><div><strong>'+r.shards+'</strong><small>FRAMMENTI</small></div><div><strong>'+r.relays+'</strong><small>NODI</small></div><div><strong>'+r.kills+'</strong><small>BUG SCONFITTI</small></div></div><p class="vr-combat-result">'+r.parries+' proiettili deviati · '+r.finishers+' fendenti conclusivi · catena massima '+(r.best_chain||0)+' · '+(r.dodges||0)+' schivate perfette · '+(r.stuns||0)+' boss storditi</p><p class="vr-combat-result">'+(r.rescues||0)+' tecnici liberati · '+(r.caches||0)+' tesori · '+(r.secrets||0)+' passaggi segreti · '+(r.vehicles||0)+' mezzi · '+(r.purchases||0)+' acquisti in officina ('+(r.spent||0)+' crediti)</p><p id="vr-verification">'+(demo?'Demo terminata. Nessun punteggio registrato.':'')+'</p><button type="button" class="vr-launch" id="vr-back">'+(demo?'Prendi il comando →':'Nuova avventura →')+'</button><br><button type="button" class="vr-secondary" id="vr-retry-save" hidden>Riprova il salvataggio</button></div>';$('back').onclick=()=>{if(publicMode&&pendingResult){localState.clearRun(runId);pendingResult=null;runId=null;data=publicData();}lobbyScreen();};$('retry-save').onclick=savePublicResult;if(!demo){pendingResult=r;savePublicResult();}else say('Demo terminata. Nessun risultato registrato.');if(r.won)soundEvent('win');$('back').focus({preventScroll:true});}

bindLobby();state('idle');renderer.reset(world);hud();$('pause').onclick=pause;$('audio').onclick=async()=>{try{sound=await audioSystem.toggle();setAudio();if(sound)soundEvent('relay');refocus();}catch{say('Audio non disponibile in questo browser.');}};$('fx').setAttribute('aria-pressed',String(renderer.effects));$('fx').textContent='Effetti: '+(renderer.effects?'on':'off');$('fx').onclick=()=>{renderer.effects=renderer.reduced?false:!renderer.effects;root.dataset.effects=renderer.effects?'on':'off';preferences.effects=renderer.effects;if(publicMode)localState.savePreferences({effects:renderer.effects});$('fx').setAttribute('aria-pressed',String(renderer.effects));$('fx').textContent='Effetti: '+(renderer.effects?'on':'off');refocus();};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else say('Schermo intero non disponibile. Prova i comandi del browser.');}catch{say('Il browser non consente lo schermo intero.');}};// In fullscreen the view widens to the screen's proportions (up to 32:9) instead of leaving side bars.
function fitView(){
 const full=document.fullscreenElement===root,portraitTouch=matchMedia('(pointer:coarse)').matches&&innerWidth<=700&&innerHeight>innerWidth;
 const width=portraitTouch?768:full?Math.max(C.W,Math.min(2560,Math.round(C.H*innerWidth/innerHeight/2)*2)):C.W;
 renderer.resize?.(width);root.style.setProperty('--vr-view-ratio',width+'/'+C.H);
}
fitView();window.addEventListener('resize',fitView);
document.addEventListener('fullscreenchange',()=>{fitView();$('fullscreen').setAttribute('aria-pressed',String(!!document.fullscreenElement));$('fullscreen').title=document.fullscreenElement?'Esci dallo schermo intero':'Schermo intero';$('fullscreen').querySelector('span').textContent=document.fullscreenElement?'Riduci':'Espandi';refocus();});
window.addEventListener('keydown',e=>{if(!running||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]')||e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();if(!e.repeat)pause();return;}if(!paused&&(['PageDown','PageUp'].includes(e.code)||demo&&e.code==='ArrowDown')){e.preventDefault();return;}if(demo||paused||e.target.closest('button,a,summary'))return;if(map[e.code]){e.preventDefault();keys.add(e.code);if(!e.repeat)pulse|=map[e.code];}});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{clearControls();if(running&&!paused&&!demo)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearControls();if(running&&!paused&&!demo)pause();}});window.addEventListener('pagehide',persist);window.addEventListener('online',()=>{if(pendingResult)savePublicResult();});
$('touch-more').onclick=()=>{const open=$('touch-more').getAttribute('aria-expanded')!=='true';$('touch-more').setAttribute('aria-expanded',String(open));$('touch-extra').hidden=!open;clearControls();};
for(const b of root.querySelectorAll('[data-control]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(!running||paused||demo)return;touch.set(e.pointerId,+b.dataset.control);pulse|=+b.dataset.control;b.setPointerCapture(e.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>touch.delete(e.pointerId));b.addEventListener('click',e=>{if(e.detail!==0||!running||paused||demo)return;const m=+b.dataset.control;pulse|=m;touch.set('keyboard',m);setTimeout(()=>touch.delete('keyboard'),160);});}
// Clicks in the workshop become queued key presses, recorded like any other input.
const menuQueue=[];
function getInput(){if(menuQueue.length&&world.shop)return menuQueue.shift();menuQueue.length=0;let mask=pulse|padMask;pulse=0;for(const k of keys)mask|=map[k]||0;for(const v of touch.values())mask|=v;return mask;}
function pilot(){const w=world,p=w.player,l=w.level;
 // Workshop: buy the first useful affordable item in a fixed order, then continue.
 if(w.shop){if(w.tick%2)return 0;const want=['armor1','medkit','armor2','gauntlets','cell','life'].find(id=>!w.shopBlock(id)),s=w.shop;if(!want)return 16;const at=s.items.indexOf(want);return at===s.index?8:2;}let mask=8;const node=w.nodes.find(n=>!n.active);let target=node?node.x:l.exit_x+70;
 let toward=0;if(w.bossSpawned&&!w.bossDefeated){const boss=w.enemies.find(e=>e.type==='boss');if(boss){
  // Keep the distance that suits the weapon, outside the boss's body, and face it.
  const body=w.body(boss),half=(body[2]-body[0])/2,wp=w.weapon(),side=p.x<boss.x?-1:1,dist=wp.ranged?250:half+Math.min(wp.reach,130)*.5;target=boss.x+side*dist;toward=-side;if(wp.ranged&&Math.abs(boss.x-p.x)>150&&Math.abs(boss.x-p.x)<340)target=p.x;
  if(Math.abs(boss.x-p.x)<dist+80){if(p.hp<=3&&p.energy&&w.tick%45===0)mask|=32;if(w.hazards.some(h=>!h.friendly&&Math.abs(h.x-p.x)<150&&h.kind!=='beam'&&h.kind!=='mine')&&p.grounded&&w.tick%2===0)mask|=4;}
  if(w.hazards.some(h=>h.kind==='beam'&&h.age<34&&Math.abs(h.x-p.x)<60))target=p.x+(p.x<boss.x?-90:90);
  if((boss.charge>0||boss.windup>0&&boss.windup<6)&&Math.abs(boss.x-p.x)<half+110&&!p.dashCooldown&&p.grounded){mask|=16;toward=-side;target=boss.x-side*(half+80);}}}
 let dx=target-p.x;if(toward&&Math.abs(dx)<=15&&p.face!==toward)dx=toward*16;if(node&&node.y>p.y+60&&Math.abs(dx)<=15)dx=60;if(dx>15)mask|=2;else if(dx< -15)mask|=1;
 // Search supported terrain ahead and jump over pits / spikes.
 const ahead=p.x+(dx>=0?1:-1)*35,support=l.platforms.some(q=>q[0]<ahead&&q[0]+q[2]>ahead&&q[1]>=p.y-5&&q[1]<p.y+100);
 const trap=l.traps.some(t=>ahead>t[0]-25&&ahead<t[0]+t[2]+25&&p.y>t[1]-100);
 // From a raised platform with ground below, step down instead of leaping: the pit jump then starts from the ground with both jumps.
 const below=l.platforms.some(q=>q[0]<ahead&&q[0]+q[2]>ahead&&q[1]>p.y+5);
 if(p.grounded&&((!support&&!below)||trap))mask|=4;
 if(!p.grounded&&p.jumps<2&&p.vy>0&&!support)mask|=4;
 if(node&&node.y<500&&Math.abs(p.x-node.x)<155){if(p.grounded)mask|=4;else if(p.vy>-3&&p.jumps===1)mask|=4;}
 // Low mites can only be hit crouching: duck and face them when one is close on the same floor.
 const mite=w.enemies.find(e=>e.type==='mite'&&Math.abs(e.x-p.x)<140&&Math.abs(e.y-p.y)<10);if(mite&&p.grounded){mask=(mask&~7)|128|8|(mite.x>p.x?(p.face>0?0:2):(p.face<0?0:1));}
 if((mask&4)&&(w.lastInput&4))mask&=~4;
 // Keep the button down while rising: jump height depends on how long it is held.
 if((w.lastInput&4)&&p.jumpHeld&&p.vy<-1)mask|=4;
 return mask;
}
let shopKey='';
/** Inline SVG selects the original item's alpha artwork without duplicating bitmap files. */
function shopArt(id){const f=VerrianArt.shopPose(id);if(!f)return null;const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),img=document.createElementNS(ns,'image');svg.classList.add('vr-shop-art');svg.setAttribute('viewBox',[f.x,f.y,f.w,f.h].join(' '));svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');img.setAttribute('href','assets/verrian/'+f.image+'.webp');img.setAttribute('width',f.atlasWidth);img.setAttribute('height',f.atlasHeight);const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),shape=document.createElementNS(ns,f.clip?'polygon':'rect'),key='vr-shop-art-'+id;clip.id=key;if(f.clip)shape.setAttribute('points',f.clip);else{shape.setAttribute('x',f.x);shape.setAttribute('y',f.y);shape.setAttribute('width',f.w);shape.setAttribute('height',f.h);}clip.append(shape);defs.append(clip);svg.append(defs);img.setAttribute('clip-path','url(#'+key+')');svg.append(img);return svg;}
function shopPanel(){const s=world.shop,panel=$('shop');if(!s){if(!panel.hidden){panel.hidden=true;panel.replaceChildren();shopKey='';root.removeAttribute('data-shop');}return;}
 const relaxed=world.relaxedShop&&world.difficulty==='adventure',left=Math.ceil((C.SHOP_TICKS-s.timer)/30),key=[s.index,world.credits,world.purchases,demo].join();if(key===shopKey){const timer=$('shop-countdown');if(timer&&timer.textContent!==String(left))timer.textContent=left;return;}const hadFocus=panel.contains(document.activeElement),scroll=panel.querySelector('.vr-shop-list')?.scrollTop||0;shopKey=key;panel.hidden=false;root.dataset.shop='open';const p=world.player,next=config.levels[s.next];
 const head=document.createElement('div');head.className='vr-shop-head';head.innerHTML='<h2 id="vr-shop-title"></h2><strong></strong>';head.querySelector('h2').textContent='Officina del nodo · verso '+next.title;head.querySelector('strong').textContent=world.credits+' crediti';
 const list=document.createElement('ul');list.className='vr-shop-list';s.items.forEach((id,i)=>{const it=C.SHOP.find(x=>x.id===id),why=world.shopBlock(id),li=document.createElement('li'),b=document.createElement('button');b.type='button';b.tabIndex=0;if(why)b.setAttribute('aria-disabled','true');b.setAttribute('aria-current',String(i===s.index));if(why)b.classList.add('is-blocked');
  const own=it.kind==='arma'?'':it.id==='medkit'?' · hai '+p.medkits:it.id==='life'?' · vite '+p.lives:it.id==='cell'?' · impulsi max '+p.maxEnergy:'';const art=shopArt(id),copy=document.createElement('span');copy.className='vr-shop-copy';copy.innerHTML='<span class="vr-shop-kind"></span><b></b><small></small><span class="vr-shop-price"></span>';copy.children[0].textContent=it.kind+own;copy.children[1].textContent=it.name;copy.children[2].textContent=it.text;copy.children[3].textContent=it.price+' crediti'+(why?' · '+why:'');b.dataset.item=id;if(art)b.append(art);b.append(copy);
  b.onclick=event=>{if(demo||!world.shop)return;if(why){say(why+'.');return;}const n=world.shop.items.length,steps=(i-world.shop.index+n)%n;for(let k=0;k<steps;k++)menuQueue.push(2,0);menuQueue.push(8,0);if(event.detail!==0)refocus();};li.append(b);list.append(li);});
 const foot=document.createElement('div');foot.className='vr-shop-foot';const help=document.createElement('span');help.append('← → scegli · Tab esplora · Invio o '+VerrianExperience.keyLabel(preferences.keys.attack||'KeyJ')+' acquista · '+VerrianExperience.keyLabel(preferences.keys.dash||'KeyK')+' continua. ');if(relaxed)help.append('Leggi con calma: il tempo di gioco è fermo.');else{help.append('Si chiude tra ');const timer=document.createElement('span');timer.id='vr-shop-countdown';timer.textContent=left;help.append(timer,' s');}const go=document.createElement('button');go.type='button';go.tabIndex=0;go.textContent='Continua verso '+next.title+' →';go.onclick=()=>{if(!demo&&world.shop){menuQueue.push(16,0);refocus();}};foot.append(help,go);panel.replaceChildren(head,list,foot);list.scrollTop=scroll;const selected=list.querySelector('[aria-current=true]');if(hadFocus&&selected)selected.focus({preventScroll:true});if(selected){const a=selected.getBoundingClientRect(),b=list.getBoundingClientRect();if(a.top<b.top)list.scrollTop-=b.top-a.top;else if(a.bottom>b.bottom)list.scrollTop+=a.bottom-b.bottom;}}
function events(){for(const e of world.events){renderer.event(e);soundEvent(e.type,e);if(e.type==='level'){renderer.reset(world);renderer.prepareWorld?.(world.level);hud();banner(world.level.title.toUpperCase()+'\nTotale: '+world.relays+' nodi · '+world.secrets+' segreti · '+world.rescues+' tecnici');say('Nuovo mondo: '+world.level.title+'. '+world.level.story);}if(e.type==='relay'){banner('NODO RIPRISTINATO');say('Nodo ripristinato. Checkpoint attivo, integrità e impulso recuperati.');}if(e.type==='boss'){banner(world.level.boss.name);say('Boss: '+world.level.boss.name+'.');}if(e.type==='weapon'){banner('NUOVA ARMA · '+e.name.toUpperCase());say('Nuova arma: '+e.name+'. Premi Q o E per cambiare arma.'+(e.weapon==='blaster'?' Tieni R o F con J/X per sparare in diagonale verso l’alto o il basso.':''));}if(e.type==='weapon-switch')say('Arma: '+e.name+'.');if(e.type==='vehicle'){banner('NUOVO MEZZO · '+e.name.toUpperCase());say('Nuovo mezzo: '+e.name+'. '+C.VEHICLES[e.vehicle].text+' Premi S o freccia giù insieme a Q per salire o scendere.');}if(e.type==='vehicle-switch')say(e.vehicle?'Mezzo: '+e.name+'.':'A piedi.');if(e.type==='rescue'){banner('TECNICO LIBERATO');say('Tecnico liberato: 35 crediti e due punti integrità recuperati.');}if(e.type==='cache'){banner('TESORO RECUPERATO');say('Cassa aperta: 50 crediti per l’officina.');}if(e.type==='spring')say('Pedana di lancio: usa le frecce per guidare il salto.');if(e.type==='speed')say('Accelerazione: premi la direzione opposta per frenare, oppure abbassati.');if(e.type==='secret'){banner('PASSAGGIO SEGRETO');say('Hai aperto un passaggio segreto: +300 punti e 40 crediti.');}if(e.type==='shop-open'){renderer.prepareWorld?.(config.levels[world.shop.next]);banner('OFFICINA');say('Officina del nodo: '+world.credits+' crediti. Frecce per scegliere, J per acquistare, K per continuare.');}if(e.type==='shop-close')$('canvas').focus({preventScroll:true});if(e.type==='shop-move'){const it=C.SHOP.find(x=>x.id===world.shop.items[e.index]),why=world.shopBlock(it.id);say(it.name+', '+it.price+' crediti'+(why?'. '+why:'')+'.');}if(e.type==='shop-buy')say('Acquistato: '+e.name+'. Restano '+world.credits+' crediti.');if(e.type==='shop-denied')say(e.reason+'.');if(e.type==='medkit')say('Nanokit attivato: integrità ripristinata.');if(e.type==='boss-stun')say('Boss vulnerabile: per pochi secondi subisce danni doppi.');if(e.type==='boss-down'){banner('VARCO APERTO');say('Boss sconfitto. Attraversa il varco per proseguire.');}if(e.type==='overdrive'){banner('OVERDRIVE · LAMA ACCELERATA');say('Overdrive attivo per nove secondi: fendenti più rapidi.');}if(e.type==='blocked'&&world.tick%90<30)say('Scudo: attacca dall’alto o usa il terzo fendente della combo.');if(e.type==='locked')say('Riattiva tutti i nodi di questo mondo prima di raggiungere il boss.');if(e.type==='damage')say('Integrità: '+world.player.hp+' su '+world.maxHp()+'.');if(e.type==='death')say('Checkpoint ripristinato. Vite rimaste: '+world.player.lives+'.');if(e.type.startsWith('shop-'))shopPanel();if(!demo&&['relay','shop-buy','shop-close'].includes(e.type))persist();}}
// Settings, onboarding and devices affect presentation/inputs, never the scoring state.
let capturingKey=null;
function applyPreferences(){
 const h=renderer.h||renderer,quality=VerrianExperience.QUALITY[preferences.quality];
 h.quality=preferences.quality;h.particleScale=quality.particles;h.shakeEnabled=preferences.shake&&!renderer.reduced;h.flashEnabled=preferences.flashes&&!renderer.reduced;
 if(preferences.effects!==null)renderer.effects=preferences.effects&&!renderer.reduced;
 if(!h.shakeEnabled){h.trauma=0;h.shake=0;}if(!h.flashEnabled)h.white=0;
 h.keyLabels={weapon:VerrianExperience.keyLabel(preferences.keys.weapon||'KeyQ'),vehicle:VerrianExperience.keyLabel(preferences.keys.crouch||'ArrowDown')+' + '+VerrianExperience.keyLabel(preferences.keys.weapon||'KeyQ')};root.dataset.effects=renderer.effects?'on':'off';audioSystem.configure(preferences);map=VerrianExperience.keymap(preferences.keys);
 $('quality').value=preferences.quality;$('volume').value=preferences.volume;$('volume-value').textContent=preferences.volume+'%';
 for(const key of ['ambient','shake','flashes','tutorial','gamepad'])$(key).checked=preferences[key];
 $('fx').setAttribute('aria-pressed',String(renderer.effects));$('fx').textContent='Effetti: '+(renderer.effects?'on':'off');
 for(const [action,entry]of Object.entries(VerrianExperience.ACTIONS)){
  let b=$('key-grid').querySelector('[data-action="'+action+'"]');
  if(!b){b=document.createElement('button');b.type='button';b.className='vr-secondary';b.dataset.action=action;b.onclick=()=>{capturingKey=action;$('settings-feedback').textContent='Premi il nuovo tasto per '+entry.name.toLowerCase()+'. Esc annulla.';};$('key-grid').append(b);}
  b.textContent=entry.name+' · '+VerrianExperience.keyLabel(preferences.keys[action]||entry.key);b.setAttribute('aria-label','Cambia tasto: '+b.textContent);
 }
 updateGuide();
}
function changePreferences(patch){preferences={...preferences,...patch};const saved=localState.savePreferences(patch);applyPreferences();$('settings-feedback').textContent=saved?'Preferenze salvate.':'Preferenze applicate a questa sessione; il browser non riesce a salvarle.';clearControls();shopKey='';}
function updateLoading(){const element=$('loading');if(!element)return;const p=(renderer.h||renderer).progress;if(!p)return;element.hidden=p.loaded>=p.total;$('loading-progress').max=p.total;$('loading-progress').value=p.loaded;$('loading-text').textContent='Caricamento immagini · '+p.loaded+' / '+p.total;}
function updateGuide(){
 const box=$('coach');if(!box)return;
 if(!running||paused||demo||world.shop||!preferences.tutorial){box.hidden=true;return;}
 let h=VerrianExperience.hint(world,preferences.tutorialSeen);
 while(h&&h.done(world)){preferences.tutorialSeen=[...preferences.tutorialSeen,h.id];localState.savePreferences({tutorialSeen:preferences.tutorialSeen});h=VerrianExperience.hint(world,preferences.tutorialSeen);}
 box.hidden=!h;if(!h)return;if(guideKey===h.id)return;guideKey=h.id;
 $('coach-title').textContent=h.title;let description=h.text;
 for(const [action,phrase]of [['jump','Spazio o ↑'],['attack','J o X'],['dash','K o Shift']])if(preferences.keys[action])description=description.replace(phrase,VerrianExperience.keyLabel(preferences.keys[action]));
 if(h.id==='move'&&(preferences.keys.left||preferences.keys.right))description='Muoviti con '+VerrianExperience.keyLabel(preferences.keys.left||'ArrowLeft')+' e '+VerrianExperience.keyLabel(preferences.keys.right||'ArrowRight')+'. Su touch usa le frecce.';$('coach-text').textContent=description;
}
function updateRoute(){
 const route=$('route');if(!route)return;const level=world.level;
 if(route.dataset.level!==level.id){route.dataset.level=level.id;route.replaceChildren();for(const node of world.nodes){const i=document.createElement('i');i.style.left=(node.x/level.width*100)+'%';i.setAttribute('aria-hidden','true');route.append(i);}const marker=document.createElement('b');marker.setAttribute('aria-hidden','true');route.append(marker);}
 const percent=Math.round(Math.max(0,Math.min(100,world.player.x/level.width*100)));
 if(route.getAttribute('aria-valuenow')!==String(percent)){route.setAttribute('aria-valuenow',String(percent));route.querySelector('b').style.left=percent+'%';}
 [...route.querySelectorAll('i')].forEach((dot,i)=>dot.classList.toggle('is-active',world.nodes[i].active));
}
function pollGamepad(){
 let pads=[];try{pads=preferences.gamepad&&navigator.getGamepads?[...navigator.getGamepads()]:[];}catch{}
 const input=VerrianExperience.padInput(pads.find(p=>p?.connected&&(p.mapping==='standard'||!p.mapping)));
 const allowed=!document.querySelector('dialog[open]')&&!document.hidden;
 padMask=allowed?input.mask:0;if(allowed&&running&&input.pause&&!padPause)pause();padPause=input.pause;
}
function rememberAchievements(){
 const earned=VerrianExperience.achievements(data?.history,preferences.achievements);
 if(earned.join()!==preferences.achievements.join()){preferences.achievements=earned;localState.savePreferences({achievements:earned});}
 const list=$('achievements-list');list.replaceChildren();
 for(const badge of VerrianExperience.BADGES){const card=document.createElement('article'),icon=document.createElement('span'),name=document.createElement('strong'),text=document.createElement('small');const done=earned.includes(badge.id);card.className=done?'is-earned':'';icon.textContent=done?'✦':'◇';icon.setAttribute('aria-hidden','true');name.textContent=badge.name;text.textContent=(done?'Sbloccato · ':'Da scoprire · ')+badge.text;card.append(icon,name,text);list.append(card);}
}
function initializeExperience(){
 applyPreferences();const h=renderer.h||renderer;h.onProgress=updateLoading;updateLoading();renderer.ready.then(updateLoading);
 $('settings').onclick=()=>{if(running&&!paused)pause();clearControls();applyPreferences();$('settings-dialog').showModal();};
 $('settings-dialog').addEventListener('close',()=>{capturingKey=null;clearControls();});
 $('quality').onchange=()=>changePreferences({quality:$('quality').value});$('volume').oninput=()=>changePreferences({volume:Number($('volume').value)});
 for(const key of ['ambient','shake','flashes','tutorial','gamepad'])$(key).onchange=()=>changePreferences({[key]:$(key).checked});
 $('keys-reset').onclick=()=>changePreferences({keys:{}});$('tutorial-reset').onclick=()=>{guideKey='';changePreferences({tutorial:true,tutorialSeen:[]});};
 $('coach-dismiss').onclick=()=>{changePreferences({tutorial:false});refocus();};
 document.addEventListener('keydown',e=>{
  if(!capturingKey||!$('settings-dialog').open)return;e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
  if(e.code==='Escape'){capturingKey=null;$('settings-feedback').textContent='Cambio tasto annullato.';return;}
  if(!VerrianExperience.binding(preferences.keys,capturingKey,e.code)){$('settings-feedback').textContent='Tasto riservato o già utilizzato da un’altra azione. Scegli un altro tasto.';return;}
  const action=capturingKey;capturingKey=null;changePreferences({keys:{...preferences.keys,[action]:e.code}});$('key-grid').querySelector('[data-action="'+action+'"]').focus();
 },true);
 $('shop').addEventListener('keydown',e=>{
  if(!world.shop||paused||demo)return;let target=null;
  if(e.key==='ArrowLeft'||e.key==='ArrowUp')target=(world.shop.index+world.shop.items.length-1)%world.shop.items.length;
  if(e.key==='ArrowRight'||e.key==='ArrowDown')target=(world.shop.index+1)%world.shop.items.length;
  if(e.key==='Home')target=0;if(e.key==='End')target=world.shop.items.length-1;
  if(target===null)return;e.preventDefault();e.stopPropagation();let steps=(target-world.shop.index+world.shop.items.length)%world.shop.items.length;while(steps--)menuQueue.push(2,0);
 });
}

// ?fps=1 shows frames per second and drawing time, to compare the Canvas and WebGL renderers on real machines.
const meter=query.has('fps')?Object.assign(document.createElement('div'),{className:'vr-meter'}):null,meterStats={n:0,draw:0,worst:0,at:0};if(meter){meter.setAttribute('aria-hidden','true');$('board').append(meter);}
let dialogAt=0;
function frame(at){const dt=Math.min(.1,Math.max(0,(at-last)/1000||0));last=at;pollGamepad();audioSystem.scene(world.levelIndex,running&&!paused&&!document.hidden&&!world.shop);const drawStart=meter?performance.now():0;// Platform dialogs pause the game; the page-wide lookup runs four times a second, not every frame.
 if(running&&!paused&&!demo&&at-dialogAt>250){dialogAt=at;if(document.querySelector('dialog[open]'))pause();}if(running&&!paused&&!document.hidden){const hold=Math.min(dt,renderer.hitstop);renderer.hitstop-=hold;const slow=renderer.slow>0&&!renderer.reduced?.35:1;renderer.slow=Math.max(0,(renderer.slow||0)-dt);acc+=(dt-hold)*slow;while(acc>=1/30&&running){const input=demo?pilot():getInput();if(!demo&&world.relaxedShop&&world.difficulty==='adventure'&&world.shop&&input===world.lastInput){acc-=1/30;continue;}world.step(input);if(!demo)inputs.push(input);events();acc-=1/30;if(!demo&&world.tick%60===0)persist();if(world.ended)finish();}if(at-hudAt>100){hudAt=at;hud();shopPanel();}}let drew=false;if(!document.hidden&&root.dataset.state!=='idle'&&at-drawAt>=1000/VerrianExperience.QUALITY[preferences.quality].fps-1){renderer.draw(world,running&&!paused?acc*30:1,Math.min(.15,(at-drawAt)/1000||dt),!running);drawAt=at;drew=true;}if(meter&&drew){const cost=performance.now()-drawStart;meterStats.n++;meterStats.draw+=cost;meterStats.worst=Math.max(meterStats.worst,cost);if(at-meterStats.at>1000){meter.textContent=(pixi?'WebGL (PixiJS)':'Canvas 2D')+' · '+Math.round(meterStats.n*1000/(at-meterStats.at))+' fps · disegno '+(meterStats.draw/meterStats.n).toFixed(1)+' ms (max '+meterStats.worst.toFixed(1)+')';Object.assign(meterStats,{n:0,draw:0,worst:0,at});}}requestAnimationFrame(frame);}
initializeExperience();$('start').disabled=false;$('demo').disabled=false;requestAnimationFrame(frame);
data=publicData();record();rememberAchievements();
})().catch(error=>{console.error(error);const status=document.getElementById('vr-status');if(status)status.textContent='Avvio non riuscito. Ricarica la pagina per riprovare.';});
