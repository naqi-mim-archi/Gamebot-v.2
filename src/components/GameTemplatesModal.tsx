import React, { useState, useRef, useEffect } from 'react';
import { X, Search, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Template {
  id: string;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  prompt: string;
  canvas: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'platformer',
    icon: '🏃',
    name: 'Platformer',
    desc: 'Side-scrolling run & jump adventure',
    tags: ['2D', 'Action'],
    prompt: 'Create a 2D side-scrolling platformer with a hero that runs, jumps, and collects coins. Include enemies to avoid, multiple platforms, particle effects on jump/land, and a score system. Pixel art aesthetic.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0,py=72,vy=0;const P=[{x:0,w:280,y:100},{x:10,w:95,y:72},{x:145,w:80,y:52},{x:50,w:60,y:38}];const coins=[{x:48,y:60},{x:64,y:60},{x:167,y:40},{x:183,y:40}];function f(){t+=.05;const bg=c.createLinearGradient(0,0,0,120);bg.addColorStop(0,'#0a1628');bg.addColorStop(1,'#1c3d6e');c.fillStyle=bg;c.fillRect(0,0,280,120);for(let i=0;i<28;i++){c.globalAlpha=.3+.4*Math.sin(t*1.5+i);c.fillStyle='#fff';c.fillRect(i*10%280,i*13%55,i%3?1:2,i%3?1:2);}c.globalAlpha=1;[10,70,130,190,240].forEach((x,i)=>{const mx=((x-t*10)|0+600)%280;c.fillStyle=i%2?'#1a3d66':'#142d4e';c.beginPath();c.moveTo(mx,120);c.lineTo(mx+22,120-30-i%3*14);c.lineTo(mx+44,120);c.fill();});P.forEach(p=>{const g=c.createLinearGradient(0,p.y,0,p.y+10);g.addColorStop(0,'#4caf50');g.addColorStop(.4,'#388e3c');g.addColorStop(1,'#1b5e20');c.fillStyle=g;c.fillRect(p.x,p.y,p.w,10);c.fillStyle='#81c784';c.fillRect(p.x+2,p.y,p.w-4,2);});coins.forEach(co=>{c.save();c.shadowColor='#ffd700';c.shadowBlur=14;c.fillStyle='#ffc107';c.beginPath();c.arc(co.x,co.y+Math.sin(t*2.8+co.x*.08)*2.5,5,0,6.28);c.fill();c.fillStyle='rgba(255,255,180,.6)';c.beginPath();c.arc(co.x-1.5,co.y+Math.sin(t*2.8+co.x*.08)*2.5-2,2,0,6.28);c.fill();c.restore();});vy+=.19;py+=vy;P.forEach(p=>{if(53>p.x&&53<p.x+p.w&&py+15>=p.y&&py+15<p.y+9&&vy>=0){py=p.y-15;vy=0;}});if(py>110)py=72;const leg=Math.sin(t*9)*5;c.save();c.shadowColor='#ff7043';c.shadowBlur=8;c.fillStyle='#ff7043';c.fillRect(47,py,12,11);c.restore();c.fillStyle='#ffcc02';c.beginPath();c.arc(53,py-5,6,0,6.28);c.fill();c.fillStyle='#37474f';c.fillRect(47,py+10,5,5+leg);c.fillRect(54,py+10,5,5-leg);const ex=((190+Math.sin(t*.7)*30)|0);c.fillStyle='#e53935';c.fillRect(ex,87,13,14);c.fillStyle='#ffcdd2';c.beginPath();c.arc(ex+6,85,6,0,6.28);c.fill();c.fillStyle='#b71c1c';c.fillRect(ex+3,91,7,4);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'space-shooter',
    icon: '🚀',
    name: 'Space Shooter',
    desc: 'Arcade shoot-em-up in space',
    tags: ['2D', 'Arcade'],
    prompt: 'Create a top-down space shooter. Player ship moves with WASD/arrows, shoots with spacebar. Waves of enemy ships, power-ups, explosions with particles, high score tracking. Neon/retro aesthetic.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const stars=Array.from({length:50},(_,i)=>({x:i*5.6%280,y:i*7.3%120,s:.2+i%4*.25,sp:.2+i%3*.35}));let t=0,bullets=[],particles=[];const enemies=[{x:50,y:12},{x:90,y:12},{x:130,y:12},{x:170,y:12},{x:210,y:12},{x:70,y:30},{x:110,y:30},{x:150,y:30},{x:190,y:30}];function f(){t++;c.fillStyle='#03010f';c.fillRect(0,0,280,120);stars.forEach(s=>{s.y=(s.y+s.sp)%120;c.fillStyle=\`rgba(255,255,255,\${s.s})\`;c.fillRect(s.x,s.y,s.s>.6?2:1,s.s>.6?2:1);});if(t%16==0)bullets.push({x:140,y:92,trail:[]});bullets=bullets.filter(b=>{b.trail.push({x:b.x,y:b.y});if(b.trail.length>6)b.trail.shift();b.y-=5;b.trail.forEach((pt,i)=>{c.fillStyle=\`rgba(0,245,212,\${i/6*.6})\`;c.fillRect(pt.x-1,pt.y,3,5);});c.save();c.shadowColor='#00f5d4';c.shadowBlur=10;c.fillStyle='#00f5d4';c.fillRect(b.x-1.5,b.y,3,8);c.restore();return b.y>-10;});enemies.forEach((e,i)=>{e.x+=Math.sin(t*.025+i*.7)*.7;e.y=12+(i>=5?20:0)+Math.sin(t*.04+i*.4)*4;c.save();c.shadowColor='#f72585';c.shadowBlur=12;c.fillStyle='#f72585';c.beginPath();c.moveTo(e.x+9,e.y);c.lineTo(e.x,e.y+18);c.lineTo(e.x+18,e.y+18);c.fill();c.fillStyle='#ff9de2';c.beginPath();c.moveTo(e.x+9,e.y+3);c.lineTo(e.x+4,e.y+14);c.lineTo(e.x+14,e.y+14);c.fill();c.restore();});c.save();c.shadowColor='#7b2fff';c.shadowBlur=18;c.fillStyle='#7b2fff';c.beginPath();c.moveTo(140,110);c.lineTo(124,124);c.lineTo(156,124);c.fill();c.fillStyle='#b47fff';c.beginPath();c.moveTo(140,102);c.lineTo(130,118);c.lineTo(150,118);c.fill();c.restore();c.save();c.shadowColor='#00f5d4';c.shadowBlur=8;c.fillStyle='#00f5d4';c.fillRect(136,110,8,12);c.restore();for(let i=0;i<4;i++){c.globalAlpha=.5-.1*i;c.fillStyle=i<2?'#ff9800':'#ff5722';c.beginPath();c.arc(140,124+i*3,4-i*.8,0,6.28);c.fill();}c.globalAlpha=1;requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'puzzle',
    icon: '🧩',
    name: 'Puzzle',
    desc: 'Match or slide puzzle challenge',
    tags: ['2D', 'Puzzle'],
    prompt: 'Create a sliding tile puzzle game. 4x4 grid, numbered tiles, shuffle button, move counter, timer, win detection with confetti animation. Clean minimal UI.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PAL=['#e63946','#2a9d8f','#e9c46a','#457b9d','#f4a261','#7209b7','#06d6a0','#fb5607'];const tiles=[];for(let r=0;r<3;r++)for(let cl=0;cl<5;cl++)tiles.push({r,cl,v:(r*5+cl+1)%15||15,tx:0,flash:0});let t=0;function f(){t++;if(t%70==0){const i=Math.floor(Math.random()*14),j=i+1;const tmp=tiles[i].v;tiles[i].v=tiles[j].v;tiles[j].v=tmp;tiles[i].flash=15;tiles[j].flash=15;}c.fillStyle='#0d0d1a';c.fillRect(0,0,280,120);const ox=15,oy=8,sw=48,sh=32,g=4;tiles.forEach(tl=>{tl.flash=Math.max(0,tl.flash-1);const x=ox+tl.cl*(sw+g),y=oy+tl.r*(sh+g);const col=PAL[tl.v%8];const fl=tl.flash/15;c.save();if(fl>0){c.shadowColor=col;c.shadowBlur=20*fl;}const grad=c.createLinearGradient(x,y,x,y+sh);grad.addColorStop(0,fl>0?'#fff':col);grad.addColorStop(1,fl>0?col:col+'99');c.fillStyle=grad;c.beginPath();c.roundRect(x,y,sw,sh,6);c.fill();c.fillStyle='rgba(255,255,255,.18)';c.beginPath();c.roundRect(x+2,y+2,sw-4,sh/2.5,4);c.fill();c.fillStyle=fl>0?'#000':'rgba(0,0,0,.6)';c.font='bold 13px system-ui';c.textAlign='center';c.textBaseline='middle';c.fillText(tl.v,x+sw/2,y+sh/2+1);c.restore();});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'racing',
    icon: '🏎️',
    name: 'Racing',
    desc: 'Top-down or 3D racing game',
    tags: ['3D', 'Racing'],
    prompt: 'Create a 3D top-down racing game. Car controlled with arrow keys, track with curves and obstacles, lap timer, opponent AI car, speed boost pickups. Arcade physics.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0;function drawRoad(){const segs=8;for(let i=segs;i>=0;i--){const y0=120-i*16,y1=120-(i-1)*16||120,w=18+i*22,w1=18+(i+1)*22,cx=140+Math.sin(t+i*.4)*30;c.fillStyle=i%2?'#3a3a3a':'#484848';c.beginPath();c.moveTo(cx-w,y0);c.lineTo(cx+w,y0);c.lineTo(cx+w1,y1);c.lineTo(cx-w1,y1);c.fill();if(i<segs){c.fillStyle='rgba(255,255,200,.5)';c.fillRect(cx-3,y0,6,4);}c.fillStyle='#555';c.fillRect(cx-w-15,y0,12,y1-y0);c.fillRect(cx+w+3,y0,12,y1-y0);}}\nfunction f(){t+=.04;const bg=c.createLinearGradient(0,0,0,60);bg.addColorStop(0,'#1a0a2e');bg.addColorStop(1,'#2d1b4e');c.fillStyle=bg;c.fillRect(0,0,280,60);c.fillStyle='#1a2a1a';c.fillRect(0,60,280,60);drawRoad();const cx=140+Math.sin(t)*.5*20;c.save();c.shadowColor='#ff1744';c.shadowBlur=16;c.fillStyle='#f44336';c.beginPath();c.roundRect(cx-11,78,22,14,3);c.fill();c.fillStyle='#ef9a9a';c.beginPath();c.roundRect(cx-8,78,16,8,2);c.fill();c.fillStyle='#212121';[[-13,88],[-13,84],[9,88],[9,84]].forEach(([dx,dy])=>{c.beginPath();c.arc(cx+dx,dy,3.5,0,6.28);c.fill();});c.restore();const cx2=140+Math.sin(t+1.8)*22;c.fillStyle='#1565c0';c.beginPath();c.roundRect(cx2-10,62,20,13,3);c.fill();requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'tower-defense',
    icon: '🏰',
    name: 'Tower Defense',
    desc: 'Place towers to stop enemy waves',
    tags: ['2D', 'Strategy'],
    prompt: 'Create a tower defense game on a grid. Player places towers (3 types: basic, sniper, splash) on a path to stop waves of enemies. Enemies have health bars, towers have range indicators. Gold economy system.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const PATH=[{x:-20,y:60},{x:50,y:60},{x:50,y:25},{x:130,y:25},{x:130,y:95},{x:210,y:95},{x:300,y:95}];const TOWERS=[{x:90,y:45,col:'#4fc3f7'},{x:90,y:78,col:'#81c784'},{x:170,y:60,col:'#ffb74d'}];let t=0,enemies=[{p:0,hp:1},{p:50,hp:.7},{p:100,hp:.4}],beams=[];function lerp(a,b,f){return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};}function ptOnPath(d){let rem=d;for(let i=0;i<PATH.length-1;i++){const dx=PATH[i+1].x-PATH[i].x,dy=PATH[i+1].y-PATH[i].y,len=Math.sqrt(dx*dx+dy*dy);if(rem<=len)return lerp(PATH[i],PATH[i+1],rem/len);rem-=len;}return PATH[PATH.length-1];}function f(){t+=.5;c.fillStyle='#0d1a0d';c.fillRect(0,0,280,120);for(let r=0;r<6;r++)for(let cl=0;cl<14;cl++){c.fillStyle=(r+cl)%2?'#0f1f0f':'#111a11';c.fillRect(cl*20,r*20,20,20);}c.strokeStyle='#2e5c2e';c.lineWidth=16;c.lineCap='round';c.lineJoin='round';c.beginPath();PATH.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.strokeStyle='#3a7a3a';c.lineWidth=2;c.setLineDash([6,8]);c.stroke();c.setLineDash([]);TOWERS.forEach(tw=>{c.save();c.shadowColor=tw.col;c.shadowBlur=12;c.fillStyle=tw.col+'44';c.beginPath();c.arc(tw.x,tw.y,22,0,6.28);c.fill();c.fillStyle='#37474f';c.fillRect(tw.x-8,tw.y-8,16,16);c.fillStyle=tw.col;c.fillRect(tw.x-5,tw.y-5,10,10);c.fillStyle=tw.col;c.fillRect(tw.x-2,tw.y-16,4,12);c.restore();});beams=beams.filter(b=>{b.life--;c.save();c.globalAlpha=b.life/8;c.strokeStyle=b.col;c.lineWidth=2;c.shadowColor=b.col;c.shadowBlur=6;c.beginPath();c.moveTo(b.x1,b.y1);c.lineTo(b.x2,b.y2);c.stroke();c.restore();return b.life>0;});enemies.forEach(e=>{e.p=(e.p+t*.3)%280;const pos=ptOnPath(e.p);if(t%40<2){const tw=TOWERS[Math.floor(t/40)%3];beams.push({x1:tw.x,y1:tw.y,x2:pos.x,y2:pos.y,col:tw.col,life:8});}c.save();c.shadowColor='#f44336';c.shadowBlur=8;c.fillStyle='#f44336';c.beginPath();c.arc(pos.x,pos.y,6,0,6.28);c.fill();c.fillStyle='#212121';c.fillRect(pos.x-7,pos.y-13,14,4);c.fillStyle='#4caf50';c.fillRect(pos.x-7,pos.y-13,14*e.hp,4);c.restore();});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'rpg',
    icon: '⚔️',
    name: 'RPG',
    desc: 'Top-down adventure with combat',
    tags: ['2D', 'RPG'],
    prompt: 'Create a top-down 2D RPG. Hero explores a dungeon, fights enemies with sword attacks, collects items, has HP/XP/level system. Multiple enemy types, simple inventory UI.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const TILES=[];for(let r=0;r<5;r++)for(let cl=0;cl<8;cl++)TILES.push({x:cl*35,y:r*24,wall:Math.random()>.78});let t=0,sparks=[];function f(){t+=.05;c.fillStyle='#0a0a12';c.fillRect(0,0,280,120);TILES.forEach(tl=>{if(tl.wall){const g=c.createLinearGradient(tl.x,tl.y,tl.x,tl.y+24);g.addColorStop(0,'#1e1e2e');g.addColorStop(1,'#12121e');c.fillStyle=g;c.fillRect(tl.x,tl.y,34,23);c.strokeStyle='#2a2a3e';c.lineWidth=1;c.strokeRect(tl.x,tl.y,34,23);}else{c.fillStyle='#141420';c.fillRect(tl.x,tl.y,34,23);c.fillStyle='#1a1a28';c.fillRect(tl.x,tl.y,17,11);c.fillRect(tl.x+17,tl.y+12,17,11);}});const px=130+Math.cos(t*.5)*25,py=60+Math.sin(t*.4)*20;c.save();c.shadowColor='#4fc3f7';c.shadowBlur=15;c.fillStyle='#0288d1';c.fillRect(px-6,py-2,12,16);c.restore();c.fillStyle='#ffd54f';c.beginPath();c.arc(px,py-7,7,0,6.28);c.fill();c.fillStyle='#e65100';c.fillRect(px+2,py-9,4,3);const sw=Math.sin(t*3)*25;c.save();c.shadowColor='#e0e0e0';c.shadowBlur=6;c.strokeStyle='#e0e0e0';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(px+6,py+3);c.lineTo(px+6+sw,py+3-sw*.7);c.stroke();c.restore();const ex=px+60+Math.sin(t*.8)*15,ey=py+Math.cos(t*.6)*10;c.fillStyle='#7b1fa2';c.beginPath();c.arc(ex,ey,9,0,6.28);c.fill();c.fillStyle='#ce93d8';c.beginPath();c.arc(ex,ey-9,5,0,6.28);c.fill();if(Math.random()<.08)sparks.push({x:px+6+sw*.7,y:py+3-sw*.5,vx:(Math.random()-.5)*3,vy:-Math.random()*3,l:12});sparks=sparks.filter(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.2;s.l--;c.fillStyle=\`rgba(255,220,50,\${s.l/12})\`;c.fillRect(s.x,s.y,2,2);return s.l>0;});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'endless-runner',
    icon: '🌵',
    name: 'Endless Runner',
    desc: 'Dodge obstacles forever',
    tags: ['2D', 'Arcade'],
    prompt: 'Create an endless runner game. Character auto-runs, player taps/clicks to jump over obstacles. Speed increases over time, distance score, death/restart screen with best score. Smooth animations.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0,py=78,vy=0,obs=[{x:260,h:22},{x:380,h:18}],dust=[];function f(){t+=.05;const sky=c.createLinearGradient(0,0,0,80);sky.addColorStop(0,'#1a0a2e');sky.addColorStop(1,'#3d1c6e');c.fillStyle=sky;c.fillRect(0,0,280,80);[{x:220,r:18,a:.15},{x:80,r:12,a:.1},{x:150,r:22,a:.08}].forEach(m=>{c.fillStyle=\`rgba(255,255,255,\${m.a})\`;c.beginPath();c.arc((m.x-t*8)|0+560)%280,38,m.r,0,6.28);c.fill();});const ground=c.createLinearGradient(0,88,0,120);ground.addColorStop(0,'#6a0dad');ground.addColorStop(1,'#3d0070');c.fillStyle=ground;c.fillRect(0,88,280,32);for(let i=0;i<6;i++){c.fillStyle='rgba(180,100,255,.25)';c.fillRect(((i*60-t*120)|0+600)%280,86,36,4);}vy+=.22;py+=vy;if(py>=78){py=78;vy=-4.2;}if(py<20)py=20;obs=obs.map(o=>({...o,x:o.x-3.5}));obs.forEach(o=>{if(o.x<-20)o.x=280+Math.random()*80;c.fillStyle='#00e676';c.fillRect(o.x,88-o.h,10,o.h);c.fillStyle='#69f0ae';c.fillRect(o.x-3,88-o.h,16,5);c.fillRect(o.x-1,88-o.h-8,12,6);});if(Math.random()<.15)dust.push({x:50,y:py+18,l:10});dust=dust.filter(d=>{d.x-=1;d.l--;c.fillStyle=\`rgba(200,150,255,\${d.l/10*.4})\`;c.beginPath();c.arc(d.x,d.y,d.l/3,0,6.28);c.fill();return d.l>0;});const leg=Math.sin(t*10)*5;c.save();c.shadowColor='#e040fb';c.shadowBlur=12;c.fillStyle='#ce93d8';c.fillRect(44,py,14,18);c.restore();c.fillStyle='#ffd54f';c.beginPath();c.arc(51,py-6,7,0,6.28);c.fill();c.fillStyle='#4a148c';c.fillRect(44,py+16,5,6+leg);c.fillRect(53,py+16,5,6-leg);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'match3',
    icon: '💎',
    name: 'Match 3',
    desc: 'Swap gems to match 3 or more',
    tags: ['2D', 'Casual'],
    prompt: 'Create a match-3 puzzle game like Candy Crush. 8x8 grid of colored gems, swap adjacent gems to match 3+, chain reactions, score multiplier, 30-second rounds.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const GEM=[['#f44336','#ff8a65'],['#4caf50','#a5d6a7'],['#2196f3','#90caf9'],['#ff9800','#ffcc80'],['#9c27b0','#ce93d8'],['#00bcd4','#80deea']];const grid=[];for(let r=0;r<3;r++)for(let cl=0;cl<6;cl++)grid.push({r,cl,v:Math.floor(Math.random()*6),flash:0,scale:1});let t=0;function drawGem(x,y,sz,v,bright){const[col,hi]=GEM[v];c.save();if(bright){c.shadowColor=col;c.shadowBlur=18;}const g=c.createRadialGradient(x+sz*.3,y+sz*.25,sz*.05,x+sz/2,y+sz/2,sz*.7);g.addColorStop(0,bright?'#fff':hi);g.addColorStop(.5,col);g.addColorStop(1,col+'aa');c.fillStyle=g;c.beginPath();c.moveTo(x+sz/2,y+2);c.lineTo(x+sz-2,y+sz/2);c.lineTo(x+sz/2,y+sz-2);c.lineTo(x+2,y+sz/2);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.45)';c.beginPath();c.moveTo(x+sz/2,y+3);c.lineTo(x+sz-4,y+sz/2);c.lineTo(x+sz/2,y+sz/2);c.lineTo(x+4,y+sz/2);c.closePath();c.fill();c.restore();}function f(){t++;if(t%55==0){const i=Math.floor(Math.random()*17),j=i+1;const tmp=grid[i].v;grid[i].v=grid[j].v;grid[j].v=tmp;grid[i].flash=20;grid[j].flash=20;}c.fillStyle='#0d0d1f';c.fillRect(0,0,280,120);c.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<6;i++)c.fillRect(i*47+2,0,45,120);grid.forEach(g=>{g.flash=Math.max(0,g.flash-1);const sz=36,x=14+g.cl*(sz+4),y=10+g.r*(sz+4);drawGem(x,y,sz,g.v,g.flash>0);});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'snake',
    icon: '🐍',
    name: 'Snake',
    desc: 'Classic snake with a twist',
    tags: ['2D', 'Classic'],
    prompt: 'Create a modern Snake game. Snake grows when eating food, dies on wall/self collision. Speed increases with length, neon visual style with glow effects, high score persistence via localStorage.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const S=10,W=28,H=12;let snake=[{x:14,y:6},{x:13,y:6},{x:12,y:6},{x:11,y:6}],dir={x:1,y:0},food={x:22,y:3},t=0;function f(){t++;if(t%7==0){const h={x:(snake[0].x+dir.x+W)%W,y:(snake[0].y+dir.y+H)%H};if(h.x==food.x&&h.y==food.y){food={x:2+Math.floor(Math.random()*(W-4)),y:1+Math.floor(Math.random()*(H-2))};if(dir.x!=0&&Math.random()>.5)dir={x:0,y:dir.x>0?1:-1};else if(dir.y!=0)dir={x:dir.y>0?1:-1,y:0};}else snake.pop();snake.unshift(h);}c.fillStyle='#020c02';c.fillRect(0,0,280,120);c.strokeStyle='rgba(0,80,0,.4)';c.lineWidth=.5;for(let i=0;i<=W;i++){c.beginPath();c.moveTo(i*S,0);c.lineTo(i*S,120);c.stroke();}for(let i=0;i<=H;i++){c.beginPath();c.moveTo(0,i*S);c.lineTo(280,i*S);c.stroke();}snake.forEach((s,i)=>{const ratio=1-i/snake.length;c.save();c.shadowColor='#00e676';c.shadowBlur=i===0?14:4*ratio;const hue=120+i*3;c.fillStyle=\`hsl(\${hue},100%,\${35+15*ratio}%)\`;c.fillRect(s.x*S+1,s.y*S+1,S-2,S-2);if(i===0){c.fillStyle='#fff';c.fillRect(s.x*S+2,s.y*S+2,3,3);c.fillRect(s.x*S+6,s.y*S+2,3,3);}c.restore();});c.save();c.shadowColor='#ff1744';c.shadowBlur=16+Math.sin(t*.15)*6;c.fillStyle='#ff1744';c.beginPath();c.arc(food.x*S+S/2,food.y*S+S/2,S/2-1,0,6.28);c.fill();c.fillStyle='rgba(255,200,200,.6)';c.beginPath();c.arc(food.x*S+S/2-1,food.y*S+S/2-2,2,0,6.28);c.fill();c.restore();requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'flappy',
    icon: '🐦',
    name: 'Flappy Style',
    desc: 'Tap to fly through gaps',
    tags: ['2D', 'Casual'],
    prompt: 'Create a Flappy Bird-style game. Tap/click/space to flap, avoid pipes, score per pipe passed, parallax background, juice on score (screen flash), game over with best score.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');let t=0,by=55,bvy=0,wing=0,pipes=[{x:180,gap:42},{x:310,gap:58}],clouds=[{x:60,y:18,w:40},{x:180,y:10,w:55},{x:260,y:22,w:35}];function f(){t++;bvy+=.22;by+=bvy;if(t%22==0){bvy=-2.8;wing=8;}wing=Math.max(0,wing-1);if(by>108)by=108;if(by<5)by=5;pipes.forEach(p=>{p.x-=2;if(p.x<-35)p.x=280+Math.random()*60,p.gap=35+Math.random()*40;});const sky=c.createLinearGradient(0,0,0,90);sky.addColorStop(0,'#1565c0');sky.addColorStop(1,'#42a5f5');c.fillStyle=sky;c.fillRect(0,0,280,90);clouds.forEach(cl=>{cl.x=(cl.x-t*.3+280)%280;c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.arc(cl.x,cl.y,cl.w/4,0,6.28);c.arc(cl.x+cl.w/3,cl.y-4,cl.w/3.5,0,6.28);c.arc(cl.x+cl.w/1.5,cl.y,cl.w/4,0,6.28);c.fill();});const groundG=c.createLinearGradient(0,90,0,120);groundG.addColorStop(0,'#66bb6a');groundG.addColorStop(.3,'#43a047');groundG.addColorStop(1,'#2e7d32');c.fillStyle=groundG;c.fillRect(0,90,280,30);c.fillStyle='#81c784';c.fillRect(0,90,280,5);for(let i=0;i<7;i++){c.fillStyle='rgba(0,0,0,.1)';c.fillRect(i*40+((t*2)|0)%40,92,20,3);}pipes.forEach(p=>{const pg=c.createLinearGradient(p.x,0,p.x+32,0);pg.addColorStop(0,'#2e7d32');pg.addColorStop(.5,'#43a047');pg.addColorStop(1,'#1b5e20');c.fillStyle=pg;c.fillRect(p.x,0,32,p.gap-18);c.fillRect(p.x,p.gap+22,32,120);c.fillStyle='#388e3c';c.fillRect(p.x-4,p.gap-22,40,10);c.fillRect(p.x-4,p.gap+18,40,10);});c.save();c.shadowColor='#ffd600';c.shadowBlur=12;c.fillStyle='#ffca28';c.beginPath();c.arc(65,by,11,0,6.28);c.fill();const wOff=wing>0?-5:3;c.fillStyle='#ff8f00';c.beginPath();c.ellipse(65,by+wOff,8,4,-.5,0,6.28);c.fill();c.fillStyle='#ff6f00';c.beginPath();c.moveTo(76,by);c.lineTo(85,by-3);c.lineTo(85,by+3);c.fill();c.fillStyle='#212121';c.beginPath();c.arc(68,by-3,2.5,0,6.28);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(69,by-3.5,1,0,6.28);c.fill();c.restore();requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'breakout',
    icon: '🧱',
    name: 'Breakout',
    desc: 'Ball and paddle brick breaker',
    tags: ['2D', 'Classic'],
    prompt: 'Create a Breakout/Arkanoid game. Paddle controlled by mouse/touch, ball bounces off bricks, 5 levels of increasing difficulty, power-ups (wide paddle, multi-ball, slow), lives system.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const ROWS=[['#ef5350','#e53935'],['#ff7043','#f4511e'],['#ffca28','#ffb300'],['#66bb6a','#43a047'],['#42a5f5','#1e88e5']];let bx=140,by=82,vx=2.2,vy=-2.6,px=115,trail=[];const bricks=[];for(let r=0;r<5;r++)for(let cl=0;cl<8;cl++)bricks.push({x:8+cl*33,y:10+r*16,alive:true,r});function f(){bx+=vx;by+=vy;if(bx<6||bx>274)vx=-vx;if(by<6)vy=-vy;if(by>108){by=82;bx=140;trail=[];}if(by>93&&by<103&&bx>px-4&&bx<px+54){vy=-Math.abs(vy);vx+=(bx-(px+25))/20;}bricks.forEach(b=>{if(b.alive&&bx+5>b.x&&bx-5<b.x+29&&by+5>b.y&&by-5<b.y+12){b.alive=false;vy=-vy;}});if(bricks.every(b=>!b.alive))bricks.forEach(b=>b.alive=true);px=bx-27;if(px<0)px=0;if(px>226)px=226;trail.push({x:bx,y:by});if(trail.length>10)trail.shift();const bg=c.createLinearGradient(0,0,0,120);bg.addColorStop(0,'#07071a');bg.addColorStop(1,'#0d0d2b');c.fillStyle=bg;c.fillRect(0,0,280,120);bricks.forEach(b=>{if(!b.alive)return;const[col,dark]=ROWS[b.r];const g=c.createLinearGradient(b.x,b.y,b.x,b.y+12);g.addColorStop(0,col);g.addColorStop(1,dark);c.fillStyle=g;c.fillRect(b.x,b.y,29,12);c.fillStyle='rgba(255,255,255,.22)';c.fillRect(b.x+1,b.y+1,27,5);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(b.x,b.y+9,29,3);});trail.forEach((pt,i)=>{c.globalAlpha=(i/trail.length)*.5;c.fillStyle='#fff';c.beginPath();c.arc(pt.x,pt.y,3*(i/trail.length),0,6.28);c.fill();});c.globalAlpha=1;c.save();c.shadowColor='#fff';c.shadowBlur=14;c.fillStyle='#ffffff';c.beginPath();c.arc(bx,by,5,0,6.28);c.fill();c.restore();const pg=c.createLinearGradient(px,95,px,103);pg.addColorStop(0,'#b0bec5');pg.addColorStop(1,'#607d8b');c.fillStyle=pg;c.fillRect(px,95,54,8);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(px+2,95,50,4);requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
  {
    id: 'memory',
    icon: '🃏',
    name: 'Memory',
    desc: 'Card flip memory challenge',
    tags: ['2D', 'Puzzle'],
    prompt: 'Create a card memory game. 4x4 grid of face-down cards with emoji pairs, flip two to match, matched pairs stay face up, move counter, timer, win animation with confetti.',
    canvas: `<html><body style="margin:0;overflow:hidden"><canvas id="c" width="280" height="120"></canvas><script>const cv=document.getElementById('c'),c=cv.getContext('2d');const EMOJIS=['🌟','🎮','🔥','💎','🚀','🎯'];const BACKS=['#1a237e','#4a148c','#1b5e20','#b71c1c','#e65100','#006064'];const cards=[];for(let i=0;i<12;i++)cards.push({x:(i%6)*45+7,y:i<6?8:66,v:EMOJIS[i%6],bc:BACKS[i%6],phase:Math.random()*Math.PI*2,speed:.018+Math.random()*.012});let t=0;function f(){t++;c.fillStyle='#0d0d1a';c.fillRect(0,0,280,120);c.fillStyle='rgba(255,255,255,.025)';for(let i=0;i<14;i++)c.fillRect(i*20,0,1,120);for(let i=0;i<7;i++)c.fillRect(0,i*17,280,1);cards.forEach(card=>{card.phase+=card.speed;const flip=Math.cos(card.phase);const faceUp=flip>0;const sx=Math.abs(flip);const sw=38,sh=46;c.save();c.translate(card.x+sw/2,card.y+sh/2);c.scale(sx,1);const g=c.createLinearGradient(-sw/2,-sh/2,-sw/2,sh/2);if(faceUp){g.addColorStop(0,'#ffffff');g.addColorStop(.15,'#f5f5f5');g.addColorStop(1,'#e0e0e0');c.fillStyle=g;c.beginPath();c.roundRect(-sw/2,-sh/2,sw,sh,6);c.fill();c.strokeStyle='#bdbdbd';c.lineWidth=1;c.stroke();c.fillStyle='#9e9e9e';c.beginPath();c.roundRect(-sw/2+2,-sh/2+2,sw-4,sh-4,4);c.stroke();c.font='20px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(card.v,0,2);}else{g.addColorStop(0,card.bc+'dd');g.addColorStop(1,card.bc+'88');c.fillStyle=g;c.save();c.shadowColor=card.bc;c.shadowBlur=8;c.beginPath();c.roundRect(-sw/2,-sh/2,sw,sh,6);c.fill();c.restore();c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=1.5;c.beginPath();c.roundRect(-sw/2+3,-sh/2+3,sw-6,sh-6,3);c.stroke();for(let i=0;i<3;i++){c.fillStyle=\`rgba(255,255,255,\${.06+i*.02})\`;c.fillRect(-sw/2+5+i*8,-sh/2+5,3,sh-10);}}c.restore();});requestAnimationFrame(f);}f();<\/script></body></html>`,
  },
];

const TAG_COLORS: Record<string, string> = {
  '2D': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  '3D': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Action: 'bg-red-500/15 text-red-400 border-red-500/20',
  Arcade: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Puzzle: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Racing: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Strategy: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  RPG: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Casual: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
  Classic: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

interface Props {
  onSelect: (prompt: string) => void;
  onClose: () => void;
  hasSteam?: boolean;
  onSteamLibrary?: () => void;
}

function TemplateCard({ t, onSelect, onClose }: { t: Template; onSelect: (p: string) => void; onClose: () => void }) {
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
      onClick={() => { onSelect(t.prompt); onClose(); }}
      className="group text-left bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:border-emerald-500/40"
    >
      {/* Canvas animation preview */}
      <div className="w-full relative bg-zinc-950" style={{ height: '120px' }}>
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
      </div>
      {/* Info strip */}
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

  const filtered = TEMPLATES.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(g => g.toLowerCase().includes(search.toLowerCase()))
  );

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
            <LayoutTemplate className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-display flex-1">Choose a Template</h2>
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
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-max">
            {filtered.map(t => (
              <TemplateCard key={t.id} t={t} onSelect={onSelect} onClose={onClose} />
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
                No templates match "{search}"
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
