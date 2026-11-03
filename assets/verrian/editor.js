/* Level editor: students draw one Verrian world, check it, save it in this browser and share it as a link. No server involved. */
(()=>{'use strict';
const V=VerrianLevels,$=id=>document.getElementById('ve-'+id),canvas=$('canvas'),c=canvas.getContext('2d'),map=$('map'),mc=map.getContext('2d');
const STORE='verrian.editor.v1',GROUND=V.GROUND,BG=['milano-duomo-v1','milano-centrale-v1','milano-navigli-v1','milano-castello-v1'];
// Feet-anchored body sizes from the engine, so what students see matches what Verrian collides with.
const BODY={crawler:[70,44],drone:[64,56],sentinel:[52,100],phase:[52,104],leaper:[58,62],mite:[44,22],turret:[60,70],wraith:[58,78]},BOSS=[[150,190],[180,170],[150,210],[160,220]];
const TINT={crawler:'#ff6b8a',drone:'#ffb347',sentinel:'#8fa8ff',phase:'#c58cff',leaper:'#7dffb0',mite:'#ff9d5c',turret:'#ffd166',wraith:'#b8f3ff'},PICK={shard:'#7ff6ff',health:'#5dff9a',energy:'#ffe45c',overdrive:'#ffb347',credits:'#ffd166',vehicle:'#d18cff'};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),snapOn=()=>$('snap').checked;
let pack,current=null,origin=null,session=null,saving=null,queued=false,savedJson='',tool='select',sel=null,undo=[],redo=[],drag=null,cam={x:0,y:-260,s:.5},pointer=null,dirty=0,images={},lastCheck={errors:[],warnings:[]};
const sub={enemies:'crawler',pickups:'shard',vehicle:'glider',pads:'spring',encounters:'technician'};
const L=()=>pack.level,grid=v=>snapOn()?Math.round(v/10)*10:Math.round(v);
// Highest platform top under (x,y), so nodes, enemies and traps land on a surface instead of floating.
function surface(x,y){let best=null;for(const q of L().platforms)if(x>=q[0]&&x<=q[0]+q[2]&&q[1]>=y-40&&(best===null||q[1]<best))best=q[1];return best!==null&&best-y<160?best:null;}
const feet=(x,y)=>{const s=surface(x,y);return [x,s??grid(y)];};
// One entry per kind of object: anchor point, box, editable fields and how a fresh one is made.
const num=(label,get,set,min,max,step=10)=>({label,get,set,min,max,step});
const pick=(label,get,set,options)=>({label,get,set,options});
const KINDS={
 platforms:{name:'Piattaforma',at:q=>[q[0],q[1]],put:(q,x,y)=>{q[0]=x;q[1]=y;},box:q=>[q[0],q[1],q[2],q[3]],w:[q=>q[2],(q,v)=>q[2]=Math.max(20,v)],h:[q=>q[3],(q,v)=>q[3]=Math.max(10,v)],fields:q=>[num('X',()=>q[0],v=>q[0]=v,-200,8000),num('Y (520 = suolo)',()=>q[1],v=>q[1]=v,-1600,620),num('Larghezza',()=>q[2],v=>q[2]=v,20,8200),num('Spessore',()=>q[3],v=>q[3]=v,10,400)]},
 relays:{name:'Nodo',feet:true,at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x-20,q.y-74,40,74],make:(x,y)=>({x,y}),fields:q=>[num('X',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620)]},
 enemies:{name:'Nemico',feet:q=>!V.FLYING.has(q.type),at:q=>[q.x,q.y],put:(q,x,y)=>{const d=x-q.x;q.x=x;q.y=y;if(q.type==='turret')q.min=q.max=x;else{q.min+=d;q.max+=d;}},box:q=>{const [w,h]=BODY[q.type];return [q.x-w/2,q.y-h,w,h];},make:(x,y)=>{const type=sub.enemies;return {type,x,y,min:type==='turret'?x:x-120,max:type==='turret'?x:x+120};},
  fields:q=>[pick('Tipo',()=>q.type,v=>{q.type=v;if(v==='turret')q.min=q.max=q.x;else if(q.min===q.max){q.min=q.x-120;q.max=q.x+120;}},V.ENEMIES),num('X',()=>q.x,v=>{const d=v-q.x;q.x=v;q.min+=d;q.max+=d;},0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620),...(q.type==='turret'?[]:[num('Pattuglia da X',()=>q.min,v=>q.min=Math.min(v,q.x),0,8000),num('Pattuglia fino a X',()=>q.max,v=>q.max=Math.max(v,q.x),0,8000)])]},
 traps:{name:'Trappola',feet:true,at:q=>[q[0],q[1]],put:(q,x,y)=>{q[0]=x;q[1]=y;},box:q=>[q[0],q[1]-16,q[2],16],w:[q=>q[2],(q,v)=>q[2]=clamp(v,20,400)],make:(x,y)=>[x-30,y,60],fields:q=>[num('X',()=>q[0],v=>q[0]=v,0,8000),num('Y',()=>q[1],v=>q[1]=v,-1600,620),num('Larghezza',()=>q[2],v=>q[2]=v,20,400)]},
 pickups:{name:'Oggetto',at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x-15,q.y-15,30,30],make:(x,y)=>{const p={kind:sub.pickups,x,y};if(p.kind==='vehicle')p.vehicle=sub.vehicle;return p;},
  fields:q=>[pick('Tipo',()=>q.kind,v=>{q.kind=v;if(v==='vehicle')q.vehicle=q.vehicle||sub.vehicle;else delete q.vehicle;},V.PICKUPS),...(q.kind==='vehicle'?[pick('Mezzo',()=>q.vehicle,v=>q.vehicle=v,V.VEHICLES)]:[]),num('X',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620)]},
 movers:{name:'Piattaforma mobile',at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x,q.y,q.width,18],w:[q=>q.width,(q,v)=>q.width=clamp(v,40,300)],make:(x,y)=>({x:x-55,y,width:110,axis:'y',amplitude:50,period:180}),
  fields:q=>[pick('Direzione',()=>q.axis,v=>q.axis=v,{y:'Su e giù',x:'Destra e sinistra'}),num('Ampiezza',()=>q.amplitude,v=>q.amplitude=v,0,300),num('Durata del giro (1/30 s)',()=>q.period,v=>q.period=v,60,600),num('Larghezza',()=>q.width,v=>q.width=v,40,300),num('X',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620)]},
 vents:{name:'Getto d’aria',feet:true,at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x-q.width/2,q.y-14,q.width,14],w:[q=>q.width,(q,v)=>q.width=clamp(v,30,200)],center:true,make:(x,y)=>({x,y,width:60}),fields:q=>[num('X (centro)',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620),num('Larghezza',()=>q.width,v=>q.width=v,30,200)]},
 lasers:{name:'Laser',feet:true,at:q=>[q.x,q.y+q.height],put:(q,x,y)=>{q.x=x;q.y=y-q.height;},box:q=>[q.x,q.y,q.width,q.height],w:[q=>q.width,(q,v)=>q.width=clamp(v,20,300)],make:(x,y)=>({x:x-42,y:y-42,width:85,height:42,period:180,on:40,offset:0}),
  fields:q=>[num('Ciclo (1/30 s)',()=>q.period,v=>{q.period=v;q.on=Math.min(q.on,v-25);},60,600),num('Acceso per (1/30 s)',()=>q.on,v=>q.on=Math.min(v,q.period-25),10,575,5),num('Ritardo (1/30 s)',()=>q.offset,v=>q.offset=v,0,600,5),num('Larghezza',()=>q.width,v=>q.width=v,20,300),num('Altezza',()=>q.height,v=>q.height=v,10,300),num('X',()=>q.x,v=>q.x=v,0,8000),num('Y (in alto)',()=>q.y,v=>q.y=v,-1600,620)]},
 secrets:{name:'Muro segreto',feet:true,at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x,q.y-q.height,q.width,q.height],w:[q=>q.width,(q,v)=>q.width=clamp(v,20,80)],make:(x,y)=>({x:x-17,y,width:34,height:150}),fields:q=>[num('X',()=>q.x,v=>q.x=v,0,8000),num('Y (base)',()=>q.y,v=>q.y=v,-1600,620),num('Larghezza',()=>q.width,v=>q.width=v,20,80),num('Altezza',()=>q.height,v=>q.height=v,40,300)]},
 encounters:{name:'Incontro',feet:true,at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>{const h=q.kind==='technician'?86:48;return [q.x-26,q.y-h,52,h];},make:(x,y)=>({kind:sub.encounters,x,y}),fields:q=>[pick('Tipo',()=>q.kind,v=>q.kind=v,{technician:'Tecnico da liberare',cache:'Cassa del tesoro'}),num('X',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620)]},
 pads:{name:'Pedana',feet:true,center:true,at:q=>[q.x,q.y],put:(q,x,y)=>{q.x=x;q.y=y;},box:q=>[q.x-q.width/2,q.y-10,q.width,10],w:[q=>q.width,(q,v)=>q.width=clamp(v,30,300)],make:(x,y)=>sub.pads==='speed'?{kind:'speed',x,y,width:120,direction:1}:{kind:'spring',x,y,width:56,power:20},
  fields:q=>[pick('Tipo',()=>q.kind,v=>{q.kind=v;if(v==='speed'){delete q.power;q.direction=1;}else{delete q.direction;q.power=20;}},{spring:'Pedana di lancio',speed:'Corsia di accelerazione'}),...(q.kind==='speed'?[pick('Verso',()=>String(q.direction),v=>q.direction=+v,{'1':'Verso destra','-1':'Verso sinistra'})]:[num('Potenza',()=>q.power,v=>q.power=v,10,30,1)]),num('Larghezza',()=>q.width,v=>q.width=v,30,300),num('X (centro)',()=>q.x,v=>q.x=v,0,8000),num('Y',()=>q.y,v=>q.y=v,-1600,620)]},
 boss:{name:'Boss',single:true,at:()=>[L().boss.x,GROUND],put:(_,x)=>{L().boss.x=clamp(x,L().gate_x+150,L().exit_x-100);},box:()=>{const [w,h]=BOSS[pack.theme];return [L().boss.x-w/2,GROUND-h,w,h];},fields:()=>[{label:'Nome',text:true,get:()=>L().boss.name,set:v=>L().boss.name=v,max:60},num('Energia',()=>L().boss.hp,v=>L().boss.hp=v,10,80,2),num('X',()=>L().boss.x,v=>KINDS.boss.put(0,v),0,8000)]},
 gate:{name:'Varco del boss',single:true,at:()=>[L().gate_x,GROUND],put:(_,x)=>{L().gate_x=clamp(x,300,L().exit_x-300);KINDS.boss.put(0,L().boss.x);},box:()=>[L().gate_x-14,GROUND-260,28,260],fields:()=>[num('X',()=>L().gate_x,v=>KINDS.gate.put(0,v),300,8000)]},
 exit:{name:'Uscita',single:true,at:()=>[L().exit_x,GROUND],put:(_,x)=>{L().exit_x=clamp(x,L().gate_x+300,L().width-40);KINDS.boss.put(0,L().boss.x);},box:()=>[L().exit_x-14,GROUND-260,28,260],fields:()=>[num('X',()=>L().exit_x,v=>KINDS.exit.put(0,v),700,8000)]}};
const ORDER=['platforms','movers','secrets','lasers','vents','pads','traps','encounters','relays','pickups','enemies'];
const objectOf=s=>s&&(KINDS[s.kind].single?s.kind:L()[s.kind][s.i]);
const isFeet=(k,o)=>typeof KINDS[k].feet==='function'?KINDS[k].feet(o):!!KINDS[k].feet;
const TOOLS={select:{label:'Seleziona e sposta',key:'v'},ground:{label:'Suolo',key:'g'},platforms:{label:'Piattaforma',key:'p'},relays:{label:'Nodo',key:'n'},enemies:{label:'Nemico',key:'e'},pickups:{label:'Oggetto',key:'o'},traps:{label:'Trappola',key:'t'},pads:{label:'Pedana',key:'d'},vents:{label:'Getto d’aria',key:'a'},movers:{label:'Piattaforma mobile',key:'m'},lasers:{label:'Laser',key:'l'},secrets:{label:'Muro segreto',key:'s'},encounters:{label:'Tecnico o cassa',key:'c'},erase:{label:'Gomma',key:'x'}};
const SUBS={enemies:V.ENEMIES,pickups:V.PICKUPS,pads:{spring:'Pedana di lancio',speed:'Corsia di accelerazione'},encounters:{technician:'Tecnico da liberare',cache:'Cassa del tesoro'}};

// ---- server: levels belong to the signed-in @verri.edu.it account; the browser only keeps a backup of unsaved changes
const BACKUP='verrian.editor.backup.v2';
async function api(path,body){const opts=body?{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':session?.csrf||''},body:JSON.stringify(body)}:{credentials:'same-origin',cache:'no-store'};let r;
 try{r=await fetch('/api/'+path,opts);}catch{throw Error('Server non raggiungibile: controlla la connessione.');}
 const d=await r.json().catch(()=>null);if(r.status===401){session.user=null;gate();}if(!r.ok||!d?.ok)throw Error(d?.error||'Servizio non disponibile, riprova tra poco.');return d;}
function backup(){try{localStorage.setItem(BACKUP,JSON.stringify({email:session?.user?.email,id:current,origin,pack,at:Date.now()}));}catch{}}
function dropBackup(){try{localStorage.removeItem(BACKUP);}catch{}}
function persist(){backup();$('saved').textContent='Modifiche da salvare…';clearTimeout(dirty);dirty=setTimeout(saveNow,1200);}
// One save at a time; changes made meanwhile are sent right after. Resolves with the level id.
async function saveNow(){clearTimeout(dirty);if(!pack||!session?.user)return current;if(saving){queued=true;return saving;}
 const json=JSON.stringify(pack);if(current&&json===savedJson)return current;
 saving=(async()=>{try{const d=await api('levels.php',{action:'save',id:current,pack,origin:current?null:origin});current=d.level.id;savedJson=json;if(JSON.stringify(pack)===json)dropBackup();
   $('saved').textContent='Salvato nel tuo account · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});return current;}
  catch(e){$('saved').textContent='Non salvato: '+e.message+' Le modifiche restano in questo browser.';throw e;}
  finally{saving=null;if(queued){queued=false;setTimeout(()=>saveNow().catch(()=>{}),50);}}})();
 return saving;}
function open(p,id=null,from=null){pack=V.clean(p);current=id;origin=from;savedJson=id?JSON.stringify(pack):'';sel=null;undo=[];redo=[];fit();levelForm();themeNote();changed(false);}

// ---- history
function commit(){undo.push(JSON.stringify(pack));if(undo.length>100)undo.shift();redo=[];}
function settle(){if(undo.length&&undo[undo.length-1]===JSON.stringify(pack))undo.pop();}
function back(stack,other){if(!stack.length)return;other.push(JSON.stringify(pack));pack=JSON.parse(stack.pop());if(sel&&!KINDS[sel.kind].single&&!L()[sel.kind][sel.i])sel=null;levelForm();changed();}
function changed(save=true){draw();props();checks();if(save)persist();}

// ---- view
function resize(){const r=canvas.parentElement.getBoundingClientRect(),d=devicePixelRatio||1;canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';const m=map.getBoundingClientRect();map.width=Math.round(m.width*d);map.height=Math.round(m.height*d);draw();}
const view=()=>({w:canvas.width/(devicePixelRatio||1),h:canvas.height/(devicePixelRatio||1)});
const toWorld=(sx,sy)=>[cam.x+sx/cam.s,cam.y+sy/cam.s];
function fit(){const {h}=view(),topY=Math.min(-80,...L().platforms.map(q=>q[1]))-140;cam.s=clamp(h/(GROUND+180-topY),.18,1.4);cam.y=topY;cam.x=-60;zoomLabel();}
function zoom(f,sx,sy){const {w,h}=view();sx??=w/2;sy??=h/2;const [wx,wy]=toWorld(sx,sy);cam.s=clamp(cam.s*f,.15,2);cam.x=wx-sx/cam.s;cam.y=wy-sy/cam.s;zoomLabel();draw();}
function zoomLabel(){$('zoom-value').textContent=Math.round(cam.s*100)+'%';}
function look(x){const {w}=view();cam.x=clamp(x-w/2/cam.s,-200,L().width);draw();}
function loadImage(name){if(images[name])return images[name];const img=new Image();img.onload=()=>draw();img.src='../assets/verrian/'+name+'.webp';return images[name]=img;}

// ---- drawing
function draw(){if(!pack)return;const d=devicePixelRatio||1,{w,h}=view(),lv=L(),t=V.THEMES[pack.theme];c.setTransform(d,0,0,d,0,0);
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#050b16');g.addColorStop(1,shade(lv.secondary,.18));c.fillStyle=g;c.fillRect(0,0,w,h);
 const img=loadImage(L().backdrop||BG[pack.theme]);if(img.complete&&img.naturalWidth){const s=Math.max(w/img.naturalWidth,h/img.naturalHeight);c.globalAlpha=.16;c.drawImage(img,(w-img.naturalWidth*s)/2,(h-img.naturalHeight*s)/2,img.naturalWidth*s,img.naturalHeight*s);c.globalAlpha=1;}
 c.save();c.scale(cam.s,cam.s);c.translate(-cam.x,-cam.y);
 const [x0,y0]=toWorld(0,0),[x1,y1]=toWorld(w,h),step=cam.s<.35?100:cam.s<.8?50:20;c.lineWidth=1/cam.s;
 c.strokeStyle='#ffffff0d';c.beginPath();for(let x=Math.floor(x0/step)*step;x<x1;x+=step){c.moveTo(x,y0);c.lineTo(x,y1);}for(let y=Math.floor(y0/step)*step;y<y1;y+=step){c.moveTo(x0,y);c.lineTo(x1,y);}c.stroke();
 c.fillStyle='#00000066';c.fillRect(-2000,y0,2000,y1-y0);c.fillRect(lv.width,y0,4000,y1-y0);c.fillStyle='#ff3b5c18';c.fillRect(0,720,lv.width,Math.max(0,y1-720));label('VUOTO: SI PERDE UNA VITA',20,750,'#ff8aa0',14);
 c.strokeStyle='#ffffff40';c.setLineDash([8/cam.s,8/cam.s]);c.beginPath();c.moveTo(0,GROUND);c.lineTo(lv.width,GROUND);c.stroke();c.setLineDash([]);
 c.fillStyle=lv.color+'14';c.fillRect(lv.gate_x,y0,lv.exit_x-lv.gate_x,y1-y0);label('ARENA DEL BOSS',lv.gate_x+16,GROUND-290,lv.color,16);
 for(const [i,q] of lv.platforms.entries()){const ground=q[1]===GROUND&&q[3]>=100;c.fillStyle=ground?'#0d1a2b':'#16314a';c.fillRect(q[0],q[1],q[2],q[3]);c.fillStyle=lv.color;c.fillRect(q[0],q[1],q[2],ground?6:4);c.strokeStyle=lv.secondary+'aa';c.strokeRect(q[0],q[1],q[2],q[3]);if(ground)for(let x=q[0]+30;x<q[0]+q[2]-10;x+=60){c.fillStyle='#ffffff10';c.fillRect(x,q[1]+30,30,6);}}
 for(const [i,m] of lv.movers.entries()){const ax=m.axis==='x';c.strokeStyle=lv.color+'66';c.setLineDash([6/cam.s,6/cam.s]);c.strokeRect(m.x-(ax?m.amplitude:0),m.y-(ax?0:m.amplitude),m.width+(ax?2*m.amplitude:0),18+(ax?0:2*m.amplitude));c.setLineDash([]);c.fillStyle='#2a5677';c.fillRect(m.x,m.y,m.width,18);c.fillStyle=lv.color;c.fillRect(m.x,m.y,m.width,4);label(ax?'⇆':'⇅',m.x+m.width/2-7,m.y+16,'#fff',16);}
 for(const [i,q] of lv.secrets.entries()){c.fillStyle='#4b2f6b';c.fillRect(q.x,q.y-q.height,q.width,q.height);c.strokeStyle='#c58cff';for(let y=q.y-q.height;y<q.y;y+=20)c.strokeRect(q.x,y,q.width,20);label('?',q.x+q.width/2-6,q.y-q.height/2+8,'#f1dcff',22);}
 for(const [i,q] of lv.lasers.entries()){c.fillStyle='#ff7a2f30';c.fillRect(q.x,q.y,q.width,q.height);c.strokeStyle='#ff9d5c';c.strokeRect(q.x,q.y,q.width,q.height);for(let x=q.x+8;x<q.x+q.width;x+=16){c.fillStyle='#ff9d5caa';c.fillRect(x,q.y,4,q.height);}label('LASER',q.x,q.y-6,'#ffbd8a',12);}
 for(const [i,q] of lv.vents.entries()){c.fillStyle='#1d6b4f';c.fillRect(q.x-q.width/2,q.y-14,q.width,14);c.fillStyle='#7dffb0';for(let k=-1;k<=1;k++){const x=q.x+k*q.width/3;c.beginPath();c.moveTo(x,q.y-70);c.lineTo(x-9,q.y-52);c.lineTo(x+9,q.y-52);c.fill();}}
 for(const [i,q] of lv.pads.entries()){const spring=q.kind==='spring';c.fillStyle=spring?'#ff5fc8':'#4fb8ff';c.fillRect(q.x-q.width/2,q.y-10,q.width,10);label(spring?'▲'.repeat(Math.max(1,Math.round(q.power/10))):q.direction>0?'»»':'««',q.x-12,q.y-16,c.fillStyle,16);}
 for(const [i,q] of lv.traps.entries()){c.fillStyle='#ff3b5c';c.beginPath();for(let x=q[0];x<q[0]+q[2];x+=14){c.moveTo(x,q[1]);c.lineTo(x+7,q[1]-16);c.lineTo(Math.min(x+14,q[0]+q[2]),q[1]);}c.fill();}
 for(const [i,q] of lv.encounters.entries()){const tech=q.kind==='technician',[bx,by,bw,bh]=KINDS.encounters.box(q);c.fillStyle=tech?'#1f5a8a':'#7a4b1d';round(bx,by,bw,bh,tech?20:6);c.fill();c.strokeStyle=tech?'#9ff0ff':'#ffd166';c.stroke();label(tech?'TECNICO':'CASSA',bx-4,by-6,c.strokeStyle,12);}
 for(const [i,n] of lv.relays.entries()){c.fillStyle='#173b55';c.fillRect(n.x-8,n.y-60,16,60);c.fillStyle=lv.color;c.beginPath();c.arc(n.x,n.y-62,12,0,7);c.fill();c.fillStyle='#ffffffcc';c.beginPath();c.arc(n.x,n.y-62,5,0,7);c.fill();label('NODO '+(i+1),n.x-24,n.y-82,lv.color,13);}
 for(const [i,p] of lv.pickups.entries()){c.fillStyle=PICK[p.kind];c.beginPath();if(p.kind==='shard'){c.moveTo(p.x,p.y-12);c.lineTo(p.x+8,p.y);c.lineTo(p.x,p.y+12);c.lineTo(p.x-8,p.y);}else c.arc(p.x,p.y,11,0,7);c.fill();if(p.kind!=='shard')label({health:'+',energy:'⚡',overdrive:'O',credits:'¢',vehicle:p.vehicle==='bike'?'M':p.vehicle==='jetpack'?'Z':'A'}[p.kind],p.x-5,p.y+5,'#06101c',14);}
 for(const [i,e] of lv.enemies.entries()){const [bx,by,bw,bh]=KINDS.enemies.box(e),col=TINT[e.type];if(e.type!=='turret'){c.strokeStyle=col+'88';c.lineWidth=3/cam.s;c.beginPath();c.moveTo(e.min,e.y+6);c.lineTo(e.max,e.y+6);c.stroke();c.fillStyle=col;c.fillRect(e.min-2,e.y,4,12);c.fillRect(e.max-2,e.y,4,12);c.lineWidth=1/cam.s;}c.fillStyle=col+'cc';round(bx,by,bw,bh,10);c.fill();c.fillStyle='#06101c';c.fillRect(e.x-12,by+bh*.3,6,6);c.fillRect(e.x+6,by+bh*.3,6,6);if(V.FLYING.has(e.type)){c.strokeStyle=col;c.setLineDash([4/cam.s,4/cam.s]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x,e.y+40);c.stroke();c.setLineDash([]);}label(V.ENEMIES[e.type].toUpperCase(),bx,by-6,col,11);}
 {const [bx,by,bw,bh]=KINDS.boss.box();c.fillStyle='#ff3b5c55';round(bx,by,bw,bh,24);c.fill();c.strokeStyle='#ff6b8a';c.lineWidth=3/cam.s;c.stroke();c.lineWidth=1/cam.s;label('BOSS',bx+bw/2-22,by+bh/2,'#ffd2db',22);label(lv.boss.name,bx-20,by-12,'#ff9db0',14);}
 line(lv.gate_x,'VARCO DEL BOSS','#ff6b8a','gate');line(lv.exit_x,'USCITA','#7dffb0','exit');
 c.fillStyle='#ffe45c';round(85,GROUND-84,30,84,10);c.fill();label('PARTENZA',62,GROUND-94,'#ffe45c',13);
 if(drag?.kind==='rect'&&drag.rect){const [x,y,w2,h2]=drag.rect;c.fillStyle=lv.color+'44';c.fillRect(x,y,w2,h2);c.strokeStyle=lv.color;c.strokeRect(x,y,w2,h2);label(w2+' × '+h2,x,y-8,'#fff',14);}
 const s=objectOf(sel);if(s){const [bx,by,bw,bh]=KINDS[sel.kind].box(s);c.strokeStyle='#ffe45c';c.lineWidth=2/cam.s;c.setLineDash([6/cam.s,4/cam.s]);c.strokeRect(bx-4,by-4,bw+8,bh+8);c.setLineDash([]);for(const hd of handles())box(hd.x,hd.y);c.lineWidth=1/cam.s;}
 for(const p of lastCheck.errors){c.fillStyle='#ff3b5c';c.beginPath();c.arc(p.x,GROUND+60,14,0,7);c.fill();label('!',p.x-4,GROUND+67,'#fff',18);}
 c.restore();drawMap();
}
function shade(hex,f){const n=parseInt(hex.slice(1),16);return 'rgb('+[(n>>16)&255,(n>>8)&255,n&255].map(v=>Math.round(v*f)).join(',')+')';}
function label(text,x,y,color,size){c.font='700 '+size/Math.max(cam.s,.45)+'px ui-sans-serif,system-ui,sans-serif';c.fillStyle=color;c.fillText(text,x,y);}
function round(x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,Math.min(r,w/2,h/2));}
function line(x,text,color,kind){c.strokeStyle=color;c.lineWidth=(sel?.kind===kind?4:2)/cam.s;c.setLineDash([12/cam.s,8/cam.s]);c.beginPath();c.moveTo(x,GROUND-260);c.lineTo(x,GROUND+200);c.stroke();c.setLineDash([]);c.lineWidth=1/cam.s;c.fillStyle=color;c.fillRect(x-10,GROUND-276,20,20);label(text,x+14,GROUND-260,color,14);}
function box(x,y){const r=7/cam.s;c.fillStyle='#ffe45c';c.fillRect(x-r,y-r,2*r,2*r);c.strokeStyle='#06101c';c.strokeRect(x-r,y-r,2*r,2*r);}
function drawMap(){const d=devicePixelRatio||1,w=map.width/d,h=map.height/d,lv=L(),topY=Math.min(-200,...lv.platforms.map(q=>q[1]))-60,sx=w/lv.width,sy=h/(GROUND+200-topY),s=Math.min(sx,sy);mc.setTransform(d,0,0,d,0,0);mc.fillStyle='#050b16';mc.fillRect(0,0,w,h);mc.save();mc.scale(sx,sy);mc.translate(0,-topY);
 mc.fillStyle=lv.color+'22';mc.fillRect(lv.gate_x,topY,lv.exit_x-lv.gate_x,GROUND+200-topY);mc.fillStyle=lv.color;for(const q of lv.platforms)mc.fillRect(q[0],q[1],q[2],Math.max(q[3],12/s));for(const e of lv.enemies){mc.fillStyle=TINT[e.type];mc.fillRect(e.x-2/sx,e.y-50,4/sx,50);}mc.fillStyle='#ffe45c';for(const n of lv.relays)mc.fillRect(n.x-3/sx,n.y-90,6/sx,90);
 const {w:vw,h:vh}=view();mc.restore();mc.strokeStyle='#fff';mc.lineWidth=1.5;mc.strokeRect(cam.x*sx,(cam.y-topY)*sy,vw/cam.s*sx,vh/cam.s*sy);map.dataset.sx=sx;map.dataset.sy=sy;map.dataset.top=topY;}

// ---- interaction
function handles(){const s=objectOf(sel);if(!s)return [];const k=KINDS[sel.kind],out=[],[bx,by,bw,bh]=k.box(s);
 if(k.w){out.push({x:bx+bw,y:by+bh/2,id:'right'});if(!k.center)out.push({x:bx,y:by+bh/2,id:'left'});}
 if(k.h)out.push({x:bx+bw/2,y:by+bh,id:'bottom'},{x:bx+bw/2,y:by,id:'top'});
 if(sel.kind==='enemies'&&s.type!=='turret')out.push({x:s.min,y:s.y+6,id:'min'},{x:s.max,y:s.y+6,id:'max'});
 return out;}
function hit(wx,wy){const tol=8/cam.s;for(const hd of handles())if(Math.abs(hd.x-wx)<tol+2&&Math.abs(hd.y-wy)<tol+2)return {handle:hd.id};
 for(const kind of ['gate','exit'])if(Math.abs(KINDS[kind].at()[0]-wx)<tol+4&&wy>GROUND-280&&wy<GROUND+200)return {kind};
 {const [bx,by,bw,bh]=KINDS.boss.box();if(wx>=bx&&wx<=bx+bw&&wy>=by&&wy<=by+bh)return {kind:'boss'};}
 for(const kind of [...ORDER].reverse()){const a=L()[kind];for(let i=a.length-1;i>=0;i--){const [bx,by,bw,bh]=KINDS[kind].box(a[i]),pad=kind==='platforms'?0:tol;if(wx>=bx-pad&&wx<=bx+bw+pad&&wy>=by-pad&&wy<=by+bh+pad)return {kind,i};}}
 return null;}
function select(s){sel=s;props();draw();}
function create(kind,wx,wy){const k=KINDS[kind];let [x,y]=isFeet(kind,{type:sub.enemies})?feet(grid(wx),wy):[grid(wx),grid(wy)];if(kind==='enemies'&&V.FLYING.has(sub.enemies))y=grid(wy);const a=L()[kind];if(a.length>=V.LIMITS[kind]){status('Limite raggiunto: al massimo '+V.LIMITS[kind]+' elementi di questo tipo.');return null;}const o=k.make(x,y);a.push(o);return {kind,i:a.length-1};}
canvas.addEventListener('pointerdown',e=>{if(!pack)return;canvas.setPointerCapture(e.pointerId);const r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,[wx,wy]=toWorld(sx,sy);pointers.set(e.pointerId,[sx,sy]);
 if(pointers.size===2){const [a,b]=[...pointers.values()];drag={kind:'pinch',dist:Math.hypot(a[0]-b[0],a[1]-b[1]),s:cam.s};settle();return;}
 if(e.button===1||e.button===2||e.altKey&&tool==='select'){drag={kind:'pan',sx,sy,cx:cam.x,cy:cam.y};return;}
 if(tool==='erase'){const h=hit(wx,wy);if(h?.kind&&!KINDS[h.kind].single){commit();L()[h.kind].splice(h.i,1);sel=null;changed();status(KINDS[h.kind].name+' eliminato.');}else drag={kind:'pan',sx,sy,cx:cam.x,cy:cam.y,erase:true};return;}
 if(tool==='platforms'||tool==='ground'){commit();drag={kind:'rect',ground:tool==='ground',x:grid(wx),y:tool==='ground'?GROUND:grid(wy),moved:false};drag.rect=rectFrom(drag,wx,wy);draw();return;}
 if(tool!=='select'){commit();const s=create(tool,wx,wy);if(!s){settle();return;}sel=s;const [ax,ay]=KINDS[tool].at(objectOf(s));drag={kind:'move',sel:s,ox:ax,oy:ay,wx,wy,fresh:true};changed();return;}
 const h=hit(wx,wy);
 if(h?.handle){commit();const o=objectOf(sel),k=KINDS[sel.kind],[bx,by,bw,bh]=k.box(o);drag={kind:'handle',id:h.handle,o,k,bx,by,bw,bh,orig:JSON.stringify(o)};return;}
 if(h){commit();sel=h;const [ax,ay]=KINDS[h.kind].at(objectOf(h));drag={kind:'move',sel:h,ox:ax,oy:ay,wx,wy};props();draw();return;}
 drag={kind:'pan',sx,sy,cx:cam.x,cy:cam.y,deselect:true};});
const pointers=new Map();
function rectFrom(d,wx,wy){if(d.ground){const x0=Math.min(d.x,grid(wx)),x1=Math.max(d.x,grid(wx));return [x0,GROUND,Math.max(x1-x0,d.moved?20:400),200];}const x0=Math.min(d.x,grid(wx)),y0=Math.min(d.y,grid(wy)),w=Math.abs(grid(wx)-d.x),h=Math.abs(grid(wy)-d.y);return d.moved?[x0,y0,Math.max(20,w),Math.max(20,Math.min(h,400))]:[d.x-80,d.y,160,20];}
canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top,[wx,wy]=toWorld(sx,sy);pointer=[wx,wy];$('coords').textContent='x '+Math.round(wx)+' · y '+Math.round(wy);if(pointers.has(e.pointerId))pointers.set(e.pointerId,[sx,sy]);
 if(!drag){canvas.style.cursor=tool==='select'?(hit(wx,wy)?.handle?'ew-resize':hit(wx,wy)?'move':'grab'):tool==='erase'?'not-allowed':'crosshair';return;}
 if(drag.kind==='pinch'&&pointers.size===2){const [a,b]=[...pointers.values()],dist=Math.hypot(a[0]-b[0],a[1]-b[1]);zoom(drag.s*dist/drag.dist/cam.s,(a[0]+b[0])/2,(a[1]+b[1])/2);return;}
 if(drag.kind==='pan'){if(Math.hypot(sx-drag.sx,sy-drag.sy)>4)drag.moved=true;cam.x=drag.cx-(sx-drag.sx)/cam.s;cam.y=drag.cy-(sy-drag.sy)/cam.s;canvas.style.cursor='grabbing';draw();return;}
 if(drag.kind==='rect'){drag.moved=drag.moved||Math.abs(grid(wx)-drag.x)>=20||Math.abs(grid(wy)-drag.y)>=20;drag.rect=rectFrom(drag,wx,wy);draw();return;}
 if(drag.kind==='move'){const s=drag.sel,o=objectOf(s),k=KINDS[s.kind];let x=grid(drag.ox+wx-drag.wx),y=grid(drag.oy+wy-drag.wy);if(!k.single&&isFeet(s.kind,o)&&!e.shiftKey)[x,y]=feet(x,wy-(drag.wy-drag.oy));k.put(o,x,y);drag.moved=true;draw();props(true);return;}
 if(drag.kind==='handle'){const {o,k,id,bx,by,bw,bh}=drag,x=grid(wx),y=grid(wy);Object.assign(o,JSON.parse(drag.orig));
  if(id==='right')k.w[1](o,x-bx);if(id==='left'){const nw=Math.max(20,bx+bw-x);k.w[1](o,nw);const [ax,ay]=k.at(o);k.put(o,ax+(bx+bw-nw)-bx,ay);}
  if(id==='bottom')k.h[1](o,y-by);if(id==='top'){const nh=Math.max(10,by+bh-y);k.h[1](o,nh);const [ax,ay]=k.at(o);k.put(o,ax,ay+(by+bh-nh)-by);}
  if(id==='min')o.min=Math.min(clamp(x,0,L().width),o.x);if(id==='max')o.max=Math.max(clamp(x,0,L().width),o.x);draw();props(true);}});
function release(e){pointers.delete(e.pointerId);if(!drag)return;const d=drag;drag=null;
 if(d.kind==='pinch'){return;}
 if(d.kind==='pan'){if(d.deselect&&!d.moved)select(null);canvas.style.cursor='grab';return;}
 if(d.kind==='rect'){const r=d.rect;if(L().platforms.length>=V.LIMITS.platforms){status('Limite raggiunto: al massimo '+V.LIMITS.platforms+' piattaforme.');settle();draw();return;}L().platforms.push(r);if(d.ground&&r[0]+r[2]>L().width-40)L().width=Math.min(8000,r[0]+r[2]+40);sel={kind:'platforms',i:L().platforms.length-1};levelForm();changed();return;}
 settle();if(d.moved||d.fresh||d.kind==='handle')changed();}
canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();if(e.ctrlKey||e.metaKey)zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);else{if(e.deltaX){cam.x+=e.deltaX/cam.s;cam.y+=e.deltaY/cam.s;}else if(e.shiftKey)cam.y+=e.deltaY/cam.s;else cam.x+=e.deltaY/cam.s;draw();}},{passive:false});
map.addEventListener('pointerdown',e=>{map.setPointerCapture(e.pointerId);const go=ev=>{const r=map.getBoundingClientRect(),{w,h}=view();cam.x=(ev.clientX-r.left)/ +map.dataset.sx-w/2/cam.s;cam.y=(ev.clientY-r.top)/ +map.dataset.sy+ +map.dataset.top-h/2/cam.s;draw();};go(e);map.onpointermove=ev=>{if(ev.buttons)go(ev);};});

// ---- keyboard
document.addEventListener('keydown',e=>{if(document.body.classList.contains('ve-locked')||e.target.closest('input,select,textarea,dialog'))return;const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
 if(mod&&k==='z'){e.preventDefault();e.shiftKey?back(redo,undo):back(undo,redo);return;}if(mod&&k==='y'){e.preventDefault();back(redo,undo);return;}
 if(mod&&k==='d'){e.preventDefault();duplicate();return;}if(mod&&k==='s'){e.preventDefault();persist();status('Livello salvato in questo browser.');return;}
 if((k==='delete'||k==='backspace')&&sel){e.preventDefault();remove();return;}
 if(k==='escape'){setTool('select');select(null);return;}
 if(k==='+'||k==='='){zoom(1.2);return;}if(k==='-'){zoom(1/1.2);return;}
 const arrows={arrowleft:[-1,0],arrowright:[1,0],arrowup:[0,-1],arrowdown:[0,1]}[k];
 if(arrows){e.preventDefault();if(sel){const o=objectOf(sel),kd=KINDS[sel.kind],[ax,ay]=kd.at(o),n=e.shiftKey?50:snapOn()?10:1;commit();kd.put(o,ax+arrows[0]*n,ay+arrows[1]*n);settle();changed();}else{cam.x+=arrows[0]*200/cam.s;cam.y+=arrows[1]*120/cam.s;draw();}return;}
 if(!mod&&!e.altKey)for(const [id,t] of Object.entries(TOOLS))if(t.key===k){setTool(id);return;}});
function remove(){if(!sel)return;if(KINDS[sel.kind].single){status('Il '+KINDS[sel.kind].name.toLowerCase()+' fa parte di ogni livello: puoi spostarlo, non eliminarlo.');return;}commit();L()[sel.kind].splice(sel.i,1);status(KINDS[sel.kind].name+' eliminato.');sel=null;changed();}
function duplicate(){if(!sel||KINDS[sel.kind].single)return;const a=L()[sel.kind];if(a.length>=V.LIMITS[sel.kind])return status('Limite raggiunto per questo tipo di elemento.');commit();const o=JSON.parse(JSON.stringify(a[sel.i])),k=KINDS[sel.kind],[x,y]=k.at(o);k.put(o,x+60,y);a.push(o);sel={kind:sel.kind,i:a.length-1};changed();status(k.name+' duplicato.');}

// ---- side panels
function setTool(id){tool=id;for(const b of document.querySelectorAll('[data-tool]'))b.setAttribute('aria-pressed',String(b.dataset.tool===id));const opts=SUBS[id],box=$('variant');box.hidden=!opts;if(opts){$('variant-label').textContent=TOOLS[id].label+': tipo';const s=$('variant-select');s.replaceChildren(...Object.entries(opts).map(([v,t])=>new Option(t,v,false,sub[id]===v)));const veh=$('vehicle-select');veh.hidden=!(id==='pickups'&&sub.pickups==='vehicle');}$('tool-help').textContent=HELP[id]||'';canvas.style.cursor=id==='select'?'grab':'crosshair';}
const HELP={select:'Trascina un elemento per spostarlo, i quadratini gialli per ridimensionarlo. Trascina il vuoto per scorrere il livello. Canc elimina, Ctrl+D duplica.',ground:'Trascina in orizzontale per stendere un tratto di suolo (altezza 520). Tra due tratti si apre una buca.',platforms:'Trascina per disegnare una piattaforma, oppure fai clic per una piattaforma standard.',relays:'Clic per posare un nodo: va attivato prima del varco del boss ed è anche un checkpoint.',enemies:'Scegli il tipo e fai clic su una piattaforma. Le barre colorate indicano il tratto di pattuglia.',pickups:'Frammenti, cure, impulsi, overdrive, crediti o un mezzo da guidare.',traps:'Punte che tolgono integrità: posale su una piattaforma.',pads:'Le pedane rosa lanciano in alto; le corsie azzurre danno velocità.',vents:'I getti d’aria spingono Verrian molto in alto.',movers:'Piattaforme che si muovono avanti e indietro: regola ampiezza e durata.',lasers:'Barriere a tempo: si accendono e si spengono a ciclo.',secrets:'Un muro che si rompe con tre colpi: nascondi dietro un premio.',encounters:'Tecnici da liberare (+crediti e integrità) e casse del tesoro.',erase:'Clic su un elemento per eliminarlo.'};
function props(light){const box=$('props'),s=objectOf(sel);if(light&&s&&box.dataset.for===sel.kind+(sel.i??'')){for(const inp of box.querySelectorAll('[data-field]')){const f=fields[inp.dataset.field];if(f&&document.activeElement!==inp)inp.value=f.get();}return;}
 box.dataset.for=s?sel.kind+(sel.i??''):'';if(!s){box.replaceChildren(Object.assign(document.createElement('p'),{className:'ve-empty',textContent:'Nessun elemento selezionato. Usa lo strumento Seleziona e fai clic su un oggetto del livello.'}));fields=[];return;}
 const k=KINDS[sel.kind],h=document.createElement('h3');h.textContent=k.name+(k.single?'':' '+(sel.i+1));fields=k.fields(s);const form=fields.map((f,i)=>{const lab=document.createElement('label');lab.append(f.label);let inp;if(f.options){inp=document.createElement('select');inp.append(...Object.entries(f.options).map(([v,t])=>new Option(t,v)));}else{inp=document.createElement('input');if(f.text){inp.type='text';inp.maxLength=f.max;}else{inp.type='number';inp.min=f.min;inp.max=f.max;inp.step=f.step;}}inp.value=f.get();inp.dataset.field=i;inp.addEventListener('change',()=>{const v=f.options||f.text?inp.value:clamp(Math.round(+inp.value||0),f.min,f.max);commit();f.set(v);settle();changed();if(f.options)props();});lab.append(inp);return lab;});
 const actions=document.createElement('div');actions.className='ve-row';if(!k.single){const dup=button('Duplica',duplicate),del=button('Elimina',remove);del.classList.add('ve-danger');actions.append(dup,del);}actions.append(button('Centra',()=>look(k.at(s)[0])));box.replaceChildren(h,...form,actions);}
let fields=[];
function button(text,fn){const b=document.createElement('button');b.type='button';b.className='ve-btn';b.textContent=text;b.onclick=fn;return b;}
function levelForm(){const lv=L();$('title').value=lv.title;$('story').value=lv.story;$('author').value=pack.author;$('theme').value=String(pack.theme);$('backdrop').value=lv.backdrop||'';$('width').value=lv.width;$('color').value=lv.color;}
function bindLevelForm(){
 const on=(id,fn)=>$(id).addEventListener('change',()=>{commit();fn($(id).value);settle();changed();});
 on('title',v=>L().title=v.slice(0,60));on('story',v=>L().story=v.slice(0,160));on('author',v=>pack.author=v.slice(0,30));on('color',v=>L().color=v);on('backdrop',v=>L().backdrop=v);
 on('theme',v=>{const old=V.THEMES[pack.theme],t=V.THEMES[+v];pack.theme=+v;L().id=t.id;if(L().color===old.color)L().color=t.color;if(L().secondary===old.secondary)L().secondary=t.secondary;if(L().boss.name===old.boss)L().boss.name=t.boss;levelForm();themeNote();});
 on('width',v=>{const lv=L(),w=clamp(Math.round(+v||0),1600,8000),d=w-lv.width;lv.width=w;lv.exit_x=clamp(lv.exit_x+d,700,w-40);lv.gate_x=clamp(lv.gate_x+d,300,lv.exit_x-300);lv.boss.x=clamp(lv.boss.x+d,lv.gate_x+150,lv.exit_x-100);levelForm();});}
function themeNote(){const t=V.THEMES[pack.theme];$('theme-note').textContent='Sfondo, musica e boss di «'+t.name+'». Attacco del boss: '+t.attack+'.';}
function checks(){clearTimeout(checks.t);checks.t=setTimeout(()=>{const r=V.check(V.clean(pack)),ul=$('check-list');lastCheck=r;ul.replaceChildren(...[...r.errors.map(x=>[x,'error']),...r.warnings.map(x=>[x,'warn'])].map(([x,type])=>{const li=document.createElement('li');li.className='ve-'+type;const b=document.createElement('button');b.type='button';b.textContent=(type==='error'?'Da correggere: ':'Attenzione: ')+x.text;b.onclick=()=>look(x.x);li.append(b);return li;}));
 $('check-summary').textContent=r.errors.length?r.errors.length+(r.errors.length>1?' problemi impediscono':' problema impedisce')+' la prova':r.warnings.length?'Pronto da provare · '+r.warnings.length+(r.warnings.length>1?' avvisi':' avviso'):'Pronto da provare: nessun problema trovato';$('check-summary').dataset.state=r.errors.length?'error':r.warnings.length?'warn':'ok';
 const lv=L();$('counts').textContent=lv.platforms.length+' piattaforme · '+lv.relays.length+' nodi · '+lv.enemies.length+' nemici · '+lv.pickups.filter(p=>p.kind==='shard').length+' frammenti';draw();},120);}

// ---- library, files and sharing
async function libraryDialog(){const ul=$('library-list');ul.replaceChildren(Object.assign(document.createElement('li'),{textContent:'Caricamento dei tuoi livelli…'}));if(!$('library').open)$('library').showModal();
 let list;try{await saveNow().catch(()=>{});list=(await api('levels.php?mine=1')).levels;}catch(e){ul.replaceChildren(Object.assign(document.createElement('li'),{textContent:e.message}));return;}
 ul.replaceChildren(...list.map(e=>{const li=document.createElement('li'),t=document.createElement('div');t.innerHTML='<strong></strong><small></small>';t.firstChild.textContent=e.title||'Senza titolo';t.lastChild.textContent=V.THEMES[e.theme||0].name+' · '+new Date(e.updated_at).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})+(e.playable?'':' · da completare')+(e.id===current?' · aperto ora':'');
  const openB=button('Apri',()=>load(e.id).then(()=>$('library').close())),del=button('Elimina',async()=>{if(!confirm('Eliminare «'+(e.title||'questo livello')+'»? Il link smetterà di funzionare; nel registro resta traccia che il livello era tuo.'))return;try{await api('levels.php',{action:'delete',id:e.id});if(e.id===current){open(V.blank(0),null,'vuoto');dropBackup();}libraryDialog();status('Livello eliminato.');}catch(err){status(err.message);}});del.classList.add('ve-danger');li.append(t,openB,del);return li;}));
 if(!list.length)ul.append(Object.assign(document.createElement('li'),{textContent:'Ancora nessun livello salvato nel tuo account.'}));legacyOffer();}
async function load(id){try{await saveNow().catch(()=>{});const d=await api('levels.php?own='+encodeURIComponent(id));open(d.pack,d.level.id);status('Aperto «'+L().title+'».');}catch(e){status(e.message);}}
// Levels made before sign-in was required live only in this browser: they can be moved into the account once.
function legacyLevels(){try{const s=JSON.parse(localStorage.getItem(STORE)||'null');return Array.isArray(s?.levels)?s.levels.filter(e=>e?.pack):[];}catch{return [];}}
function legacyOffer(){const box=$('legacy'),list=legacyLevels();box.hidden=!list.length;if(!list.length)return;$('legacy-count').textContent=list.length===1?'1 livello creato':''+list.length+' livelli creati';}
async function legacyImport(){const list=legacyLevels();let n=0;for(const e of list){try{await api('levels.php',{action:'save',id:null,pack:V.clean(e.pack),origin:'browser'});n++;}catch(err){status(err.message);break;}}if(n===list.length)try{localStorage.removeItem(STORE);}catch{}status(n+(n===1?' livello importato':' livelli importati')+' nel tuo account.');libraryDialog();}
let official=null;async function template(i){try{official??=(await (await fetch('../games/verrian/levels.json')).json()).levels;await saveNow().catch(()=>{});const lv=JSON.parse(JSON.stringify(official[i]));lv.title=lv.title+' · remix';open({format:V.FORMAT,theme:i,author:pack.author,level:lv},null,'remix:'+i);$('library').close();status('Nuovo livello creato da «'+official[i].title+'»: modificalo come vuoi, si salva da solo.');}catch{status('Impossibile caricare i mondi ufficiali. Controlla la connessione.');}}
function slug(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'livello';}
function exportFile(){const blob=new Blob([JSON.stringify(V.clean(pack),null,1)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=slug(L().title)+'.verrian.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);status('File scaricato: puoi consegnarlo al docente o riaprirlo con Importa.');}
async function importFile(file){try{if(file.size>500000)throw Error('File troppo grande.');const p=V.clean(JSON.parse(await file.text()));await saveNow().catch(()=>{});open(p,null,'file');await saveNow();status('Importato «'+L().title+'» nel tuo account.');}catch(e){status('Importazione non riuscita: '+(e.message||'formato sconosciuto')+'.');}}
// Waits for the save that holds the latest change too, not only the one already in flight.
async function playUrl(){let id=await saveNow();for(let i=0;i<5&&(saving||JSON.stringify(pack)!==savedJson);i++)id=await(saving||saveNow());return new URL('/#livello='+id,location.href).href;}
async function test(){const r=V.check(V.clean(pack));if(!r.ok){status('Prima di provare il livello correggi: '+r.errors[0].text);look(r.errors[0].x);$('check').scrollIntoView({block:'nearest'});return;}
 const w=window.open('','verrian-prova');let url;try{url=await playUrl();}catch(e){w?.close();status('Prova non disponibile: '+e.message);return;}
 // A fresh query makes the test tab reload even when it already shows this level's link.
 url=url.replace('/#','/?prova='+Date.now().toString(36)+'#');if(w)w.location.href=url;else location.href=url;status('Il livello si apre nella scheda del gioco. Torna qui per modificarlo.');}
async function share(){const r=V.check(V.clean(pack));if(!r.ok){status('Il livello non è ancora giocabile: '+r.errors[0].text);return;}let url;try{url=await playUrl();}catch(e){status('Condivisione non disponibile: '+e.message);return;}$('share-link').value=url;$('share-size').textContent='Il link apre la versione salvata nel tuo account: anche le modifiche successive arrivano a chi lo riapre. I giocatori vedono solo il soprannome '+(pack.author?'«'+pack.author+'»':'(non indicato)')+'.';$('share').showModal();$('share-link').select();}
async function registry(){const ul=$('registry-list');ul.replaceChildren(Object.assign(document.createElement('li'),{textContent:'Caricamento del registro…'}));if(!$('registry').open)$('registry').showModal();
 try{const list=(await api('levels.php?all=1')).levels;ul.replaceChildren(...list.map(e=>{const li=document.createElement('li'),t=document.createElement('div');t.innerHTML='<strong></strong><small></small><small></small>';t.children[0].textContent=(e.title||'Senza titolo')+(e.deleted_at?' · eliminato':'');t.children[1].textContent=e.author_name+' · '+e.author_email+(e.nickname?' · soprannome «'+e.nickname+'»':'');t.children[2].textContent='Creato '+new Date(e.created_at).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})+' · modificato '+new Date(e.updated_at).toLocaleString('it-IT',{dateStyle:'short',timeStyle:'short'})+' · '+e.versions+' salvataggi'+(e.origin?' · origine '+e.origin:'');li.append(t);if(!e.deleted_at&&e.playable){const a=document.createElement('a');a.className='ve-btn';a.href='/#livello='+e.id;a.target='_blank';a.rel='noopener';a.textContent='Gioca';li.append(a);}return li;}));if(!list.length)ul.append(Object.assign(document.createElement('li'),{textContent:'Nessun livello ancora.'}));}catch(e){ul.replaceChildren(Object.assign(document.createElement('li'),{textContent:e.message}));}}
async function copy(text,what){try{await navigator.clipboard.writeText(text);status(what+' copiato negli appunti.');}catch{$('share-link').select();status('Seleziona il testo e copialo con Ctrl+C.');}}
function status(text){$('status').textContent=text;}

// ---- start: nothing can be edited before signing in with a school account
function gate(message){const g=$('gate'),cfg=session?.configured!==false;$('gate-text').textContent=cfg?'L’officina dei livelli è riservata agli account @'+(session?.domain||'verri.edu.it')+': così di ogni livello si sa chi l’ha creato. A chi gioca compare soltanto il soprannome che scegli tu.':'L’accesso con Google non è ancora stato attivato su questo sito. Riprova più tardi o avvisa il docente.';
 $('gate-error').textContent=message||'';$('gate-error').hidden=!message;const a=$('gate-login');a.hidden=!cfg;a.href='/api/login.php?return='+encodeURIComponent('/editor/'+location.search.replace(/[?&]accesso=[^&]*/,'').replace(/^&/,'?'));g.hidden=false;document.body.classList.add('ve-locked');a.focus?.();}
function signedIn(){$('gate').hidden=true;document.body.classList.remove('ve-locked');$('user-name').textContent=session.user.name;$('user-name').title=session.user.email;$('user').hidden=false;$('registry-open').hidden=!session.admin;}
async function logout(){await saveNow().catch(()=>{});try{session=(await api('session.php',{action:'logout'}));}catch{}location.href='/editor/';}
async function boot(){const q=new URLSearchParams(location.search),err=q.get('accesso');
 try{session=await (await fetch('/api/session.php',{credentials:'same-origin',cache:'no-store'})).json();}catch{session={configured:true,user:null};gate('Server non raggiungibile: controlla la connessione e ricarica la pagina.');return;}
 if(!session.user){gate(err);return;}signedIn();
 const copyId=q.get('copia'),oldLink=/[#&]livello=1\./.test(location.hash);
 if(copyId||oldLink||err)history.replaceState(null,'',location.pathname);
 try{if(copyId){const d=await api('levels.php',{action:'copy',id:copyId});open(d.pack,d.level.id);status('Hai una copia tutta tua di «'+L().title+'», salvata nel tuo account.');return;}
  if(oldLink){open(await V.decode(location.hash),null,'link');await saveNow();status('Livello di un vecchio link importato nel tuo account: ora ha un nuovo link da condividere.');return;}}catch(e){status(e.message);}
 let b=null;try{b=JSON.parse(localStorage.getItem(BACKUP)||'null');}catch{}
 if(b?.pack&&b.email===session.user.email){open(b.pack,b.id,b.origin);savedJson='';await saveNow().catch(()=>{});status('Recuperate le modifiche non ancora salvate dell’ultima sessione.');return;}
 try{const list=(await api('levels.php?mine=1')).levels;if(list.length){await load(list[0].id);if(legacyLevels().length)status('Hai anche livelli salvati solo in questo browser: aprili da «I miei livelli» per importarli.');return;}}catch(e){status(e.message);}
 open(V.blank(0),null,'vuoto');status(legacyLevels().length?'Benvenuto! Hai livelli creati prima dell’accesso: importali da «I miei livelli».':'Benvenuto nell’officina dei livelli: il livello di partenza è già giocabile. Modificalo e premi Prova.');}
function init(){
 const tools=$('tools');for(const [id,t] of Object.entries(TOOLS)){const b=document.createElement('button');b.type='button';b.dataset.tool=id;b.className='ve-tool ve-tool-'+id;b.title=t.label+' ('+t.key.toUpperCase()+')';b.innerHTML='<i aria-hidden="true"></i><span></span><kbd></kbd>';b.querySelector('span').textContent=t.label;b.querySelector('kbd').textContent=t.key.toUpperCase();b.onclick=()=>setTool(id);tools.append(b);}
 $('variant-select').onchange=e=>{sub[tool]=e.target.value;setTool(tool);};$('vehicle-select').replaceChildren(...Object.entries(V.VEHICLES).map(([v,t])=>new Option(t,v)));$('vehicle-select').onchange=e=>sub.vehicle=e.target.value;
 $('theme').replaceChildren(...V.THEMES.map((t,i)=>new Option((i+1)+' · '+t.name,String(i))));$('backdrop').replaceChildren(new Option('Quello dell’ambientazione',''),...Object.entries(V.BACKDROPS).map(([v,t])=>new Option(t,v)));
 $('zoom-in').onclick=()=>zoom(1.25);$('zoom-out').onclick=()=>zoom(1/1.25);$('zoom-fit').onclick=()=>{fit();draw();};
 $('undo').onclick=()=>back(undo,redo);$('redo').onclick=()=>back(redo,undo);$('snap').onchange=()=>draw();
 $('test').onclick=test;$('share-open').onclick=share;$('export').onclick=exportFile;$('import').onclick=()=>$('file').click();$('file').onchange=e=>{if(e.target.files[0])importFile(e.target.files[0]);e.target.value='';};
 $('library-open').onclick=libraryDialog;$('new-blank').onclick=async()=>{await saveNow().catch(()=>{});open(V.blank(0),null,'vuoto');$('library').close();status('Nuovo livello vuoto: si salva nel tuo account alla prima modifica.');};for(const b of document.querySelectorAll('[data-template]'))b.onclick=()=>template(+b.dataset.template);
 $('legacy-import').onclick=legacyImport;$('logout').onclick=logout;$('registry-open').onclick=registry;
 $('copy-link').onclick=()=>copy($('share-link').value,'Link');
 bindLevelForm();addEventListener('resize',resize);addEventListener('pagehide',()=>{if(pack&&JSON.stringify(pack)!==savedJson)backup();});
 setTool('select');resize();boot();
}
init();
})();
