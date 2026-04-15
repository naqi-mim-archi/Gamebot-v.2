import React, { useState, useRef, useEffect } from 'react';
import { X, Search, LayoutTemplate, ArrowLeft, Wand2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Template {
  id: string;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  hint: string;
  canvas: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'survival',
    icon: '🛡️',
    name: 'Survival',
    desc: 'Top-down wave survival',
    tags: ['2D', 'Action'],
    hint: 'E.g. Add power-ups, a boss enemy every 5 waves, weapon upgrades or ammo pickups',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#2d6a3a"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PX=4;let t=0;const en=[{a:.5,r:55,s:.022},{a:2.1,r:60,s:.019},{a:3.7,r:58,s:.024},{a:5.0,r:52,s:.021}];function f(){t++;for(let r=0;r<35;r++)for(let cl=0;cl<70;cl++){c.fillStyle=(r+cl)%2?'#2d6a3a':'#3a7d44';c.fillRect(cl*PX,r*PX,PX,PX);}[[4,4],[36,4],[60,4],[4,28],[36,28],[60,28]].forEach(([x,y])=>{c.fillStyle='#1b4d28';c.fillRect(x*PX,y*PX,PX*2,PX*3);c.fillStyle='#0d3018';c.fillRect(x*PX,y*PX,PX*2,PX);});en.forEach(e=>{e.a+=e.s;const ex=140+Math.cos(e.a)*e.r,ey=70+Math.sin(e.a)*e.r*.7;c.fillStyle='#66bb6a';c.fillRect(ex-PX,ey,PX*2,PX+2);c.fillStyle='#a5d6a7';c.fillRect(ex-PX*.5,ey-PX*.5,PX,PX*.5);});const leg=t%16<8?2:-2;c.fillStyle='#ff7043';c.fillRect(136,64,PX*2,PX*3);c.fillStyle='#ffcc80';c.fillRect(138,60,PX,PX);c.fillStyle='#bf360c';c.fillRect(136,76,PX-1,PX+leg);c.fillRect(140,76,PX-1,PX-leg);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'platformer',
    icon: '🏃',
    name: 'Platformer',
    desc: 'Side-scrolling run & jump adventure',
    tags: ['2D', 'Action'],
    hint: 'E.g. Add double jump, moving platforms, a checkpoint system, boss at the end',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#0a1628"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0,py=72,vy=0;const P=[{x:0,w:280,y:100},{x:10,w:95,y:72},{x:145,w:80,y:52},{x:50,w:60,y:38}];const coins=[{x:48,y:60},{x:64,y:60},{x:167,y:40},{x:183,y:40}];function f(){t+=.05;const bg=c.createLinearGradient(0,0,0,140);bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1c3d6e');c.fillStyle=bg;c.fillRect(0,0,280,140);for(let i=0;i<28;i++){c.globalAlpha=.3+.4*Math.sin(t*1.5+i);c.fillStyle='#fff';c.fillRect(i*10%280,i*13%55,i%3?1:2,i%3?1:2);}c.globalAlpha=1;[10,70,130,190,240].forEach((x,i)=>{const mx=((x-t*10)|0+600)%280;c.fillStyle=i%2?'#1a3d66':'#142d4e';c.beginPath();c.moveTo(mx,140);c.lineTo(mx+22,140-30-i%3*14);c.lineTo(mx+44,140);c.fill();});P.forEach(p=>{const g=c.createLinearGradient(0,p.y,0,p.y+10);g.addColorStop(0,'#4caf50');g.addColorStop(.4,'#388e3c');g.addColorStop(1,'#1b5e20');c.fillStyle=g;c.fillRect(p.x,p.y,p.w,10);c.fillStyle='#81c784';c.fillRect(p.x+2,p.y,p.w-4,2);});coins.forEach(co=>{c.save();c.shadowColor='#ffd700';c.shadowBlur=14;c.fillStyle='#ffc107';c.beginPath();c.arc(co.x,co.y+Math.sin(t*2.8+co.x*.08)*2.5,5,0,6.28);c.fill();c.restore();});vy+=.19;py+=vy;P.forEach(p=>{if(53>p.x&&53<p.x+p.w&&py+15>=p.y&&py+15<p.y+9&&vy>=0){py=p.y-15;vy=0;}});if(py>130)py=72;const leg=Math.sin(t*9)*5;c.save();c.shadowColor='#ff7043';c.shadowBlur=8;c.fillStyle='#ff7043';c.fillRect(47,py,12,11);c.restore();c.fillStyle='#ffcc02';c.beginPath();c.arc(53,py-5,6,0,6.28);c.fill();c.fillStyle='#37474f';c.fillRect(47,py+10,5,5+leg);c.fillRect(54,py+10,5,5-leg);const ex=((190+Math.sin(t*.7)*30)|0);c.fillStyle='#e53935';c.fillRect(ex,87,13,14);c.fillStyle='#ffcdd2';c.beginPath();c.arc(ex+6,85,6,0,6.28);c.fill();c.fillStyle='#b71c1c';c.fillRect(ex+3,91,7,4);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'rpg',
    icon: '⚔️',
    name: 'RPG',
    desc: 'Top-down adventure with combat',
    tags: ['2D', 'RPG'],
    hint: 'E.g. Add magic spells, a shop system, multiple dungeon rooms, save progress',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#0a0a12"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const TILES=[];for(let r=0;r<6;r++)for(let cl=0;cl<8;cl++)TILES.push({x:cl*35,y:r*23,wall:Math.random()>.78});let t=0,sparks=[];function f(){t+=.05;c.fillStyle='#0a0a12';c.fillRect(0,0,280,140);TILES.forEach(tl=>{if(tl.wall){const g=c.createLinearGradient(tl.x,tl.y,tl.x,tl.y+23);g.addColorStop(0,'#1e1e2e');g.addColorStop(1,'#12121e');c.fillStyle=g;c.fillRect(tl.x,tl.y,34,22);c.strokeStyle='#2a2a3e';c.lineWidth=1;c.strokeRect(tl.x,tl.y,34,22);}else{c.fillStyle='#141420';c.fillRect(tl.x,tl.y,34,22);c.fillStyle='#1a1a28';c.fillRect(tl.x,tl.y,17,11);c.fillRect(tl.x+17,tl.y+11,17,11);}});const px=130+Math.cos(t*.5)*25,py=65+Math.sin(t*.4)*18;c.save();c.shadowColor='#4fc3f7';c.shadowBlur=15;c.fillStyle='#0288d1';c.fillRect(px-6,py-2,12,16);c.restore();c.fillStyle='#ffd54f';c.beginPath();c.arc(px,py-7,7,0,6.28);c.fill();const sw=Math.sin(t*3)*25;c.save();c.shadowColor='#e0e0e0';c.shadowBlur=6;c.strokeStyle='#e0e0e0';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(px+6,py+3);c.lineTo(px+6+sw,py+3-sw*.7);c.stroke();c.restore();const ex=px+60+Math.sin(t*.8)*15,ey=py+Math.cos(t*.6)*10;c.fillStyle='#7b1fa2';c.beginPath();c.arc(ex,ey,9,0,6.28);c.fill();c.fillStyle='#ce93d8';c.beginPath();c.arc(ex,ey-9,5,0,6.28);c.fill();if(Math.random()<.08)sparks.push({x:px+6+sw*.7,y:py+3-sw*.5,vx:(Math.random()-.5)*3,vy:-Math.random()*3,l:12});sparks=sparks.filter(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.2;s.l--;c.fillStyle=\`rgba(255,220,50,\${s.l/12})\`;c.fillRect(s.x,s.y,2,2);return s.l>0;});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'space-invaders',
    icon: '👾',
    name: 'Space Invaders',
    desc: 'Classic alien invasion arcade',
    tags: ['2D', 'Arcade'],
    hint: 'E.g. Add shields that degrade, a UFO bonus ship, missile power-ups, difficulty levels',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PX=4;let t=0,dir=1,ox=0;function inv(x,y,col){const fr=t%24<12;c.fillStyle=col;const a=fr?[[1,0],[0,1],[2,1],[1,1],[0,2],[2,2]]:[[0,0],[2,0],[1,0],[0,1],[1,1],[2,1],[1,2]];a.forEach(([dx,dy])=>c.fillRect((x+dx)*PX,(y+dy)*PX,PX,PX));}function f(){t++;if(t%40===0){ox+=dir*2;if(Math.abs(ox)>24)dir*=-1;}c.fillStyle='#000';c.fillRect(0,0,280,140);for(let i=0;i<15;i++){c.fillStyle='rgba(255,255,255,.4)';c.fillRect((i*137+t)%280,(i*97)%110,1,1);}for(let row=0;row<3;row++)for(let ci=0;ci<5;ci++){const col=row===0?'#f44':row===1?'#fa0':'#ff4';inv(8+ci*11+(ox/PX|0),6+row*7,col);}[[12,27],[23,27],[34,27]].forEach(([x,y])=>{c.fillStyle='#4caf50';for(let r=0;r<4;r++)for(let cl=0;cl<3;cl++)if(!(r===3&&cl===1))c.fillRect((x+cl)*PX,(y+r)*PX,PX,PX);});const cx=35;c.fillStyle='#fff';c.fillRect((cx-2)*PX,32*PX,PX*4,PX*2);c.fillRect(cx*PX,31*PX,PX,PX);if(t%60<5){c.fillStyle='#fff';c.fillRect(cx*PX,(31-(t%60))*PX,PX/2,PX*4);}requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'pong',
    icon: '🏓',
    name: 'Pong',
    desc: 'Classic two-player paddle game',
    tags: ['2D', 'Classic'],
    hint: 'E.g. Add AI opponent, power-ups, obstacle in the middle, shrinking paddle mechanic',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#000"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PX=4;let bx=35,by=17,vx=.45,vy=.32,p1y=12,p2y=12;function f(){bx+=vx;by+=vy;if(by<1||by>33){vy=-vy;}if(bx<3&&by>=p1y&&by<=p1y+8){vx=Math.abs(vx)+.02;vy+=(by-p1y-4)*.05;}if(bx>67&&by>=p2y&&by<=p2y+8){vx=-(Math.abs(vx)+.02);vy+=(by-p2y-4)*.05;}if(bx<-2||bx>72){bx=35;by=17;vx=(Math.random()>.5?1:-1)*.45;vy=(Math.random()>.5?1:-1)*.32;}p1y+=(by-p1y-4)*.06;p2y+=(by-p2y-4)*.04;p1y=Math.max(0,Math.min(27,p1y));p2y=Math.max(0,Math.min(27,p2y));c.fillStyle='#000';c.fillRect(0,0,280,140);for(let i=1;i<17;i+=2){c.fillStyle='rgba(255,255,255,.25)';c.fillRect(138,i*PX*.5,PX,PX*.5);}c.fillStyle='#fff';c.fillRect(PX,(p1y*PX)|0,PX*2,PX*8);c.fillRect(274-PX,(p2y*PX)|0,PX*2,PX*8);c.fillRect((bx*PX)|0,(by*PX)|0,PX,PX);c.font='bold 20px monospace';c.fillStyle='rgba(255,255,255,.5)';c.textAlign='center';c.fillText('3',90,24);c.fillText('2',190,24);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'space-shooter',
    icon: '🚀',
    name: 'Space Shooter',
    desc: 'Arcade shoot-em-up in space',
    tags: ['2D', 'Arcade'],
    hint: 'E.g. Add a boss fight every 5 waves, shield system, different weapon upgrades',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#03010f"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const stars=Array.from({length:50},(_,i)=>({x:i*5.6%280,y:i*7.3%140,s:.2+i%4*.25,sp:.2+i%3*.35}));let t=0,bullets=[];const enemies=[{x:50,y:12},{x:90,y:12},{x:130,y:12},{x:170,y:12},{x:210,y:12},{x:70,y:30},{x:110,y:30},{x:150,y:30},{x:190,y:30}];function f(){t++;c.fillStyle='#03010f';c.fillRect(0,0,280,140);stars.forEach(s=>{s.y=(s.y+s.sp)%140;c.fillStyle=\`rgba(255,255,255,\${s.s})\`;c.fillRect(s.x,s.y,s.s>.6?2:1,s.s>.6?2:1);});if(t%16==0)bullets.push({x:140,y:112,trail:[]});bullets=bullets.filter(b=>{b.trail.push({x:b.x,y:b.y});if(b.trail.length>6)b.trail.shift();b.y-=5;b.trail.forEach((pt,i)=>{c.fillStyle=\`rgba(0,245,212,\${i/6*.6})\`;c.fillRect(pt.x-1,pt.y,3,5);});c.save();c.shadowColor='#00f5d4';c.shadowBlur=10;c.fillStyle='#00f5d4';c.fillRect(b.x-1.5,b.y,3,8);c.restore();return b.y>-10;});enemies.forEach((e,i)=>{e.x+=Math.sin(t*.025+i*.7)*.7;e.y=12+(i>=5?20:0)+Math.sin(t*.04+i*.4)*4;c.save();c.shadowColor='#f72585';c.shadowBlur=12;c.fillStyle='#f72585';c.beginPath();c.moveTo(e.x+9,e.y);c.lineTo(e.x,e.y+18);c.lineTo(e.x+18,e.y+18);c.fill();c.fillStyle='#ff9de2';c.beginPath();c.moveTo(e.x+9,e.y+3);c.lineTo(e.x+4,e.y+14);c.lineTo(e.x+14,e.y+14);c.fill();c.restore();});c.save();c.shadowColor='#7b2fff';c.shadowBlur=18;c.fillStyle='#7b2fff';c.beginPath();c.moveTo(140,128);c.lineTo(124,142);c.lineTo(156,142);c.fill();c.fillStyle='#b47fff';c.beginPath();c.moveTo(140,120);c.lineTo(130,136);c.lineTo(150,136);c.fill();c.restore();requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'tower-defense',
    icon: '🏰',
    name: 'Tower Defense',
    desc: 'Place towers to stop enemy waves',
    tags: ['2D', 'Strategy'],
    hint: 'E.g. Add 2 more tower types, upgrades, a flying enemy lane, end-game boss wave',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#0d1a0d"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PATH=[{x:-20,y:70},{x:50,y:70},{x:50,y:30},{x:130,y:30},{x:130,y:110},{x:210,y:110},{x:300,y:110}];const TOWERS=[{x:90,y:52,col:'#4fc3f7'},{x:90,y:90,col:'#81c784'},{x:170,y:70,col:'#ffb74d'}];let t=0,enemies=[{p:0,hp:1},{p:50,hp:.7},{p:100,hp:.4}],beams=[];function lerp(a,b,f){return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}function ptOnPath(d){let rem=d;for(let i=0;i<PATH.length-1;i++){const dx=PATH[i+1].x-PATH[i].x,dy=PATH[i+1].y-PATH[i].y,len=Math.sqrt(dx*dx+dy*dy);if(rem<=len)return lerp(PATH[i],PATH[i+1],rem/len);rem-=len;}return PATH[PATH.length-1];}function f(){t+=.5;c.fillStyle='#0d1a0d';c.fillRect(0,0,280,140);for(let r=0;r<7;r++)for(let cl=0;cl<14;cl++){c.fillStyle=(r+cl)%2?'#0f1f0f':'#111a11';c.fillRect(cl*20,r*20,20,20);}c.strokeStyle='#2e5c2e';c.lineWidth=16;c.lineCap='round';c.lineJoin='round';c.beginPath();PATH.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.strokeStyle='#3a7a3a';c.lineWidth=2;c.setLineDash([6,8]);c.stroke();c.setLineDash([]);TOWERS.forEach(tw=>{c.save();c.shadowColor=tw.col;c.shadowBlur=12;c.fillStyle=tw.col+'44';c.beginPath();c.arc(tw.x,tw.y,22,0,6.28);c.fill();c.fillStyle='#37474f';c.fillRect(tw.x-8,tw.y-8,16,16);c.fillStyle=tw.col;c.fillRect(tw.x-5,tw.y-5,10,10);c.fillStyle=tw.col;c.fillRect(tw.x-2,tw.y-16,4,12);c.restore();});beams=beams.filter(b=>{b.life--;c.save();c.globalAlpha=b.life/8;c.strokeStyle=b.col;c.lineWidth=2;c.shadowColor=b.col;c.shadowBlur=6;c.beginPath();c.moveTo(b.x1,b.y1);c.lineTo(b.x2,b.y2);c.stroke();c.restore();return b.life>0;});enemies.forEach(e=>{e.p=(e.p+t*.3)%280;const pos=ptOnPath(e.p);if(t%40<2){const tw=TOWERS[Math.floor(t/40)%3];beams.push({x1:tw.x,y1:tw.y,x2:pos.x,y2:pos.y,col:tw.col,life:8});}c.save();c.shadowColor='#f44336';c.shadowBlur=8;c.fillStyle='#f44336';c.beginPath();c.arc(pos.x,pos.y,6,0,6.28);c.fill();c.fillStyle='#212121';c.fillRect(pos.x-7,pos.y-13,14,4);c.fillStyle='#4caf50';c.fillRect(pos.x-7,pos.y-13,14*e.hp,4);c.restore();});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'endless-runner',
    icon: '🌵',
    name: 'Endless Runner',
    desc: 'Dodge obstacles forever',
    tags: ['2D', 'Arcade'],
    hint: 'E.g. Add double jump, sliding mechanic, coin collection, different obstacle types',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#1a0a2e"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0,py=88,vy=0,obs=[{x:260,h:22},{x:380,h:18}],dust=[];function f(){t+=.05;const sky=c.createLinearGradient(0,0,0,100);sky.addColorStop(0,'#1a0a2e');sky.addColorStop(1,'#3d1c6e');c.fillStyle=sky;c.fillRect(0,0,280,100);c.fillStyle='#6a0dad';c.fillRect(0,100,280,40);c.fillStyle='#4a0080';c.fillRect(0,100,280,6);for(let i=0;i<6;i++){c.fillStyle='rgba(180,100,255,.25)';c.fillRect(((i*60-t*120)|0+600)%280,100,36,4);}vy+=.22;py+=vy;if(py>=88){py=88;vy=-4.2;}if(py<20)py=20;obs=obs.map(o=>({...o,x:o.x-3.5}));obs.forEach(o=>{if(o.x<-20)o.x=280+Math.random()*80;c.fillStyle='#00e676';c.fillRect(o.x,100-o.h,10,o.h);c.fillStyle='#69f0ae';c.fillRect(o.x-3,100-o.h,16,5);c.fillRect(o.x-1,100-o.h-8,12,6);});if(Math.random()<.15)dust.push({x:50,y:py+18,l:10});dust=dust.filter(d=>{d.x-=1;d.l--;c.fillStyle=\`rgba(200,150,255,\${d.l/10*.4})\`;c.beginPath();c.arc(d.x,d.y,d.l/3,0,6.28);c.fill();return d.l>0;});const leg=Math.sin(t*10)*5;c.save();c.shadowColor='#e040fb';c.shadowBlur=12;c.fillStyle='#ce93d8';c.fillRect(44,py,14,18);c.restore();c.fillStyle='#ffd54f';c.beginPath();c.arc(51,py-6,7,0,6.28);c.fill();c.fillStyle='#4a148c';c.fillRect(44,py+16,5,6+leg);c.fillRect(53,py+16,5,6-leg);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'match3',
    icon: '💎',
    name: 'Match 3',
    desc: 'Swap gems to match 3 or more',
    tags: ['2D', 'Casual'],
    hint: 'E.g. Add special gem types (bomb, lightning), a level system, time bonuses',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#0d0d1f"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const GEM=[['#f44336','#ff8a65'],['#4caf50','#a5d6a7'],['#2196f3','#90caf9'],['#ff9800','#ffcc80'],['#9c27b0','#ce93d8'],['#00bcd4','#80deea']];const grid=[];for(let r=0;r<3;r++)for(let cl=0;cl<6;cl++)grid.push({r,cl,v:Math.floor(Math.random()*6),flash:0});let t=0;function drawGem(x,y,sz,v,bright){const[col,hi]=GEM[v];c.save();if(bright){c.shadowColor=col;c.shadowBlur=18;}const g=c.createRadialGradient(x+sz*.3,y+sz*.25,sz*.05,x+sz/2,y+sz/2,sz*.7);g.addColorStop(0,bright?'#fff':hi);g.addColorStop(.5,col);g.addColorStop(1,col+'aa');c.fillStyle=g;c.beginPath();c.moveTo(x+sz/2,y+2);c.lineTo(x+sz-2,y+sz/2);c.lineTo(x+sz/2,y+sz-2);c.lineTo(x+2,y+sz/2);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.moveTo(x+sz/2,y+3);c.lineTo(x+sz-4,y+sz/2);c.lineTo(x+sz/2,y+sz/2);c.lineTo(x+4,y+sz/2);c.closePath();c.fill();c.restore();}function f(){t++;if(t%55==0){const i=Math.floor(Math.random()*17),j=i+1;const tmp=grid[i].v;grid[i].v=grid[j].v;grid[j].v=tmp;grid[i].flash=20;grid[j].flash=20;}c.fillStyle='#0d0d1f';c.fillRect(0,0,280,140);c.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<6;i++)c.fillRect(i*47+2,0,45,140);grid.forEach(g=>{g.flash=Math.max(0,g.flash-1);const sz=36,x=14+g.cl*(sz+5),y=20+g.r*(sz+5);drawGem(x,y,sz,g.v,g.flash>0);});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'snake',
    icon: '🐍',
    name: 'Snake',
    desc: 'Classic snake with a twist',
    tags: ['2D', 'Classic'],
    hint: 'E.g. Add walls/obstacles, portal tunnels, speed boost food, multiplayer mode',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#050f05"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const S=10,W=28,H=14;let snake=[{x:14,y:7},{x:13,y:7},{x:12,y:7},{x:11,y:7}],dir={x:1,y:0},food={x:22,y:3},t=0;function f(){t++;if(t%7==0){const h={x:(snake[0].x+dir.x+W)%W,y:(snake[0].y+dir.y+H)%H};if(h.x==food.x&&h.y==food.y){food={x:2+Math.floor(Math.random()*(W-4)),y:1+Math.floor(Math.random()*(H-2))};if(dir.x!=0&&Math.random()>.5)dir={x:0,y:dir.x>0?1:-1};else if(dir.y!=0)dir={x:dir.y>0?1:-1,y:0};}else snake.pop();snake.unshift(h);}c.fillStyle='#020c02';c.fillRect(0,0,280,140);c.strokeStyle='rgba(0,80,0,.4)';c.lineWidth=.5;for(let i=0;i<=W;i++){c.beginPath();c.moveTo(i*S,0);c.lineTo(i*S,140);c.stroke();}for(let i=0;i<=H;i++){c.beginPath();c.moveTo(0,i*S);c.lineTo(280,i*S);c.stroke();}snake.forEach((s,i)=>{const ratio=1-i/snake.length;c.save();c.shadowColor='#00e676';c.shadowBlur=i===0?14:4*ratio;const hue=120+i*3;c.fillStyle=\`hsl(\${hue},100%,\${35+15*ratio}%)\`;c.fillRect(s.x*S+1,s.y*S+1,S-2,S-2);if(i===0){c.fillStyle='#fff';c.fillRect(s.x*S+2,s.y*S+2,3,3);c.fillRect(s.x*S+6,s.y*S+2,3,3);}c.restore();});c.save();c.shadowColor='#ff1744';c.shadowBlur=16+Math.sin(t*.15)*6;c.fillStyle='#ff1744';c.beginPath();c.arc(food.x*S+S/2,food.y*S+S/2,S/2-1,0,6.28);c.fill();c.restore();requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'breakout',
    icon: '🧱',
    name: 'Breakout',
    desc: 'Ball and paddle brick breaker',
    tags: ['2D', 'Classic'],
    hint: 'E.g. Add more power-up types, a boss brick, laser paddle upgrade, level editor',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#07071a"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const ROWS=[['#ef5350','#e53935'],['#ff7043','#f4511e'],['#ffca28','#ffb300'],['#66bb6a','#43a047'],['#42a5f5','#1e88e5']];let bx=140,by=95,vx=2.2,vy=-2.6,px=115,trail=[];const bricks=[];for(let r=0;r<5;r++)for(let cl=0;cl<8;cl++)bricks.push({x:8+cl*33,y:10+r*16,alive:true,r});function f(){bx+=vx;by+=vy;if(bx<6||bx>274)vx=-vx;if(by<6)vy=-vy;if(by>118){by=95;bx=140;trail=[];}if(by>108&&by<118&&bx>px-4&&bx<px+54){vy=-Math.abs(vy);vx+=(bx-(px+25))/20;}bricks.forEach(b=>{if(b.alive&&bx+5>b.x&&bx-5<b.x+29&&by+5>b.y&&by-5<b.y+12){b.alive=false;vy=-vy;}});if(bricks.every(b=>!b.alive))bricks.forEach(b=>b.alive=true);px=bx-27;if(px<0)px=0;if(px>226)px=226;trail.push({x:bx,y:by});if(trail.length>10)trail.shift();const bg=c.createLinearGradient(0,0,0,140);bg.addColorStop(0,'#07071a');bg.addColorStop(1,'#0d0d2b');c.fillStyle=bg;c.fillRect(0,0,280,140);bricks.forEach(b=>{if(!b.alive)return;const[col,dark]=ROWS[b.r];const g=c.createLinearGradient(b.x,b.y,b.x,b.y+12);g.addColorStop(0,col);g.addColorStop(1,dark);c.fillStyle=g;c.fillRect(b.x,b.y,29,12);c.fillStyle='rgba(255,255,255,.22)';c.fillRect(b.x+1,b.y+1,27,5);});trail.forEach((pt,i)=>{c.globalAlpha=(i/trail.length)*.5;c.fillStyle='#fff';c.beginPath();c.arc(pt.x,pt.y,3*(i/trail.length),0,6.28);c.fill();});c.globalAlpha=1;c.save();c.shadowColor='#fff';c.shadowBlur=14;c.fillStyle='#ffffff';c.beginPath();c.arc(bx,by,5,0,6.28);c.fill();c.restore();const pg=c.createLinearGradient(px,110,px,118);pg.addColorStop(0,'#b0bec5');pg.addColorStop(1,'#607d8b');c.fillStyle=pg;c.fillRect(px,110,54,8);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(px+2,110,50,4);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'memory',
    icon: '🃏',
    name: 'Memory Cards',
    desc: 'Card flip memory challenge',
    tags: ['2D', 'Puzzle'],
    hint: 'E.g. Add difficulty levels (6×6 grid), time limit mode, multiplayer scores',
    canvas: `<html><body style="margin:0;overflow:hidden;background:#0d0d1a"><canvas id="c" width="280" height="140"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const EMOJIS=['🌟','🎮','🔥','💎','🚀','🎯'];const BACKS=['#1a237e','#4a148c','#1b5e20','#b71c1c','#e65100','#006064'];const cards=[];for(let i=0;i<12;i++)cards.push({x:(i%6)*45+7,y:i<6?12:74,v:EMOJIS[i%6],bc:BACKS[i%6],phase:Math.random()*Math.PI*2,speed:.018+Math.random()*.012});let t=0;function f(){t++;c.fillStyle='#0d0d1a';c.fillRect(0,0,280,140);c.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<14;i++)c.fillRect(i*20,0,1,140);for(let i=0;i<8;i++)c.fillRect(0,i*17,280,1);cards.forEach(card=>{card.phase+=card.speed;const flip=Math.cos(card.phase);const faceUp=flip>0;const sx=Math.abs(flip);const sw=38,sh=50;c.save();c.translate(card.x+sw/2,card.y+sh/2);c.scale(sx,1);const g=c.createLinearGradient(-sw/2,-sh/2,-sw/2,sh/2);if(faceUp){g.addColorStop(0,'#ffffff');g.addColorStop(1,'#e0e0e0');c.fillStyle=g;c.beginPath();c.roundRect(-sw/2,-sh/2,sw,sh,6);c.fill();c.strokeStyle='#bdbdbd';c.lineWidth=1;c.stroke();c.font='20px serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#000';c.fillText(card.v,0,2);}else{g.addColorStop(0,card.bc+'dd');g.addColorStop(1,card.bc+'88');c.fillStyle=g;c.save();c.shadowColor=card.bc;c.shadowBlur=8;c.beginPath();c.roundRect(-sw/2,-sh/2,sw,sh,6);c.fill();c.restore();c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1.5;c.beginPath();c.roundRect(-sw/2+3,-sh/2+3,sw-6,sh-6,3);c.stroke();}c.restore();});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
];

const TAG_COLORS: Record<string, string> = {
  '2D': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  '3D': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Action: 'bg-red-500/15 text-red-400 border-red-500/20',
  Arcade: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Puzzle: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Strategy: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  RPG: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Casual: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
  Classic: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

function getChips(hint: string): string[] {
  return hint
    .replace(/^E\.g\.\s*/i, '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

interface Props {
  onSelect: (files: Record<string, string>, hint: string) => void;
  onClose: () => void;
  hasSteam?: boolean;
  onSteamLibrary?: () => void;
}

function TemplateCard({ t, onPreview }: { t: Template; onPreview: (t: Template) => void }) {
  const cardRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      ref={cardRef}
      onClick={() => onPreview(t)}
      className="group text-left bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:border-emerald-500/40"
    >
      <div className="w-full relative bg-zinc-950" style={{ height: '140px' }}>
        {visible ? (
          <iframe
            srcDoc={t.canvas}
            className="w-full h-full border-0 block pointer-events-none"
            sandbox="allow-scripts"
            title={`${t.name} preview`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl opacity-40">{t.icon}</span>
          </div>
        )}
        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3" /> Use template
          </span>
        </div>
      </div>
      <div className="px-3 py-2">
        <p className="text-xs font-semibold text-white mb-1">{t.name}</p>
        <div className="flex flex-wrap gap-1">
          {t.tags.map(tag => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${TAG_COLORS[tag] || 'bg-white/5 text-zinc-400 border-white/10'}`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

export default function GameTemplatesModal({ onSelect, onClose, hasSteam, onSteamLibrary }: Props) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Template | null>(null);
  const [userPrompt, setUserPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filtered = TEMPLATES.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(g => g.toLowerCase().includes(search.toLowerCase()))
  );

  function handlePreview(t: Template) {
    setSelected(t);
    setUserPrompt('');
    // Focus textarea after animation
    setTimeout(() => textareaRef.current?.focus(), 150);
  }

  function handleBack() {
    setSelected(null);
    setUserPrompt('');
  }

  async function handleStart() {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch(`/templates/${selected.id}.json`);
      if (!res.ok) throw new Error('not found');
      const files = await res.json();
      onSelect(files, userPrompt.trim() || selected.hint);
      onClose();
    } catch {
      onSelect({}, userPrompt.trim() || selected.hint);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function appendChip(chip: string) {
    setUserPrompt(p => p.trim() ? `${p.trim()}, ${chip}` : chip);
    textareaRef.current?.focus();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 shrink-0">
            {selected ? (
              <button
                onClick={handleBack}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <LayoutTemplate className="w-5 h-5 text-emerald-400" />
            )}
            <h2 className="text-base font-bold text-white font-display flex-1">
              {selected ? selected.name : 'Choose a Template'}
            </h2>
            {!selected && (
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  autoFocus
                />
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body — animated switch between grid and customize */}
          <AnimatePresence mode="wait" initial={false}>
            {selected ? (
              /* ── CUSTOMIZE STEP ── */
              <motion.div
                key="customize"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 32 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-5"
              >
                {/* Template preview card */}
                <div className="flex gap-4 bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden">
                  <div className="w-48 shrink-0 bg-zinc-900" style={{ height: '110px' }}>
                    <iframe
                      srcDoc={selected.canvas}
                      className="w-full h-full border-0 block pointer-events-none"
                      sandbox="allow-scripts"
                      title={selected.name}
                    />
                  </div>
                  <div className="flex-1 py-3 pr-4 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{selected.icon}</span>
                      <span className="font-bold text-white text-sm">{selected.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-2 leading-relaxed">{selected.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map(tag => (
                        <span key={tag} className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${TAG_COLORS[tag] || 'bg-white/5 text-zinc-400 border-white/10'}`}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Question + textarea */}
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    ✨ What would you like to add or change?
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={userPrompt}
                    onChange={e => setUserPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStart(); }}
                    placeholder={selected.hint}
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 resize-none outline-none transition-all leading-relaxed"
                  />
                  <p className="text-[11px] text-zinc-600 mt-1.5">Tip: leave blank to use the starter game as-is, or type what you want to change.</p>
                </div>

                {/* Idea chips */}
                <div>
                  <p className="text-xs text-zinc-500 mb-2 font-medium">Quick ideas:</p>
                  <div className="flex flex-wrap gap-2">
                    {getChips(selected.hint).map(chip => (
                      <button
                        key={chip}
                        onClick={() => appendChip(chip)}
                        className="px-3 py-1.5 rounded-full text-xs bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/8 hover:border-white/20 transition-all duration-150 flex items-center gap-1"
                      >
                        <span className="text-emerald-400 font-bold">+</span> {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/40 mt-auto"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      Loading template...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Start Building
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              /* ── GRID STEP ── */
              <motion.div
                key="grid"
                initial={{ opacity: 0, x: -32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-max"
              >
                {filtered.map(t => (
                  <TemplateCard key={t.id} t={t} onPreview={handlePreview} />
                ))}

                {/* Steam Library card */}
                {hasSteam && (
                  <button
                    onClick={() => { onClose(); onSteamLibrary?.(); }}
                    className="group text-left bg-gradient-to-br from-sky-950/60 to-zinc-900/60 hover:from-sky-900/60 hover:to-zinc-800/60 border border-sky-500/15 hover:border-sky-500/30 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
                  >
                    <div className="text-2xl mb-2">🎮</div>
                    <p className="text-sm font-semibold text-white mb-0.5">Steam Library</p>
                    <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">Pick a game from your Steam library as inspiration</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-sky-500/15 text-sky-400 border-sky-500/20">Steam</span>
                    </div>
                  </button>
                )}

                {filtered.length === 0 && (
                  <div className="col-span-full text-center py-12 text-zinc-500 text-sm">
                    No templates match &quot;{search}&quot;
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
