/* Local public-edition data. No account, network request or mutable engine snapshot. */
(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f();else g.VerrianLocal=f();})(globalThis,()=>{
'use strict';
const KEYS={results:'verrian.public.v1',run:'verrian.public.run.v1',prefs:'verrian.preferences.v1'};
const mode=v=>v==='adventure'||v==='arcade',integer=(v,max=1e9)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
const validId=v=>typeof v==='string'&&/^[\w-]{8,120}$/.test(v);
function normalize(value){
 const history=[],best=new Map();
 if(value&&typeof value==='object'){
  for(const r of (Array.isArray(value.records)?value.records:[]).slice(-100))if(r&&mode(r.difficulty)&&integer(r.score))best.set(r.difficulty,Math.max(best.get(r.difficulty)||0,r.score));
  for(const r of (Array.isArray(value.history)?value.history:[]).slice(-100)){
   if(!r||!mode(r.difficulty)||!integer(r.score)||!r.assessment||typeof r.assessment!=='object'||!integer(r.assessment.bosses,100)||typeof r.completed_at!=='string'||!Number.isFinite(Date.parse(r.completed_at)))continue;
   const assessment={};for(const [k,v] of Object.entries(r.assessment))if(integer(v)||typeof v==='boolean'||['difficulty','reason'].includes(k)&&typeof v==='string')assessment[k]=v;
   assessment.bosses=r.assessment.bosses;assessment.won=r.assessment.won===true;
   const id=validId(r.id)?r.id:'legacy-'+hash(r.completed_at+':'+r.difficulty+':'+r.score);
   if(history.some(x=>x.id===id))continue;
   history.push({id,score:r.score,difficulty:r.difficulty,assessment,completed_at:new Date(r.completed_at).toISOString()});best.set(r.difficulty,Math.max(best.get(r.difficulty)||0,r.score));
  }
 }
 return {version:2,records:[...best].map(([difficulty,score])=>({difficulty,score})),history:history.slice(-20)};
}
function pack(inputs,maxInputs,maxInput){
 if(!Array.isArray(inputs)||inputs.length>maxInputs||inputs.some(v=>!integer(v,maxInput)))throw Error('Invalid replay');
 const bytes=[];for(const v of inputs)bytes.push(v&255,v>>>8);
 return btoa(String.fromCharCode(...bytes));
}
function unpack(encoded,maxInputs,maxInput){
 if(typeof encoded!=='string'||encoded.length>Math.ceil(maxInputs*2/3)*4||encoded.length%4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw Error('Invalid replay');
 const binary=atob(encoded);if(binary.length%2||binary.length>maxInputs*2)throw Error('Invalid replay');
 const inputs=[];for(let i=0;i<binary.length;i+=2){const v=binary.charCodeAt(i)|(binary.charCodeAt(i+1)<<8);if(v>maxInput)throw Error('Invalid input');inputs.push(v);}return inputs;
}
function create({storage,revision,maxInputs=16200,maxInput=1023,legacyRevisions=[],now=()=>Date.now()}){
 const read=key=>JSON.parse(storage.getItem(key)||'null');
 const write=(key,value)=>{try{storage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
 function results(){try{return normalize(read(KEYS.results));}catch{return normalize(null);}}
 function saveResult(result,id){
  const data=results();if(!validId(id)||!result||!mode(result.difficulty)||!integer(result.score)||!integer(result.bosses,100))return {saved:false,best:false,data};
  if(data.history.some(r=>r.id===id))return {saved:true,best:false,data,duplicate:true};
  const old=data.records.find(r=>r.difficulty===result.difficulty),best=!old||result.score>old.score;
  data.history.push({id,score:result.score,difficulty:result.difficulty,assessment:result,completed_at:new Date(now()).toISOString()});
  if(!old)data.records.push({difficulty:result.difficulty,score:result.score});else if(best)old.score=result.score;
  const candidate=normalize(data);return {saved:write(KEYS.results,candidate),best,data:candidate};
 }
 function saveRun(run){
  try{
   if(!run||!validId(run.id)||!integer(run.seed,4294967295)||!run.seed||!mode(run.difficulty))return false;
   const data={version:1,revision,rules:run.rules==='relaxed-shop'?'relaxed-shop':'classic',id:run.id,seed:run.seed,difficulty:run.difficulty,replay:pack(run.inputs,maxInputs,maxInput),updated_at:now(),finished:run.finished===true,reason:run.finished?run.reason||'retired':null};
   data.checksum=hash(JSON.stringify(data));return write(KEYS.run,data);
  }catch{return false;}
 }
 function run(){
  try{
   const data=read(KEYS.run);if(!data)return {status:'empty'};
   if(data.version!==1||data.revision!==revision&&!legacyRevisions.includes(data.revision))return {status:'incompatible'};
   if(data.rules!==undefined&&!['classic','relaxed-shop'].includes(data.rules))return {status:'invalid'};const {checksum,...payload}=data;
   if(checksum!==hash(JSON.stringify(payload))||!validId(data.id)||!integer(data.seed,4294967295)||!data.seed||!mode(data.difficulty)||!integer(data.updated_at,Number.MAX_SAFE_INTEGER)||data.updated_at>now()+300000||typeof data.finished!=='boolean'||data.finished&&!['victory','timeout','destroyed','retired'].includes(data.reason))return {status:'invalid'};
   return {status:'ready',data:{...data,rules:data.rules||'classic',inputs:unpack(data.replay,maxInputs,maxInput)}};
  }catch{return {status:'invalid'};}
 }
 function clearRun(id){try{const data=read(KEYS.run);if(data&&data.id!==id)return true;storage.removeItem(KEYS.run);return true;}catch{return false;}}
 function preferences(){
  let p;try{p=read(KEYS.prefs)||{};}catch{p={};}
  const keys={};for(const [action,code]of Object.entries(p.keys&&typeof p.keys==='object'?p.keys:{}))if(['left','right','jump','attack','dash','pulse','weapon','crouch','aimUp','aimDown'].includes(action)&&typeof code==='string'&&/^(Key[A-OQ-Z]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right))$/.test(code))keys[action]=code;
  const ids=(value,allowed)=>Array.isArray(value)?[...new Set(value.filter(x=>allowed.includes(x)))]:[];
  return {effects:typeof p.effects==='boolean'?p.effects:null,difficulty:mode(p.difficulty)?p.difficulty:'adventure',quality:['low','standard','high'].includes(p.quality)?p.quality:'standard',volume:Number.isFinite(p.volume)?Math.max(0,Math.min(100,p.volume)):45,ambient:p.ambient!==false,shake:p.shake!==false,flashes:p.flashes!==false,tutorial:p.tutorial!==false,gamepad:p.gamepad!==false,keys,tutorialSeen:ids(p.tutorialSeen,['move','jump','attack','dash','node']),achievements:ids(p.achievements,['node','boss','rescue','victory'])};
 }
 function savePreferences(patch){
  const p=preferences();for(const key of ['effects','ambient','shake','flashes','tutorial','gamepad'])if(typeof patch[key]==='boolean')p[key]=patch[key];
  if(mode(patch.difficulty))p.difficulty=patch.difficulty;if(['low','standard','high'].includes(patch.quality))p.quality=patch.quality;
  if(Number.isFinite(patch.volume))p.volume=Math.max(0,Math.min(100,patch.volume));
  if(patch.keys&&typeof patch.keys==='object'&&!Array.isArray(patch.keys)){p.keys={};for(const [action,code]of Object.entries(patch.keys))if(['left','right','jump','attack','dash','pulse','weapon','crouch','aimUp','aimDown'].includes(action)&&typeof code==='string'&&/^(Key[A-OQ-Z]|Arrow(Left|Right|Up|Down)|Space|Shift(Left|Right))$/.test(code))p.keys[action]=code;}
  for(const [key,allowed]of [['tutorialSeen',['move','jump','attack','dash','node']],['achievements',['node','boss','rescue','victory']]])if(Array.isArray(patch[key]))p[key]=[...new Set(patch[key].filter(x=>allowed.includes(x)))];
  return write(KEYS.prefs,p);
 }

 return {results,saveResult,saveRun,run,clearRun,preferences,savePreferences};
}
return {create,normalize,pack,unpack,hash,KEYS};
});
