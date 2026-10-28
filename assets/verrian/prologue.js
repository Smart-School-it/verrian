/* Presentation-only prologue: typewriter text never advances the simulation or records. */
(()=>{'use strict';
function show({overlay,template,story,still=false,reducedMotion=false}){
 return new Promise(resolve=>{
  const attributes=['role','aria-modal','aria-labelledby','aria-describedby'];
  const previous=new Map(attributes.map(k=>[k,overlay.getAttribute(k)]));
  let closed=false,animation=0,last=0,elapsed=0,index=0;
  const characters=Array.from(story);
  overlay.replaceChildren(template.content.cloneNode(true));
  overlay.classList.add('vr-prologue-overlay');overlay.hidden=false;
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','vr-prologue-title');overlay.setAttribute('aria-describedby','vr-prologue-narration');
  const scene=overlay.querySelector('.vr-prologue');
  const start=overlay.querySelector('[data-prologue-start]'),back=overlay.querySelector('[data-prologue-back]');
  const image=overlay.querySelector('img'),paragraph=overlay.querySelector('#vr-prologue-story');
  const help=overlay.querySelector('.vr-prologue-help');
  scene.classList.toggle('is-still',still);
  // Screen readers receive the whole sentence once. Only the aria-hidden visual copy changes.
  const accessible=document.createElement('span');accessible.className='sr-only';accessible.id='vr-prologue-narration';accessible.textContent=story;
  const visual=document.createElement('span');visual.setAttribute('aria-hidden','true');
  const typed=document.createElement('span'),unread=document.createElement('span');
  typed.dataset.storyTyped='';unread.className='vr-prologue-unread';
  visual.append(typed,unread);paragraph.replaceChildren(accessible,visual);
  const render=()=>{
   typed.textContent=characters.slice(0,index).join('');
   unread.textContent=characters.slice(index).join('');
   const complete=index===characters.length;
   scene.classList.toggle('is-typing',!complete);
   start.textContent=complete?'Inizia la missione':'Mostra tutto';
   help.textContent=complete?'Invio o Spazio per proseguire · Esc per saltare':'Invio o Spazio per mostrare tutto · Esc per saltare';
  };
  const reveal=()=>{cancelAnimationFrame(animation);animation=0;index=characters.length;render();};
  const advance=()=>{if(index<characters.length)reveal();else finish(true);};
  function type(at){
   if(closed)return;
   elapsed+=last?Math.min(100,at-last):0;last=at;
   const before=index;
   while(index<characters.length){
    const delay=/[.,;:!?]/u.test(characters[index-1]||'')?180:32;
    if(elapsed<delay)break;
    elapsed-=delay;index++;
   }
   if(index!==before)render();
   animation=index<characters.length?requestAnimationFrame(type):0;
  }
  render();if(reducedMotion)reveal();else animation=requestAnimationFrame(type);
  image.addEventListener('error',()=>{image.hidden=true;},{once:true});
  // Markers retain prior inert states and survive canvas replacement after a graphics fallback.
  for(let branch=overlay;branch.parentElement&&branch!==document.body;branch=branch.parentElement){
   for(const sibling of branch.parentElement.children){
    if(sibling===branch||sibling.matches('script,style,template'))continue;
    if(!sibling.hasAttribute('data-vr-prologue-inert'))sibling.setAttribute('data-vr-prologue-inert',sibling.inert?'1':'0');
    sibling.inert=true;
   }
  }
  const finish=accepted=>{
   if(closed)return;closed=true;cancelAnimationFrame(animation);
   document.removeEventListener('keydown',key,true);
   for(const e of document.querySelectorAll('[data-vr-prologue-inert]')){
    e.inert=e.getAttribute('data-vr-prologue-inert')==='1';e.removeAttribute('data-vr-prologue-inert');
   }
   overlay.classList.remove('vr-prologue-overlay');overlay.hidden=true;
   for(const [k,v] of previous){if(v===null)overlay.removeAttribute(k);else overlay.setAttribute(k,v);}
   resolve(accepted);
  };
  const key=e=>{
   if(e.ctrlKey||e.altKey||e.metaKey)return;
   if(e.key==='Escape'){
    e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)finish(true);return;
   }
   if(e.key==='Tab'){
    const buttons=[start,back],at=buttons.indexOf(document.activeElement);
    if(at<0||e.shiftKey&&at===0||!e.shiftKey&&at===buttons.length-1){
     e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus({preventScroll:true});
    }
    return;
   }
   if(e.key==='Enter'||e.code==='Space'){
    if(e.repeat){e.preventDefault();e.stopImmediatePropagation();return;}
    if(!e.target.closest('button,a,input,select,textarea')){
     e.preventDefault();e.stopImmediatePropagation();advance();
    }
   }
  };
  start.onclick=advance;back.onclick=()=>finish(false);
  document.addEventListener('keydown',key,true);start.focus();
 });
}
window.VerrianPrologue={show};
})();
