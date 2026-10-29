/* Web Audio: game sounds and background music, switched on separately; the context starts only after a user gesture. */
(()=>{'use strict';
function create(){let audio=null,sfx=false,music=false,lastSound=0,master=null,ambientGain=null,ambientNodes=[],sceneKey='',volume=.45;
let noise=null;const lastBy={};
function blast(t,d,g,from,to){if(!noise){noise=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);const ch=noise.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();gain.gain.value=0;src.buffer=noise;filter.type='lowpass';filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+d);gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(filter);filter.connect(gain);gain.connect(master);src.start(t);src.stop(t+d+.02);}
function soundEvent(type,e={}){if(!sfx||!audio||audio.state!=='running')return;const t=audio.currentTime;if(t-(lastBy[type]??-1)<.06)return;lastBy[type]=t;lastSound=t;const note=(f,d=.1,g=.025,at=0)=>{const o=audio.createOscillator(),gain=audio.createGain();gain.gain.value=0;o.type='triangle';o.frequency.setValueAtTime(f,t+at);gain.gain.setValueAtTime(g,t+at);gain.gain.exponentialRampToValueAtTime(.0001,t+at+d);o.connect(gain);gain.connect(master);o.start(t+at);o.stop(t+at+d+.01);};if(type==='slash'){if(e.weapon==='blaster'){note(880,.05,.018);blast(t,.05,.03,5000,1200);}else if(e.weapon==='hammer'){note(95,.16,.035);blast(t,.12,.05,900,120);}else if(e.weapon==='whip'){note(520,.09,.014);note(1040,.06,.01,.03);}else{note(170,.055,.016);note(640,.04,.008,.015);}}if(type==='stomp'||type==='bounce'){note(140,.09,.03);blast(t,.06,.04,1400,200);}if(type==='weapon')[392,523,659,784,1047].forEach((f,i)=>note(f,.16,.024,i*.07));if(type==='weapon-switch')note(660,.06,.016);if(type==='shop-move')note(520,.04,.012);if(type==='shop-buy')[660,880,1175].forEach((f,i)=>note(f,.1,.02,i*.05));if(type==='shop-denied')note(180,.12,.02);if(type==='medkit')[523,784].forEach((f,i)=>note(f,.14,.022,i*.07));if(type==='vehicle')[392,587,784,1175].forEach((f,i)=>note(f,.16,.024,i*.07));if(type==='vehicle-switch')note(440,.08,.016);if(type==='wall-hit'){note(120,.08,.03);blast(t,.08,.05,1600,200);}if(type==='secret'){blast(t,.5,.1,1800,80);[523,659,784,1047].forEach((f,i)=>note(f,.18,.024,.1+i*.08));}if(type==='ram')blast(t,.1,.06,1200,150);if(type==='land')blast(t,.12,.05,900,100);if(type==='quake')blast(t,.4,.1,700,60);if(type==='parry'){note(980,.09,.025);note(1320,.12,.016,.05);}if(type==='blocked')note(260,.09,.018);if(type==='rescue'||type==='cache')[523,659,880].forEach((f,i)=>note(f,.13,.02,i*.07));if(type==='spring'){note(330,.09,.02);note(880,.16,.018,.06);}if(type==='speed'){note(440,.08,.018);note(660,.12,.018,.06);}if(type==='boost')note(530,.15,.018);if(type==='overdrive')[440,660,880].forEach((f,i)=>note(f,.12,.02,i*.05));if(type==='jump'||type==='double-jump')note(310,.07,.018);if(type==='damage')note(80,.18,.035);if(type==='pickup')note(740,.065,.018);if(type==='pulse'){note(110,.35,.04);note(440,.25,.018,.03);}if(type==='relay'||type==='boss-down'||type==='win')[330,440,660,880].forEach((f,i)=>note(f,.18,.025,i*.08));if(type==='boss')note(65,.45,.035);if(type==='explode'){const big=e.enemyType==='boss';blast(t,big?1.1:.45,big?.16:.09,big?2400:3200,120);note(big?48:72,big?.7:.28,big?.07:.045);}if(type==='hit')blast(t,.07,e.heavy?.06:.035,e.heavy?1800:2600,400);if(type==='dodge'){note(880,.08,.02);note(1320,.14,.014,.04);}if(type==='boss-stun'){note(220,.2,.03);note(330,.25,.022,.06);}if(type==='chain-heal')note(990,.12,.02);if(type==='chain')note(520+Math.min(e.chain,6)*90,.12,.022);if(type==='death')blast(t,.6,.1,1500,90);}

// Call from a click or key press: browsers keep audio suspended until then.
async function unlock(){
 if(!sfx&&!music)return false;
 if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=volume;master.connect(audio.destination);ambientGain=audio.createGain();ambientGain.gain.value=0;ambientGain.connect(master);}
 if(audio.state!=='running')await audio.resume();sceneKey='';return true;
}
function configure(p){volume=Math.max(0,Math.min(1,(p.volume??45)/100));sfx=p.sfx===true;music=p.music===true;if(master)master.gain.setTargetAtTime(volume,audio.currentTime,.05);sceneKey='';}
/* Original theme "Custodi del 2148": a minor riff whose tritone (6) and flat second (1) keep it uneasy.
   Semitones from the world root, one bar per row, eighth notes for the lead (null = rest), 16 sixteenth steps per bar.
   Sections cycle intro → theme → theme with echo bells → breakdown with music box only. */
const SONG={lead:[[0,null,3,7,6,7,null,3],[8,7,3,1,0,null,null,null],[0,null,3,7,6,7,null,12],[11,8,7,6,3,1,0,null]],
 bass:[0,1,0,-4],arp:[[0,3,7,12],[1,5,8,13],[0,3,6,12],[-4,0,3,8]]};
const WORLD_ROOT=[55,65.406,58.27,49],WORLD_BPM=[92,100,86,108];
let musicOn=false,musicTimer=0,step=0,cycle=0,nextAt=0,root=55,sixteenth=.16,echo=null;
const hz=(base,s)=>base*2**(s/12);
function tone(at,f,d,g,type='triangle',detune=0,out=ambientGain){const o=audio.createOscillator(),gain=audio.createGain();gain.gain.value=0;o.type=type;o.frequency.setValueAtTime(f,at);o.detune.setValueAtTime(detune,at);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(g,at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+d);o.connect(gain);gain.connect(out);o.start(at);o.stop(at+d+.02);return o;}
function echoBus(){if(echo)return echo;const input=audio.createGain(),delay=audio.createDelay(1),back=audio.createGain(),damp=audio.createBiquadFilter();delay.delayTime.value=sixteenth*3;back.gain.value=.38;damp.type='lowpass';damp.frequency.value=1800;input.connect(delay);delay.connect(damp);damp.connect(back);back.connect(delay);damp.connect(ambientGain);return echo={input,delay};}
function lead(at,s,d,g){for(const cents of [-7,7])tone(at,hz(root*8,s),d,g,'triangle',cents);const o=tone(at,hz(root*8,s),d,g*.5,'square',0,echoBus().input),lfo=audio.createOscillator(),depth=audio.createGain();lfo.frequency.value=5.2;depth.gain.value=9;lfo.connect(depth);depth.connect(o.detune);lfo.start(at);lfo.stop(at+d+.02);}
function bell(at,s,g){tone(at,hz(root*8,s),.9,g,'sine',0,echoBus().input);tone(at,hz(root*8,s)*2.76,.35,g*.35,'sine',0,echoBus().input);}
function beat(at,s){const bar=s>>4,pos=s&15,part=cycle%4,eighth=pos>>1;
 if(part!==3){const b=SONG.bass[bar]+(pos%4===2?12:0);if(pos%2===0)tone(at,hz(root*2,b),sixteenth*1.7,.05,'sawtooth',0);
  if(pos===0||pos===8||(part===2&&pos===11)){const k=tone(at,110,.22,.11,'sine');k.frequency.exponentialRampToValueAtTime(38,at+.18);}
  if(pos%4===2)hat(at,.03,.012,7000);}
 if(part===3||pos%2===1)bell(at,SONG.arp[bar][pos%4]+(part===3?0:12),part===3?.02:.008);
 const n=pos%2===0?SONG.lead[bar][eighth]:null;if(part>0&&part<3&&n!==null){let len=1;while(eighth+len<8&&SONG.lead[bar][eighth+len]===null)len++;lead(at,n,sixteenth*2*len*.92,.018);if(part===2)bell(at+sixteenth*2,n+12,.012);}
 if(part===3&&pos===0&&bar===3)tone(at,hz(root*4,6),sixteenth*14,.02,'sine',4);}
function hat(t,d,g,from){if(!noise){noise=audio.createBuffer(1,audio.sampleRate,audio.sampleRate);const ch=noise.getChannelData(0);for(let i=0;i<ch.length;i++)ch[i]=Math.random()*2-1;}const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();gain.gain.value=0;src.buffer=noise;filter.type='highpass';filter.frequency.setValueAtTime(from,t);gain.gain.setValueAtTime(g,t);gain.gain.exponentialRampToValueAtTime(.0001,t+d);src.connect(filter);filter.connect(gain);gain.connect(ambientGain);src.start(t,Math.random()*.5);src.stop(t+d+.02);}
function pump(){musicTimer=0;if(!musicOn)return;while(nextAt<audio.currentTime+.15){beat(nextAt,step);step=(step+1)%64;if(!step)cycle++;nextAt+=sixteenth;}musicTimer=setTimeout(pump,40);}
function scene(index,playing){if(!audio)return;const key=[index,playing,music].join();if(key===sceneKey)return;const world=index%4,moved=!sceneKey.startsWith(index+',');sceneKey=key;const at=audio.currentTime;
 if(!ambientNodes.length){for(let i=0;i<2;i++){const o=audio.createOscillator(),g=audio.createGain();o.type='sine';g.gain.value=i?.003:.008;o.connect(g);g.connect(ambientGain);o.start();ambientNodes.push(o);}}
 root=WORLD_ROOT[world];sixteenth=60/WORLD_BPM[world]/4;if(echo)echo.delay.delayTime.setTargetAtTime(sixteenth*3,at,.1);if(moved){step=0;cycle=0;}
 ambientNodes[0].frequency.setTargetAtTime(root,at,.8);ambientNodes[1].frequency.setTargetAtTime(root*Math.SQRT2,at,.8);
 const on=music&&playing&&audio.state==='running';ambientGain.gain.setTargetAtTime(on?.8:0,at,on?.25:.4);
 if(on&&!musicOn){musicOn=true;nextAt=at+.08;if(!musicTimer)pump();}else if(!on)musicOn=false;
}
return {unlock,configure,scene,event:soundEvent,get running(){return !!audio&&audio.state==='running';}};
}
window.VerrianAudio={create};
})();
