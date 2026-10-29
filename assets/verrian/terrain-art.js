/* Shared environment illustration for Canvas and WebGL. All coordinates are decorative:
 * the walkable top, spike tips and laser states remain those of the deterministic core. */
(()=>{'use strict';
const poly=(c,points,fill,stroke)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.stroke();}};
const metal=(c,y,h,light='#526779',dark='#111d2a')=>{const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,light);g.addColorStop(.2,'#293e50');g.addColorStop(.55,dark);g.addColorStop(1,'#09121e');return g;};
function bolt(c,x,y){c.fillStyle='#050d17';c.beginPath();c.arc(x,y,2.6,0,Math.PI*2);c.fill();c.fillStyle='#94a9b6';c.fillRect(x-1,y-1,2,2);c.fillStyle='#314453';c.fillRect(x-1,y,2,1);}
class Terrain{
 static platform(c,q,index,l,effects,moving=false){
  const [x,y,w,h]=q,floating=h<50,accent=moving?'#a2f3ff':l.color;
  c.save();c.translate(x,y);c.lineWidth=1;
  // The lit top edge lies exactly on the collision surface, across its full width.
  if(floating){
   if(effects){const glow=c.createLinearGradient(0,h,0,h+44);glow.addColorStop(0,accent+'30');glow.addColorStop(1,accent+'00');c.fillStyle=glow;c.fillRect(14,h,w-28,44);}
   poly(c,[[0,1],[w,1],[w,h-7],[w-10,h+4],[w-32,h+10],[32,h+10],[10,h+4],[0,h-7]],metal(c,0,h+10),'#698291');
   poly(c,[[9,9],[w-9,9],[w-15,h-1],[w-34,h+3],[34,h+3],[15,h-1]],'#0a1623','#354e60');
   c.fillStyle='#233c4d';c.fillRect(30,12,w-60,Math.max(4,h-12));
   for(let at=39;at<w-30;at+=12){c.fillStyle='#08111e';c.fillRect(at,13,5,5);c.fillStyle='#627580';c.fillRect(at,13,1,4);}
   for(const at of [22,w-22]){
    poly(c,[[at-13,h-1],[at+13,h-1],[at+10,h+12],[at-10,h+12]],metal(c,h-1,14,'#667c8c'),'#708b9b');
    c.fillStyle='#071320';c.fillRect(at-8,h+8,16,4);c.fillStyle=accent;c.fillRect(at-6,h+9,12,2);
    if(effects){const jet=c.createLinearGradient(0,h+12,0,h+42);jet.addColorStop(0,accent+'a0');jet.addColorStop(.35,accent+'35');jet.addColorStop(1,accent+'00');poly(c,[[at-6,h+12],[at+6,h+12],[at+11,h+42],[at-11,h+42]],jet);c.fillStyle='#e5fdff';c.fillRect(at-4,h+12,8,2);}
   }
   c.strokeStyle=accent+'65';c.beginPath();c.moveTo(36,h+7);c.lineTo(w-36,h+7);c.stroke();
   bolt(c,10,9);bolt(c,w-10,9);
  }else{
   c.fillStyle=metal(c,0,h,'#435a6b');c.fillRect(0,0,w,h);
   // Recessed armor bays, ribs, service grilles and restrained weathering.
   for(let at=12,bay=0;at<w-12;at+=112,bay++){
    const bw=Math.min(96,w-at-9);if(bw<16)continue;
    poly(c,[[at,32],[at+bw-9,32],[at+bw,41],[at+bw,h-10],[at+9,h-10],[at,h-19]],'#101e2c','#344957');
    c.strokeStyle='#405766';c.beginPath();c.moveTo(at+5,36);c.lineTo(at+bw-11,36);c.lineTo(at+bw-4,43);c.stroke();
    c.fillStyle='#07111c';c.fillRect(at+8,49,bw-16,7);
    for(let vent=at+12;vent<at+bw-9;vent+=8){c.fillStyle='#47606d';c.fillRect(vent,50,2,4);}
    if(h>100){poly(c,[[at+9,73],[at+bw-14,h-27],[at+bw-5,h-27],[at+18,73]],'#263b49');c.fillStyle=accent+'38';c.fillRect(at+8,74,2,28);c.fillStyle='#08121d';c.fillRect(at+8,h-22,bw-16,5);}
    bolt(c,at+6,42);bolt(c,at+bw-6,h-18);
    c.strokeStyle='#86959c25';for(let i=0;i<3;i++){const sx=at+12+(bay*13+i*19)%(bw-12),sy=63+(bay*11+i*23)%Math.max(1,h-90);c.beginPath();c.moveTo(sx,sy);c.lineTo(Math.min(at+bw-4,sx+9),sy+3);c.stroke();}
   }
   for(const at of [0,w-12]){c.fillStyle='#314653';c.fillRect(at,8,12,h-8);c.fillStyle='#111e2c';c.fillRect(at+3,18,5,h-20);for(let sy=25;sy<h-9;sy+=42)bolt(c,at+6,sy);}
   c.fillStyle='#07111d';c.fillRect(0,h-8,w,8);
  }
  c.fillStyle=metal(c,0,8,'#8499a4');c.fillRect(0,0,w,8);
  c.fillStyle='#172735';for(let at=7;at<w-5;at+=16)c.fillRect(at,2,7,2);
  c.fillStyle='#d2e1e5';c.fillRect(0,0,w,1);c.fillStyle=accent;c.fillRect(1,6,w-2,2);
  if(effects){c.fillStyle=accent+'28';c.fillRect(1,8,w-2,3);}
  // Small inset end caps and panel IDs instead of oversized labels.
  for(const at of [2,w-18]){c.fillStyle='#111f2e';c.fillRect(at,9,16,3);c.fillStyle=accent;c.fillRect(at+3,10,8,1);}
  if(w>110){c.font='7px monospace';c.textAlign='center';c.fillStyle='#a4bac4';c.fillText((moving?'MV':'PL')+'·'+String(index+1).padStart(2,'0'),w/2,floating?18:24);}
  c.restore();
 }
 static trap(c,q,effects){
  const [x,y,w]=q;c.save();c.translate(x,y);c.lineWidth=1;
  c.fillStyle='#030a13';c.fillRect(-3,3,w+6,11);
  poly(c,[[0,0],[w,0],[w+3,4],[w+3,11],[-3,11],[-3,4]],metal(c,0,12,'#667381'),'#687786');
  c.save();c.beginPath();c.rect(3,4,w-6,5);c.clip();c.fillStyle='#c7a369';c.fillRect(3,4,w-6,5);for(let at=-5;at<w;at+=14)poly(c,[[at,4],[at+7,4],[at+12,9],[at+5,9]],'#17212b');c.restore();
  const count=Math.max(1,Math.floor((w-6)/18)),step=(w-6)/count;
  for(let i=0;i<count;i++){
   const at=3+step*i,cx=at+step/2;
   c.fillStyle='#07101a';c.fillRect(at+1,-2,step-2,5);
   poly(c,[[at+1,0],[cx,-19],[at+step-1,0]],metal(c,-19,21,'#d8dce1','#333b50'),'#a8acbc');
   poly(c,[[cx,-18],[cx+1,-3],[at+step-2,0]],'#233147');
   c.strokeStyle='#fb91b4';c.beginPath();c.moveTo(cx,-14);c.lineTo(cx,-3);c.stroke();
   if(effects){c.strokeStyle='#ff719233';c.lineWidth=3;c.stroke();c.lineWidth=1;}
   c.fillStyle='#e2edf1';c.fillRect(cx,-18,1,3);
  }
  for(const at of [0,w-4]){c.fillStyle='#303f50';c.fillRect(at,-2,4,14);bolt(c,at+2,9);}
  c.restore();
 }
 static route(c,m){
  const horizontal=m.axis==='x',x=m.x+m.width/2,y=m.y+9;
  c.save();c.strokeStyle='#a1e9ff28';c.lineWidth=1;c.setLineDash([3,9]);c.beginPath();c.moveTo(x-(horizontal?m.amplitude:0),y-(horizontal?0:m.amplitude));c.lineTo(x+(horizontal?m.amplitude:0),y+(horizontal?0:m.amplitude));c.stroke();c.setLineDash([]);
  c.strokeStyle='#9be6ff55';for(const sign of [-1,1]){c.beginPath();c.arc(x+(horizontal?m.amplitude*sign:0),y+(horizontal?0:m.amplitude*sign),3,0,Math.PI*2);c.stroke();}c.restore();
 }
 static laser(c,z,state,effects){
  const {x,y,width:w,height:h}=z,on=state===2,warning=state===1,color=on?'#ff84b0':warning?'#ffc979':'#536878';
  c.save();c.translate(x,y);c.lineWidth=1;
  // The danger field fills the original rectangle only while the core enables it.
  if(on){
   const field=c.createLinearGradient(0,0,0,h);field.addColorStop(0,'#ff88b826');field.addColorStop(.6,'#ff48781c');field.addColorStop(1,'#ff689c50');c.fillStyle=field;c.fillRect(0,0,w,h);
   for(let at=8;at<w;at+=16){if(effects){const glow=c.createLinearGradient(at-5,0,at+5,0);glow.addColorStop(0,'#ff629b00');glow.addColorStop(.5,'#ff629b99');glow.addColorStop(1,'#ff629b00');c.fillStyle=glow;c.fillRect(at-5,0,10,h);}c.fillStyle='#ff88b9';c.fillRect(at-1,0,3,h);c.fillStyle='#ffe1ed';c.fillRect(at,0,1,h-3);}
   c.fillStyle='#ffb6ce';c.fillRect(0,0,w,1);
  }else if(warning){
   c.strokeStyle='#ffc97999';c.setLineDash([3,5]);c.strokeRect(.5,.5,w-1,h-1);c.setLineDash([]);
   for(let at=8;at<w;at+=16){c.fillStyle='#ffcc8138';c.fillRect(at,Math.max(0,h-13),1,8);}
  }
  poly(c,[[-4,h-5],[w+4,h-5],[w+7,h-1],[w+7,h+5],[-7,h+5],[-7,h-1]],metal(c,h-5,11,'#6e7882'),'#7a8994');
  c.fillStyle='#0a111d';c.fillRect(0,h-4,w,4);
  for(let at=8;at<w;at+=16){c.fillStyle='#111725';c.fillRect(at-5,h-7,11,6);c.fillStyle='#718496';c.fillRect(at-4,h-6,9,2);c.fillStyle=color;c.fillRect(at-2,h-7,5,2);c.fillStyle='#232f40';c.fillRect(at-3,h+1,7,2);}
  for(const at of [-5,w+1]){c.fillStyle='#354553';c.fillRect(at,h-4,4,8);c.fillStyle=color;c.fillRect(at+1,h-3,2,2);}
  c.restore();
 }
 static wall(c,w,l){
  const x=w.x,y=w.y-w.height,bw=w.width,h=w.height;c.save();c.translate(x,y);c.lineWidth=1;
  if(w.open){c.strokeStyle=l.color+'35';c.setLineDash([3,7]);c.strokeRect(1,1,bw-2,h-2);c.restore();return;}
  c.fillStyle='#050d17';c.fillRect(-2,0,bw+4,h+4);poly(c,[[0,5],[5,0],[bw-5,0],[bw,5],[bw,h],[0,h]],metal(c,0,h,'#6c7379'),'#8c949a');
  for(let sy=12;sy<h-6;sy+=29){poly(c,[[4,sy],[bw-8,sy],[bw-4,sy+5],[bw-4,sy+23],[4,sy+23]],'#1c2e3b','#465765');bolt(c,6,sy+4);bolt(c,bw-6,sy+19);c.fillStyle='#07111d';c.fillRect(8,sy+8,Math.max(1,bw-16),3);}
  const damage=3-w.hp;c.strokeStyle=damage?'#ffc27d':l.color+'90';c.lineWidth=damage>1?2:1;c.beginPath();c.moveTo(bw*.58,2);c.lineTo(bw*.35,h*.28);c.lineTo(bw*.66,h*.5);c.lineTo(bw*.38,h*.76);c.lineTo(bw*.5,h-2);if(damage){c.moveTo(bw*.35,h*.28);c.lineTo(1,h*.38);c.moveTo(bw*.66,h*.5);c.lineTo(bw-1,h*.63);}c.stroke();
  if(damage>1){c.fillStyle='#06101b';poly(c,[[bw*.35,h*.28],[bw*.66,h*.5],[bw*.3,h*.63],[bw*.45,h*.48]],'#07121c','#ffbd7c');}
  c.fillStyle=l.color+'65';c.fillRect(2,h-5,bw-4,2);c.restore();
 }
}
if(typeof module==='object'&&module.exports)module.exports=Terrain;else window.VerrianTerrain=Terrain;
})();
