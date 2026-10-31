/* Runs while the page is still being parsed, right after the toolbar: shows the saved Music, Sounds and Effects
   choices before the deferred game scripts load, so the buttons never flash "off". game.js keeps them in sync afterwards. */
(()=>{'use strict';
 try{
  let p={};try{p=JSON.parse(localStorage.getItem('verrian.preferences.v1')||'{}')||{};}catch{}
  // Same defaults as game.js: phones start with music and sounds on, computers silent; effects follow reduced motion.
  const touch=matchMedia('(pointer:coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show=(id,label,on)=>{const b=document.getElementById(id);if(b){b.textContent=label+': '+(on?'on':'off');b.setAttribute('aria-pressed',String(on));}};
  show('vr-music-toggle','Musica',typeof p.music==='boolean'?p.music:touch);
  show('vr-audio','Suoni',typeof p.sfx==='boolean'?p.sfx:touch);
  show('vr-fx','Effetti',p.effects!==false&&!reduced);
 }catch{}
})();
