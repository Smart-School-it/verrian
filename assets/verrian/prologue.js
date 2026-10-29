/* Welcome story only: no modal, focus changes or intermediate game state. */
(()=>{'use strict';
function mountStory({element,story,reducedMotion=false}){
 if(!element)return ()=>{};
 const characters=Array.from(story);let index=0,animation=0,last=0,elapsed=0,closed=false;
 // Only the visual copy changes: assistive technology receives the complete sentence once.
 const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=story;
 const visual=document.createElement('span');visual.setAttribute('aria-hidden','true');
 const typed=document.createElement('span'),unread=document.createElement('span');
 typed.dataset.storyTyped='';unread.className='vr-prologue-unread';
 visual.append(typed,unread);element.replaceChildren(accessible,visual);
 const render=()=>{typed.textContent=characters.slice(0,index).join('');unread.textContent=characters.slice(index).join('');};
 function frame(at){
  if(closed)return;
  elapsed+=last?Math.min(100,at-last):0;last=at;const before=index;
  while(index<characters.length){const delay=/[.,;:!?]/u.test(characters[index-1]||'')?180:32;if(elapsed<delay)break;elapsed-=delay;index++;}
  if(index!==before)render();
  animation=index<characters.length?requestAnimationFrame(frame):0;
 }
 if(reducedMotion)index=characters.length;
 render();if(index<characters.length)animation=requestAnimationFrame(frame);
 return ()=>{if(closed)return;closed=true;cancelAnimationFrame(animation);index=characters.length;render();};
}
window.VerrianPrologue={mountStory};
})();
