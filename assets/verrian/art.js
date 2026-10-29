/* Presentation only. Atlas frames, energy weapons and telegraphed mechanisms.
 * Sprite artwork faces left; positions remain anchored to the engine's feet.
 * No drawing or animation state participates in score/replay evaluation. */
(()=>{'use strict';const TAU=Math.PI*2,types=['crawler','drone','sentinel','phase'];
class Art{
 constructor(renderer){this.r=renderer;}
 /** Shared presentation rig: the projectile origins remain those of the deterministic engine. */
 /** Reusable screen-space fog banks, between Milan's scenery and the playable world. */
 /** Painted props share source rectangles and feet anchors in both renderers. */
 /** Workshop art is presentation metadata; item rules and prices stay in the deterministic core. */
 static worldBackground(id,scenery='milano'){const worlds={milano:{'memory-forge':'milano-centrale-v1','glitch-depths':'milano-navigli-v1','kernel-citadel':'milano-castello-v1'},digital:{'memory-forge':'forge-memory-v1','glitch-depths':'glitch-abyss-v1','kernel-citadel':'kernel-citadel-v1'}};return (worlds[scenery]||worlds.milano)[id]||null;}
 static worldLocation(id,scenery='milano'){if(id==='neon-frontier')return 'Duomo di Milano';return scenery==='digital'?'':({'memory-forge':'Stazione Centrale','glitch-depths':'Naviglio Grande','kernel-citadel':'Castello Sforzesco'}[id]||'');}
 static shopPose(id){const frames={medkit:[22,110,381,325],life:[435,91,300,360],cell:[782,60,214,399],core:[1035,119,335,332],armor1:[1390,80,345,382],armor2:[7,474,378,372],bike:[381,550,490,267],gauntlets:[842,510,350,313],disc:[1190,517,310,278],spear:[1410,440,364,417]},clips={bike:'381,550 750,550 835,630 871,725 871,817 381,817',gauntlets:'842,510 1192,510 1192,823 885,823 870,700 842,695',disc:'1190,517 1500,517 1500,740 1400,795 1190,795',spear:'1410,800 1700,440 1774,440 1774,510 1485,857 1410,857'},f=frames[id];return f?{image:'shop-atlas-v1',x:f[0],y:f[1],w:f[2],h:f[3],atlasWidth:1774,atlasHeight:887,clip:clips[id]||null}:null;}
 static propPose(kind,state=0,images=null){if(kind==='technician'){const image=!images||images['tecnico-verri-v4']?'tecnico-verri-v4':images['tecnico-verri-v1']?'tecnico-verri-v1':null;if(image){const f=state===2?(image==='tecnico-verri-v4'?[896,8,720,850,-49,-116,98,116]:[900,8,712,850,-49,-116,98,116]):[250,8,510,850,-35,-116,70,116];return {image,x:f[0],y:f[1],w:f[2],h:f[3],dx:f[4],dy:f[5],width:f[6],height:f[7]};}}const frames={
  technician:state===2?[459,8,419,474,-51,-116,102,116]:[65,8,294,474,-36,-116,72,116],
  cache:state===2?[1360,138,407,335,-38.5,-63,77,63]:[914,270,402,202,-38,-38,76,38],
  spring:[7,536,432,316,-35,-51,70,51],vent:[7,536,432,316,-32,-29,64,29],
  speed:[445,646,502,183,-76,-25,152,30],
  relay:state?[1360,450,408,400,-44,-86,88,86]:[948,450,381,400,-41,-86,82,86]
 };const f=frames[kind];return f?{image:'props-atlas-v1',x:f[0],y:f[1],w:f[2],h:f[3],dx:f[4],dy:f[5],width:f[6],height:f[7]}:null;}
 static fogLayers(time,camera=0){return [
  {y:155,height:245,stretch:1.65,alpha:.36,offset:time*7+camera*.12+190},
  {y:310,height:250,stretch:1.3,alpha:.48,offset:-time*11+camera*.18+620},
  {y:425,height:205,stretch:1.85,alpha:.55,offset:time*17+camera*.23+70}
 ];}
 static paintFog(c){const width=c.canvas.width,height=c.canvas.height;c.clearRect(0,0,width,height);
  // Wrapped elliptical wisps give a seamless tile without external downloads or per-frame filters.
  for(let i=0;i<12;i++){const cx=(i*137+73)%width,cy=height*.49+Math.sin(i*1.7)*29,rx=125+i%4*31,ry=36+i%3*17;
   for(const wrap of [-width,0,width]){c.save();c.translate(cx+wrap,cy);c.scale(rx,ry);const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'#173144b8');g.addColorStop(.42,'#1c3a4b70');g.addColorStop(1,'#223c4e00');c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();}
  }
 }
 static muzzle(p,x=p.x,y=p.y){return VerrianCore.blasterPose(p,x,y);}
 static shotTrail(h,alpha=1){return h.kind==='shot'?Math.min(3,Math.max(0,h.age-1+alpha)):3;}
 static wingKind(p,r,dt){const target=p.gliding?1:0;r.wingSpread=r.reduced||r.wingSpread===undefined?target:r.wingSpread+(target-r.wingSpread)*(1-Math.exp(-dt*14));return r.wingSpread>.85?'wings':r.wingSpread>.15?'wings-half':'wings-folded';}
 crouchBlade(c){c.save();c.rotate(.55);c.fillStyle='#1d3546';c.strokeStyle='#8aa7ba';c.lineWidth=1.3;c.beginPath();c.roundRect(-6,-3,10,6,2);c.fill();c.stroke();c.strokeStyle='#287e9d';c.lineWidth=6;c.beginPath();c.moveTo(4,0);c.lineTo(38,0);c.stroke();c.strokeStyle='#58e1ff';c.lineWidth=3;c.stroke();c.strokeStyle='#e1ffff';c.lineWidth=1;c.stroke();c.restore();}
 /** Cyan tip extension, calibrated to each painted pose; local coordinates are anchored to the feet. */
 static heroMotion(p,r,dt=0){const on=r.effects&&!r.reduced&&p.weapon==='blade'&&!p.crouch&&!p.attack&&!p.vehicle&&p.grounded;const target=on?Math.max(-.045,Math.min(.045,p.vx*.009)):0;r.heroLean=r.reduced?0:(r.heroLean||0)+(target-(r.heroLean||0))*(1-Math.exp(-dt*12));return {lean:on?r.heroLean:0,breath:on&&Math.abs(p.vx)<.1?1+Math.sin((r.time||0)*2.8)*.006:1};}
 static bladeSegment(frame,f){const points=[[159,277,223,334],[555,237,485,325],[1117,235,1167,309],[1450,226,1400,306],[102,585,66,706],[580,498,484,562],[1320,592,1424,591]],q=points[frame];if(!q)return null;const [hx,hy,tx,ty]=q,dx=tx-hx,dy=ty-hy,ox=f.x+f.a,oy=f.y+f.h;return {x:(tx-dx*.23-ox)*.265,y:(ty-dy*.23-oy)*.265,tx:(tx+dx*.20-ox)*.265,ty:(ty+dy*.20-oy)*.265};}
 extendBlade(c,frame,f){const s=Art.bladeSegment(frame,f);if(!s)return;c.save();c.lineCap='round';const grad=c.createLinearGradient(s.x,s.y,s.tx,s.ty);grad.addColorStop(0,'#5bdcff00');grad.addColorStop(.35,'#5bdcff55');grad.addColorStop(.8,'#8fefffaa');grad.addColorStop(1,'#b9ffff00');c.strokeStyle=grad;c.lineWidth=7;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.tx,s.ty);c.stroke();c.strokeStyle='#65e6ff';c.lineWidth=2.2;c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.tx,s.ty);c.stroke();c.strokeStyle='#eaffff';c.lineWidth=.8;c.stroke();c.restore();}
 /** One nine-frame circular trail, transformed to match stance and combo by both renderers. */
 static sweepPose(p){if(p.attack<=0||p.weapon!=='blade')return null;const combo=p.combo||1,grow=combo===3?1.22:1;return {frame:Math.max(1,Math.min(9,Math.round(p.attack))),y:p.crouch?-14:-44,sx:p.face*(p.crouch?1:grow),sy:p.crouch?.55:combo===2?-grow:grow,cx:p.crouch?40:38,cy:p.crouch?0:-8,rotation:p.crouch?0:-.18,rx:p.crouch?98:96,ry:p.crouch?44:74,alpha:Math.min(1,p.attack/4+.25)};}
 static paintBladeTrail(c,frame){const size=256,center=128,radius=96,start=-1.1,head=start+1.95*Math.min(1,(10-frame)/5),tail=Math.max(start,head-1.5),span=head-tail,data=c.createImageData(size,size),rgba=data.data;
  // Smooth angular fade into the wake and a Gaussian falloff around the luminous edge.
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=x+.5-center,dy=y+.5-center,angle=Math.atan2(dy,dx);if(angle<tail||angle>head)continue;const distance=Math.abs(Math.hypot(dx,dy)-radius);if(distance>23)continue;const along=(angle-tail)/span,edge=Math.min(1,(head-angle)/.055),wake=Math.pow(along,.7)*edge,halo=Math.exp(-distance*distance/105)*.28,core=Math.exp(-distance*distance/5)*.68,alpha=(halo+core)*wake;if(alpha<.002)continue;const i=(y*size+x)*4,hot=Math.exp(-distance*distance/9);rgba[i]=65+hot*153;rgba[i+1]=185+hot*65;rgba[i+2]=255;rgba[i+3]=Math.round(alpha*255);}
  c.putImageData(data,0,0);}
 static gearOffset(p){return p.crouch?30:0;}
 static heroPose(p){
  if(p.crouch){const k=Math.abs(p.vx)>.25?Math.floor(Math.abs(p.x)/9)%4:0;
   const f=[[50,70,330,320,120,315],[480,80,400,310,200,305],[950,80,350,310,160,305],[1350,80,424,310,230,305]][k];
   return {image:'verrian-poses-v2',key:k,x:f[0],y:f[1],w:f[2],h:f[3],ax:f[4],ay:f[5],scale:.20};}
  if(p.weapon==='blaster'){
   const k=!p.grounded?3:Math.abs(p.vx)>.5?1+Math.floor(Math.abs(p.x)/18)%2:0;
   const f=Art.rangedFrames[k];if(!f)return null;return {...f,image:'verrian-ranged-v1',key:k};}
  return null;
 }
 static enemyPose(e,images){const k=['leaper','mite','turret','wraith'].indexOf(e.type);if(k<0||!images['enemies-expansion-v1'])return null;
  const alternate=e.type==='leaper'?e.jump>0:e.type==='mite'?Math.floor(e.age/5)%2:e.type==='turret'?e.burst>0||e.windup>0:e.phased>0;
  const index=k+(alternate?4:0),f=[[0,85,470,360],[477,190,395,254],[880,45,444,395],[1330,0,444,444],[0,460,470,365],[477,550,395,270],[866,445,469,395],[1280,430,494,457]][index];
  const size=[[96,76],[62,35],[90,80],[106,112]][k];return {image:'enemies-expansion-v1',key:index,x:f[0],y:f[1],w:f[2],h:f[3],width:size[0],height:size[1]};
 }
 expansion(e,index,world,t){const r=this.r,c=r.ctx,f=Art.enemyPose(e,r.images);if(!f)return false;
  const alpha=e.phased>0?.34+(r.effects?Math.sin(e.age*.5)*.06:0):1;
  c.save();c.globalAlpha=alpha;c.scale(e.face===1?-1:1,1);const img=r.images[f.image];c.drawImage(img,f.x,f.y,f.w,f.h,-f.width/2,-f.height,f.width,f.height);
  if(r.tick-e.hitTick<4){c.globalCompositeOperation='screen';c.globalAlpha=.6;c.drawImage(img,f.x,f.y,f.w,f.h,-f.width/2,-f.height,f.width,f.height);}c.restore();
  if(e.windup>0){c.strokeStyle='#ffca85';c.lineWidth=2;c.beginPath();c.arc(0,-f.height*.5,f.width*.55,0,TAU);c.stroke();c.fillStyle='#ffe3b5';c.font='bold 20px monospace';c.textAlign='center';c.fillText('!',0,-f.height-12);}
  if(e.hp<e.maxHp){c.fillStyle='#16283b';c.fillRect(-24,-f.height-9,48,5);c.fillStyle='#ffb2a0';c.fillRect(-24,-f.height-9,48*Math.max(0,e.hp)/e.maxHp,5);}return true;
 }
 /** Compact articulated pulse cannon, with the barrel ending exactly at the simulation's muzzle. */
 cannon(c,flash=false){c.save();const metal=c.createLinearGradient(0,-12,0,11);metal.addColorStop(0,'#8ba7ba');metal.addColorStop(.25,'#304658');metal.addColorStop(.65,'#111d2c');metal.addColorStop(1,'#4c6577');c.fillStyle=metal;c.strokeStyle='#0a1420';c.lineWidth=1.4;c.beginPath();c.moveTo(-33,-7);c.lineTo(-25,-12);c.lineTo(-11,-10);c.lineTo(-6,-6);c.lineTo(0,-6);c.lineTo(0,6);c.lineTo(-9,6);c.lineTo(-14,10);c.lineTo(-28,8);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#7894a5';c.lineWidth=2;c.beginPath();c.moveTo(-24,-11);c.lineTo(-22,-18);c.lineTo(-8,-18);c.lineTo(-6,-7);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(-30,-6);c.lineTo(-16,-6);c.moveTo(-8,-4);c.lineTo(-2,-4);c.stroke();c.fillStyle='#132433';c.fillRect(-25,6,7,7);c.fillStyle='#9af6ff';c.fillRect(-27,-4,12,3);c.fillRect(-5,-3,2,6);c.strokeStyle='#8deaff';c.lineWidth=1.2;c.beginPath();c.arc(-13,-1,3,0,TAU);c.stroke();
  for(let i=0;i<3;i++){c.fillStyle=i%2?'#8babbc':'#233748';c.fillRect(-10+i*3,-6,1,12);}for(const [x,y] of [[-29,4],[-24,-8],[-17,6]]){c.fillStyle='#c1d0d6';c.fillRect(x,y,1,1);}
  if(flash){c.globalCompositeOperation='lighter';c.fillStyle='#89eaff77';c.beginPath();c.moveTo(0,-7);c.lineTo(20,-2);c.lineTo(27,0);c.lineTo(20,2);c.lineTo(0,7);c.closePath();c.fill();c.fillStyle='#eaffff';c.beginPath();c.ellipse(2,0,6,3,0,0,TAU);c.fill();}c.restore();
 }
 actor(e,index,world,t){if(this.expansion(e,index,world,t))return true;const r=this.r,c=r.ctx,img=r.images['enemies-atlas-v2'];if(!img)return false;const boss=e.type==='boss',cell=boss?4+index%4:types.indexOf(e.type);if(cell<0)return false;
 const size=boss?[[260,240],[285,245],[260,275],[275,285]][index%4]:[[100,78],[112,88],[100,112],[112,118]][cell];const [width,height]=size;
 const animate=r.effects&&!r.reduced,bob=animate?Math.sin(e.age*(e.charge?.5:.11))*(boss?2:3):0,tilt=animate?(e.charge?e.face*.1:e.windup?-e.face*.035:Math.sin(e.age*.09)*.018):0;
 const dizzy=e.stun>0;const punch=r.effects&&r.tick-e.hitTick<4?1+(4-(r.tick-e.hitTick))*.025:1;c.save();c.translate(0,bob+(dizzy?8:0));c.scale((e.face===1?-1:1)*punch,1/punch);c.rotate(tilt+(dizzy?Math.sin(t*6)*.05:0));
 // Low opacity silhouettes give phase assassins a displaced digital afterimage.
 if(e.type==='phase'&&animate){c.globalAlpha=.16;c.drawImage(img,(cell%4)*img.width/4,Math.floor(cell/4)*img.height/2,img.width/4,img.height/2,-width/2-7,-height+3,width,height);c.globalAlpha=1;}
 const sw=img.width/4,sh=img.height/2;c.drawImage(img,(cell%4)*sw,Math.floor(cell/4)*sh,sw,sh,-width/2,-height+5,width,height);
 if(r.tick-e.hitTick<4){c.globalCompositeOperation='screen';c.globalAlpha=.6;c.drawImage(img,(cell%4)*sw,Math.floor(cell/4)*sh,sw,sh,-width/2,-height+5,width,height);c.globalAlpha=1;c.globalCompositeOperation='source-over';}c.restore();
 c.save();
 if(dizzy){c.fillStyle='#ffe08a';for(let i=0;i<4;i++){const a=t*4+i*TAU/4;c.beginPath();c.arc(Math.cos(a)*48,-height-4+Math.sin(a)*10,5,0,TAU);c.fill();}}
 if(world.guarded(e)){c.strokeStyle='#dfb8ff';c.fillStyle='#b080ff12';c.lineWidth=3;const x=e.face*(boss?88:33),y=boss?-110:-53;c.beginPath();c.ellipse(x,y,boss?32:13,boss?83:42,0,0,TAU);c.fill();c.stroke();c.strokeStyle='#e2c5ff66';c.lineWidth=1;for(let i=-2;i<=2;i++){c.beginPath();c.moveTo(x-10,y+i*12);c.lineTo(x+10,y+i*12);c.stroke();}}
 if(e.windup>0){c.strokeStyle='#ffca85';c.lineWidth=3;c.beginPath();c.arc(0,-height*.5,width*.55,0,TAU);c.stroke();c.font='bold 20px monospace';c.textAlign='center';c.fillStyle='#ffe3b5';c.fillText('!',0,-height-12);if(e.type==='crawler'||boss){c.setLineDash([10,8]);c.beginPath();c.moveTo(e.face*width*.4,-8);c.lineTo(e.face*(width*.5+120),-8);c.stroke();c.setLineDash([]);}}
 if(e.charge>0&&animate){c.strokeStyle='#ff9d6477';c.lineWidth=3;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-e.face*(width*.4+15),-20-i*16);c.lineTo(-e.face*(width*.4+65),-20-i*16);c.stroke();}}
 if(!boss&&e.hp<e.maxHp){c.fillStyle='#16283b';c.fillRect(-24,-height-9,48,5);c.fillStyle='#ffb2a0';c.fillRect(-24,-height-9,48*Math.max(0,e.hp)/e.maxHp,5);}
 c.restore();return true;
 }
 // Original compact cyan slash; combat/combo rules remain in the simulation.
 /** Plasma whip and gravity hammer as polylines, shared by the Canvas and WebGL renderers. */
 static weaponStrokes(p,x,y){if(p.crouch)y+=34;const progress=Math.min(1,Math.max(0,(10-p.attack)/9)),f=p.face,out=[];
  if(p.weapon==='whip'){const reach=205*Math.sin(Math.min(1,progress*1.25)*Math.PI*.5+Math.max(0,progress-.8)*2.5)*(p.combo===3?1.08:1),amp=12*(1-progress),hx=x+f*18,hy=y-52,pts=[];for(let i=0;i<=18;i++){const k=i/18;pts.push(hx+f*reach*k,hy+Math.sin(k*9-progress*12)*amp*k+k*k*(p.combo===2?-26:18));}out.push({points:pts,width:9,color:'#ff7ae6',alpha:.35},{points:pts,width:3,color:'#ffd6f6',alpha:1});}
  else if(p.weapon==='spear'){const ext=Math.sin(Math.min(1,progress*1.4)*Math.PI*.5)*(1-Math.max(0,progress-.75)*2.4),len=180*Math.max(.15,ext),hx=x+f*14,hy=y-50,tip=hx+f*len;out.push({points:[hx,hy,tip,hy],width:10,color:'#7fd8ff',alpha:.35},{points:[hx,hy,tip,hy],width:3,color:'#e6f9ff',alpha:1},{points:[tip-f*16,hy-8,tip+f*8,hy,tip-f*16,hy+8],width:3,color:'#ffffff',alpha:1});}
  else if(p.weapon==='gauntlets'){const punch=Math.sin(Math.min(1,progress*2)*Math.PI),fx=x+f*(26+46*punch),fy=y-50+(p.combo===2?-10:p.combo===3?6:0),r=p.combo===3?22:14,pts=[];for(let i=0;i<=12;i++){const q=i/12*Math.PI*2;pts.push(fx+Math.cos(q)*r*punch,fy+Math.sin(q)*r*punch);}out.push({points:[x+f*14,fy,fx,fy],width:7,color:'#ffcf7a',alpha:.5},{points:pts,width:3,color:'#ffe2a8',alpha:.9*punch});}
  else if(p.weapon==='hammer'){const a0=-2.5,a1=.55,head=a0+(a1-a0)*Math.min(1,progress*1.6),tail=Math.max(a0,head-1.8),pts=[];for(let i=0;i<=16;i++){const q=tail+(head-tail)*i/16;pts.push(x+f*(16+Math.cos(q)*92),y-46+Math.sin(q)*84);}const hx=x+f*(16+Math.cos(head)*92),hy=y-46+Math.sin(head)*84;out.push({points:pts,width:16,color:'#ff9a4d',alpha:.32},{points:pts,width:6,color:'#ffe1b0',alpha:.95},{points:[hx-14,hy-10,hx+14,hy-10,hx+14,hy+10,hx-14,hy+10,hx-14,hy-10],width:5,color:'#ffd08a',alpha:1});}
  return out;}
 blade(x,y,p){const r=this.r,c=r.ctx;if(p.weapon==='blaster'||p.weapon==='disc')return;if(['whip','hammer','spear','gauntlets'].includes(p.weapon)){c.save();c.lineCap='round';c.lineJoin='round';for(const [i,s] of Art.weaponStrokes(p,x,y).entries()){c.globalAlpha=s.alpha;c.strokeStyle=s.color;c.lineWidth=s.width;c.shadowColor=s.color;c.shadowBlur=r.effects&&i===0?16:0;c.beginPath();c.moveTo(s.points[0],s.points[1]);for(let k=2;k<s.points.length;k+=2)c.lineTo(s.points[k],s.points[k+1]);c.stroke();}c.restore();return;}const f=Art.sweepPose(p);if(!f)return;c.save();c.translate(x,y+f.y);c.scale(f.sx,f.sy);c.translate(f.cx,f.cy);c.rotate(f.rotation);c.scale(f.rx/96,f.ry/96);c.globalAlpha=f.alpha;c.drawImage(r.bladeTrail(f.frame),-128,-128);c.restore();
 }
 projectile(h,x,y){const r=this.r,c=r.ctx;const warn=h.kind==='beam'?h.age<32:h.kind==='mine'?h.age<28:false;c.save();c.translate(x,y);
 if(h.kind==='beam'){c.strokeStyle=warn?'#ffc785':'#ffa8d0';c.fillStyle=warn?'#ffc78512':'#ff7cb755';c.lineWidth=warn?2:4;if(warn)c.setLineDash([9,8]);c.fillRect(-40,-250,80,250);c.strokeRect(-40,-250,80,250);c.setLineDash([]);if(!warn){c.fillStyle='#ffe0f2';c.fillRect(-5,-250,10,250);}else{c.font='bold 22px monospace';c.textAlign='center';c.fillStyle='#ffe1b0';c.fillText('!',0,-265);}}
 else if(h.kind==='mine'){c.strokeStyle=warn?'#e0afff':'#ffafd5';c.fillStyle=warn?'#bd80ff22':'#ff8fc766';c.lineWidth=3;c.beginPath();c.arc(0,0,warn?20+h.age:66,0,TAU);c.fill();c.stroke();c.fillStyle='#18253a';c.beginPath();c.arc(0,0,9,0,TAU);c.fill();c.strokeStyle=warn?'#e7c4ff':'#ffd3e4';c.lineWidth=2;c.stroke();c.fillStyle=warn?'#f6ddff':'#fff1f6';c.fillRect(-3,-3,6,6);}
 else if(h.kind==='disc'){const spin=h.age*.6;c.rotate(spin);c.strokeStyle='#9fe8ff';c.fillStyle='#1d3d55';c.lineWidth=3;c.shadowColor='#7fe8ff';c.shadowBlur=r.effects?14:0;c.beginPath();c.arc(0,0,h.heavy?15:12,0,TAU);c.fill();c.stroke();for(let i=0;i<4;i++){c.rotate(Math.PI/2);c.beginPath();c.moveTo(6,0);c.lineTo(h.heavy?19:16,-4);c.stroke();}}
 else{const color=h.kind==='shot'?'#8ff3ff':h.friendly?'#9affd1':h.kind==='wave'?'#ff91c3':h.kind==='orb'?'#c4a0ff':'#ffbe80';c.lineCap='round';c.shadowColor=color;c.shadowBlur=r.effects?14:0;c.beginPath();if(h.kind==='wave')c.ellipse(0,0,24,13,0,Math.PI,TAU);else{c.moveTo(0,0);c.lineTo(-h.dx*Art.shotTrail(h,r.alpha??1),-h.dy*Art.shotTrail(h,r.alpha??1));}if(r.effects){c.strokeStyle=color+'55';c.lineWidth=h.kind==='wave'?9:8;c.stroke();}c.shadowBlur=0;c.strokeStyle=color;c.lineWidth=h.kind==='wave'?4:3;c.stroke();if(h.kind!=='wave'){c.strokeStyle='#f4ffff';c.lineWidth=1;c.stroke();}c.fillStyle=color;c.beginPath();c.arc(0,0,h.kind==='orb'?10:h.heavy?8:5,0,TAU);c.fill();c.fillStyle='#fffdf2';c.beginPath();c.arc(-1,-1,h.kind==='orb'?4:h.heavy?3:2.5,0,TAU);c.fill();}c.restore();
 }
 /** Equipment state is visual only: quantised fuel cells and eight bounded flame textures. */
 static fuelFrame(fuel){return Math.max(0,Math.min(4,Math.ceil(fuel/VerrianCore.JET_FUEL*4)));}
 static jetFrame(t,animated=true){return animated?Math.floor(t*18)%8:0;}
 static jets(frame=0){const phase=(frame%8)*TAU/8;return [{x:-40,y:-39,r:6,length:25+Math.sin(phase)*5},{x:-21,y:-43,r:4.5,length:21+Math.sin(phase+.9)*4}];}
 static fuelGaugeY(p){return p.crouch?-73:-126;}
 /** Isolated source rectangles: full gear silhouettes, without stretching the character. */
 static equipmentPose(kind){return kind==='pack'?{x:70,y:115,w:570,h:665,dx:-49,dy:-86,width:42,height:50}:kind==='bike'?{x:707,y:260,w:1055,h:444,dx:-56,dy:-35,width:112,height:47}:null;}
 equipment(c,kind,fuel){const img=this.r.images['equipment-atlas-v1'],f=Art.equipmentPose(kind);if(!img||!f)return false;c.drawImage(img,f.x,f.y,f.w,f.h,f.dx,f.dy,f.width,f.height);
  if(kind==='pack'){c.fillStyle='#172735';c.fillRect(-28,-73.2,3.3,7);for(let i=0;i<4;i++){c.fillStyle=i<fuel?(fuel===1?'#ffc579':'#a4f3ff'):'#314957';c.fillRect(-27.5,-72.6+i*1.5,2.3,.9);}}return true;}
 /** Metal seams and screws stay readable at game scale without a glow filter. */
 jetpack(c,fuel=4){
  c.save();c.lineJoin='round';c.lineCap='round';
  c.strokeStyle='#172534';c.lineWidth=5;c.beginPath();c.moveTo(-20,-73);c.quadraticCurveTo(-8,-77,-8,-64);c.moveTo(-20,-51);c.lineTo(-7,-48);c.stroke();
  c.strokeStyle='#93adba';c.lineWidth=1.2;c.beginPath();c.moveTo(-22,-74);c.quadraticCurveTo(-10,-78,-9,-65);c.moveTo(-20,-51);c.lineTo(-8,-48);c.stroke();
  // Far pod, then near pod: visible depth, inset reactor, clamps, vents and fixed exhaust collars.
  for(const [i,j] of [...Art.jets()].reverse().entries()){
   const x=j.x,y=j.y,far=i===0,r=j.r,top=y-41;
   const body=c.createLinearGradient(x-r-3,0,x+r+3,0);body.addColorStop(0,'#101c29');body.addColorStop(.25,'#557185');body.addColorStop(.44,'#2e475b');body.addColorStop(.76,'#152637');body.addColorStop(1,'#718d9d');
   c.fillStyle=body;c.strokeStyle=far?'#4c6a7e':'#8aa4b4';c.lineWidth=1.1;c.beginPath();c.moveTo(x-r-2,top+9);c.lineTo(x-r+1,top+2);c.quadraticCurveTo(x,top-2,x+r,top+3);c.lineTo(x+r+3,top+10);c.lineTo(x+r+2,y-8);c.lineTo(x+r-1,y-3);c.lineTo(x-r,y-3);c.lineTo(x-r-3,y-9);c.closePath();c.fill();c.stroke();
   c.fillStyle='#101f2e';c.beginPath();c.roundRect(x-r+1,top+12,r*2-1,19,3);c.fill();c.strokeStyle='#1b3545';c.lineWidth=3;c.beginPath();c.moveTo(x-1,top+15);c.lineTo(x-1,top+27);c.stroke();c.strokeStyle=fuel?'#72dafa':'#46505a';c.lineWidth=1.8;c.stroke();
   for(const yy of [top+9,y-13]){c.fillStyle='#536c7d';c.fillRect(x-r-3,yy,r*2+6,3);c.fillStyle='#9bb0bb';c.fillRect(x-r-2,yy,2,2);}
   c.fillStyle='#0b1622';for(let n=0;n<3;n++)c.fillRect(x+1,top+17+n*4,3,2);
   const collar=c.createLinearGradient(0,y-8,0,y+1);collar.addColorStop(0,'#92a7b2');collar.addColorStop(.3,'#334c5f');collar.addColorStop(.7,'#142434');collar.addColorStop(1,'#9bc4d5');c.fillStyle=collar;c.beginPath();c.moveTo(x-r-2,y-8);c.lineTo(x+r+2,y-8);c.lineTo(x+r,y);c.lineTo(x-r,y);c.closePath();c.fill();c.strokeStyle='#080f18';c.lineWidth=1;c.stroke();c.fillStyle=fuel?'#8beaff':'#3b515e';c.beginPath();c.ellipse(x,y,r,1.5,0,0,TAU);c.fill();
  }
  // Central spine, live fuel cells and an amber safety latch.
  c.fillStyle='#182b3c';c.strokeStyle='#6d899a';c.lineWidth=1;c.beginPath();c.roundRect(-34,-76,7,29,3);c.fill();c.stroke();
  for(let i=0;i<4;i++){c.fillStyle=i<fuel?(fuel===1?'#ffc579':'#a1ecff'):'#324554';c.fillRect(-32.5,-70+i*5,3,3);}
  c.fillStyle='#e3ac69';c.fillRect(-35,-49,9,3);c.fillStyle='#141d26';c.fillRect(-31,-48,2,3);c.restore();
 }
 jetFlame(c,frame=0){c.save();for(const [i,j] of [...Art.jets(frame)].reverse().entries()){
  const {x,y,r,length}=j;
  const haze=c.createRadialGradient(x,y+length*.4,0,x,y+length*.4,length*.8);haze.addColorStop(0,'#5bd8ff44');haze.addColorStop(1,'#2f7cff00');c.fillStyle=haze;c.fillRect(x-r*3,y,r*6,length*1.8);
  const plume=c.createLinearGradient(0,y,0,y+length);plume.addColorStop(0,'#edffff');plume.addColorStop(.18,'#8deaff');plume.addColorStop(.48,'#38bdf7dd');plume.addColorStop(.8,'#587cf980');plume.addColorStop(1,'#7fa7ff00');c.fillStyle=plume;c.beginPath();c.moveTo(x-r,y);c.bezierCurveTo(x-r*.9,y+length*.32,x-r*.18,y+length*.6,x,y+length);c.bezierCurveTo(x+r*.27,y+length*.64,x+r,y+length*.28,x+r,y);c.closePath();c.fill();
  c.fillStyle='#f1ffff';c.beginPath();c.moveTo(x-r*.45,y);c.quadraticCurveTo(x-r*.3,y+length*.25,x,y+length*.58);c.quadraticCurveTo(x+r*.3,y+length*.25,x+r*.45,y);c.closePath();c.fill();
  // Compression rings are part of the plume, never a transform of the exhaust origin.
  c.strokeStyle='#cefbff99';c.lineWidth=.7;for(let n=1;n<4;n++){const yy=y+length*n*.18,rr=r*(1-n*.18);c.beginPath();c.ellipse(x,yy,rr,1.3,0,0,TAU);c.stroke();}
 }c.restore();}
 hoverBike(c){c.save();c.lineJoin='round';
  const hull=c.createLinearGradient(0,-27,0,7);hull.addColorStop(0,'#718b9c');hull.addColorStop(.25,'#304d63');hull.addColorStop(.55,'#142639');hull.addColorStop(1,'#3b5d72');c.fillStyle=hull;c.strokeStyle='#89b7ca';c.lineWidth=1.2;c.beginPath();c.moveTo(-53,-7);c.lineTo(-44,-18);c.lineTo(-21,-26);c.lineTo(6,-24);c.lineTo(35,-17);c.lineTo(53,-8);c.lineTo(45,2);c.lineTo(-39,5);c.closePath();c.fill();c.stroke();
  // Recessed chassis plates, seat, handlebar, tinted visor and nose light.
  for(const x of [-32,-8,16]){c.fillStyle='#182c40';c.strokeStyle='#4c7088';c.lineWidth=.8;c.beginPath();c.moveTo(x,-14);c.lineTo(x+17,-15);c.lineTo(x+12,-3);c.lineTo(x-3,-2);c.closePath();c.fill();c.stroke();c.fillStyle='#a7c0cb';c.fillRect(x+2,-11,1,1);}
  c.fillStyle='#101c2a';c.beginPath();c.roundRect(-24,-28,24,6,2);c.fill();c.strokeStyle='#7f9dad';c.lineWidth=2;c.beginPath();c.moveTo(2,-24);c.lineTo(10,-35);c.lineTo(19,-35);c.stroke();
  const glass=c.createLinearGradient(22,-36,40,-14);glass.addColorStop(0,'#a3eeff99');glass.addColorStop(1,'#2f77ad33');c.fillStyle=glass;c.strokeStyle='#8cd8f2';c.lineWidth=1;c.beginPath();c.moveTo(20,-20);c.lineTo(30,-37);c.quadraticCurveTo(39,-30,41,-15);c.closePath();c.fill();c.stroke();
  for(const x of [-34,32]){c.fillStyle='#0c1b29';c.strokeStyle='#54849b';c.beginPath();c.ellipse(x,3,13,5,0,0,TAU);c.fill();c.stroke();c.strokeStyle='#8eeaff';c.lineWidth=1.5;c.beginPath();c.ellipse(x,5,9,2,0,0,TAU);c.stroke();c.strokeStyle='#6ccfff44';c.lineWidth=3;c.beginPath();c.ellipse(x,9,13,2,0,0,TAU);c.stroke();}
  c.fillStyle='#baf4ff';c.fillRect(44,-9,7,3);c.fillStyle='#ffb071';c.fillRect(-51,-9,5,4);c.strokeStyle='#73dfff';c.lineWidth=1.4;c.beginPath();c.moveTo(-36,-18);c.lineTo(-20,-22);c.lineTo(2,-21);c.stroke();c.restore();
 }
 /** A centred miniature of the actual equipment, shared by game pickups and WebGL baked textures. */
 vehicleIcon(kind,c){c.save();const setup=kind==='jetpack'?[.67,31,60]:kind==='glider'?[.28,64,68]:[.37,0,8];c.scale(setup[0],setup[0]);c.translate(setup[1],setup[2]);this.vehicle(kind==='jetpack'?'pack':kind==='glider'?'wings':'bike',c);c.restore();}
 /** Vehicles drawn at the player's feet, facing right; the caller mirrors them with the player. */
 vehicle(kind,c,t=0,frame=4){c.save();if(this.equipment(c,kind,frame)){c.restore();return;}if(kind==='bike')this.hoverBike(c);
  else if(kind==='wings'||kind==='wings-folded'||kind==='wings-half'){
   const spread=kind==='wings'?1:kind==='wings-half'?.5:0;
   // Two staggered articulated planes. The rightmost hinge is attached to the back, not floating beside it.
   for(const side of [-1,1]){c.save();c.translate(-18,-68);c.rotate(side*.14-(1-spread)*1.1);c.scale(.55+.45*spread,(side===-1?.8:1)*(.75+.25*spread));
    const metal=c.createLinearGradient(-90,-38,-12,18);metal.addColorStop(0,'#597689');metal.addColorStop(.3,'#152b3d');metal.addColorStop(.65,'#344f62');metal.addColorStop(1,'#111c2b');
    c.fillStyle=metal;c.strokeStyle='#6a9aad';c.lineWidth=1.3;c.beginPath();c.moveTo(2,0);c.lineTo(-23,-17);c.lineTo(-92,-40);c.lineTo(-79,-22);c.lineTo(-38,8);c.lineTo(-10,12);c.closePath();c.fill();c.stroke();
    for(let i=0;i<5;i++){const x=-30-i*12,y=-12-i*4;c.fillStyle=i%2?'#293f53':'#3d5b6d';c.strokeStyle='#132336';c.beginPath();c.moveTo(x,y);c.lineTo(x-17,y-8);c.lineTo(x-7,y+14);c.lineTo(x+9,y+17);c.closePath();c.fill();c.stroke();c.strokeStyle='#91e9ff';c.lineWidth=1;c.beginPath();c.moveTo(x-12,y-5);c.lineTo(x-3,y+11);c.stroke();}
    c.strokeStyle='#73d7f0';c.lineWidth=2;c.beginPath();c.moveTo(-4,-2);c.lineTo(-28,-12);c.lineTo(-83,-33);c.stroke();
    for(const [x,y,r] of [[-4,0,7],[-28,-12,4],[-56,-23,3]]){c.fillStyle='#122336';c.strokeStyle='#9db9c8';c.lineWidth=1;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.stroke();c.fillStyle='#9bf4ff';c.beginPath();c.arc(x,y,2,0,TAU);c.fill();}
    c.restore();}
   c.fillStyle='#1b3043';c.strokeStyle='#7198a8';c.lineWidth=1.5;c.beginPath();c.roundRect(-27,-78,15,29,5);c.fill();c.stroke();c.fillStyle='#83e9ff';c.fillRect(-23,-72,3,16);
  }
  else if(kind==='pack')this.jetpack(c,frame);
  else if(kind==='flame')this.jetFlame(c,frame);
  c.restore();}
 /** Cracked wall hiding a vault; brighter cracks after each hit. */
 secretWall(w,c,l,t){VerrianTerrain.wall(c,w,l);}
 environment(w,t){const r=this.r,c=r.ctx,l=w.level,baked=r.sprites(l);for(const wall of w.walls||[])if(r.onScreen(wall.x,wall.x+wall.width)){const b=baked.walls[wall.id][wall.open?0:wall.hp];c.drawImage(b.canvas,b.x,b.y);}
 for(const m of w.moving){if(!r.onScreen(m.x-m.amplitude,m.x+m.rect[2]+m.amplitude))continue;const a=r.alpha??1,x=m.oldX+(m.rect[0]-m.oldX)*a,y=m.oldY+(m.rect[1]-m.oldY)*a,b=baked.movers[m.id];c.drawImage(b.canvas,x+b.x,y+b.y);}
 for(const vent of l.vents||[]){if(!r.onScreen(vent.x-vent.width,vent.x+vent.width))continue;const x=vent.x,y=vent.y;c.fillStyle='#203b49';c.fillRect(x-vent.width/2,y-8,vent.width,8);c.strokeStyle='#91ffd6';c.lineWidth=3;for(let i=0;i<3;i++){const up=(r.effects?(t*50+i*18)%55:i*18);c.globalAlpha=1-up/70;c.beginPath();c.moveTo(x-11,y-12-up);c.lineTo(x,y-23-up);c.lineTo(x+11,y-12-up);c.stroke();}c.globalAlpha=1;}
 for(const [i,zone] of (l.lasers||[]).entries()){if(!r.onScreen(zone.x,zone.x+zone.width))continue;const phase=(w.tick-w.stageStart+zone.offset)%zone.period,state=phase<25?1:phase<25+zone.on?2:0,b=baked.lasers[i][state];c.drawImage(b.canvas,b.x,b.y);}
 }
}
Art.rangedFrames=[[365,5,285,493,135,488],[885,10,370,488,180,483],[286,520,400,480,230,475],[990,520,245,470,135,455]].map(f=>({x:f[0],y:f[1],w:f[2],h:f[3],ax:f[4],ay:f[5],scale:.24}));
window.VerrianArt=Art;
})();
