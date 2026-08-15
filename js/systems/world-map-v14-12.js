"use strict";
/* v14.12 — authored world map. Replaces the placeholder grid/circle landmark pass with a fixed 5200×5200 jianghu map. */
(()=>{
  const HALF=window.GameWorldMap?.WORLD_HALF||2600;
  const ZONES=[
    {id:"center",name:"연무장",x:0,y:0,r:600},
    {id:"north",name:"청죽림",x:-260,y:-1540,r:650},
    {id:"east",name:"폐관문",x:1650,y:-180,r:620},
    {id:"south",name:"월영지",x:360,y:1580,r:680},
    {id:"west",name:"단애로",x:-1660,y:330,r:650}
  ];
  const ROADS=[
    [[0,0],[-80,-560],[-180,-1050],[-260,-1540]],
    [[0,0],[560,-35],[1090,-90],[1650,-180]],
    [[0,0],[110,560],[240,1090],[360,1580]],
    [[0,0],[-560,95],[-1080,220],[-1660,330]],
    [[-260,-1540],[400,-1770],[980,-1350],[1650,-180]],
    [[1650,-180],[1780,620],[1170,1220],[360,1580]],
    [[360,1580],[-440,1760],[-1080,1260],[-1660,330]]
  ];
  const BAMBOO=[];for(let i=0;i<42;i++){const a=i*2.39996,r=170+(i%7)*55;BAMBOO.push({x:-260+Math.cos(a)*r,y:-1540+Math.sin(a)*r,h:48+(i%5)*11})}
  const ROCKS=[];for(let i=0;i<28;i++){const a=-1.15+i*.19,r=270+(i%4)*58;ROCKS.push({x:-1660+Math.cos(a)*r,y:330+Math.sin(a)*r,s:22+(i%5)*8})}
  const TRAINING=[[-300,-230],[-120,-300],[150,-290],[320,-170],[-330,170],[-130,290],[130,290],[330,150]];
  const LANTERNS=[[-430,-430],[430,-430],[-430,430],[430,430],[-260,-1120],[-260,-1950],[1120,-120],[2050,-220],[300,1120],[410,2070],[-1130,230],[-2050,390]];
  const RUIN_WALLS=[
    {x:1480,y:-430,w:520,h:80},{x:1480,y:120,w:520,h:80},{x:1960,y:-430,w:250,h:80},{x:1960,y:120,w:250,h:80},
    {x:1320,y:-640,w:90,h:260},{x:1320,y:150,w:90,h:260},{x:2210,y:-590,w:90,h:320},{x:2210,y:120,w:90,h:320}
  ];
  const PONDS=[{x:80,y:1500,rx:250,ry:380},{x:650,y:1630,rx:260,ry:360}];

  function screenPoint(x,y){return ws(x,y)}
  function visible(x,y,r=120){const s=screenPoint(x,y),z=mobileCameraScale();return s.x+r*z>-100&&s.x-r*z<W+100&&s.y+r*z>-100&&s.y-r*z<H+100}
  function worldPath(points,width,color){const z=mobileCameraScale();ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width*z;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();points.forEach(([x,y],i)=>{const s=screenPoint(x,y);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke();ctx.restore()}
  function fillEllipse(x,y,rx,ry,color,stroke){if(!visible(x,y,Math.max(rx,ry)))return;const s=screenPoint(x,y),z=mobileCameraScale();ctx.save();ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(s.x,s.y,rx*z,ry*z,0,0,Math.PI*2);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1,2*z);ctx.stroke()}ctx.restore()}
  function drawRect(o,fill,stroke){if(!visible(o.x+o.w/2,o.y+o.h/2,Math.max(o.w,o.h)))return;const a=screenPoint(o.x,o.y),z=mobileCameraScale();ctx.save();ctx.fillStyle=fill;ctx.fillRect(a.x,a.y,o.w*z,o.h*z);if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1,2*z);ctx.strokeRect(a.x,a.y,o.w*z,o.h*z)}ctx.restore()}
  function drawBamboo(b){if(!visible(b.x,b.y,70))return;const s=screenPoint(b.x,b.y),z=mobileCameraScale(),h=b.h*z;ctx.save();ctx.strokeStyle="rgba(92,132,83,.60)";ctx.lineWidth=Math.max(2,5*z);ctx.beginPath();ctx.moveTo(s.x,s.y+h*.52);ctx.lineTo(s.x,s.y-h*.52);ctx.stroke();ctx.lineWidth=Math.max(1,1.2*z);ctx.strokeStyle="rgba(166,185,118,.42)";for(let k=-1;k<=1;k++){const yy=s.y+k*h*.22;ctx.beginPath();ctx.moveTo(s.x-10*z,yy);ctx.quadraticCurveTo(s.x-28*z,yy-8*z,s.x-34*z,yy-22*z);ctx.moveTo(s.x+8*z,yy-5*z);ctx.quadraticCurveTo(s.x+27*z,yy-14*z,s.x+34*z,yy-30*z);ctx.stroke()}ctx.restore()}
  function drawRock(r){if(!visible(r.x,r.y,60))return;const s=screenPoint(r.x,r.y),z=mobileCameraScale(),q=r.s*z;ctx.save();ctx.fillStyle="rgba(47,44,42,.88)";ctx.strokeStyle="rgba(122,105,91,.38)";ctx.lineWidth=Math.max(1,1.5*z);ctx.beginPath();ctx.moveTo(s.x-q,s.y+q*.6);ctx.lineTo(s.x-q*.55,s.y-q*.72);ctx.lineTo(s.x+q*.15,s.y-q);ctx.lineTo(s.x+q,s.y-q*.2);ctx.lineTo(s.x+q*.72,s.y+q*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
  function drawLantern(x,y){if(!visible(x,y,45))return;const s=screenPoint(x,y),z=mobileCameraScale();ctx.save();ctx.fillStyle="rgba(240,181,77,.16)";ctx.beginPath();ctx.arc(s.x,s.y,32*z,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(170,129,72,.65)";ctx.lineWidth=Math.max(1,2*z);ctx.strokeRect(s.x-7*z,s.y-13*z,14*z,22*z);ctx.fillStyle="rgba(255,205,99,.82)";ctx.fillRect(s.x-4*z,s.y-9*z,8*z,14*z);ctx.restore()}
  function drawTraining(x,y){if(!visible(x,y,45))return;const s=screenPoint(x,y),z=mobileCameraScale();ctx.save();ctx.strokeStyle="rgba(151,116,70,.7)";ctx.lineWidth=Math.max(2,5*z);ctx.beginPath();ctx.moveTo(s.x,s.y+24*z);ctx.lineTo(s.x,s.y-22*z);ctx.moveTo(s.x-15*z,s.y-8*z);ctx.lineTo(s.x+15*z,s.y-8*z);ctx.stroke();ctx.fillStyle="rgba(92,60,37,.75)";ctx.fillRect(s.x-8*z,s.y+20*z,16*z,8*z);ctx.restore()}
  function drawArena(){const z=mobileCameraScale(),s=screenPoint(0,0);if(!visible(0,0,620))return;ctx.save();ctx.fillStyle="rgba(60,57,47,.88)";ctx.beginPath();ctx.arc(s.x,s.y,510*z,0,Math.PI*2);ctx.fill();for(const rr of [500,420,235]){ctx.strokeStyle=rr===500?"rgba(209,185,112,.34)":"rgba(190,175,133,.15)";ctx.lineWidth=Math.max(1,(rr===500?5:2)*z);ctx.beginPath();ctx.arc(s.x,s.y,rr*z,0,Math.PI*2);ctx.stroke()}ctx.strokeStyle="rgba(175,157,116,.12)";ctx.lineWidth=Math.max(1,2*z);for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(s.x+Math.cos(a)*240*z,s.y+Math.sin(a)*240*z);ctx.lineTo(s.x+Math.cos(a)*495*z,s.y+Math.sin(a)*495*z);ctx.stroke()}ctx.restore()}
  function drawNorth(){fillEllipse(-260,-1540,620,650,"rgba(18,42,23,.78)","rgba(82,120,75,.24)");BAMBOO.forEach(drawBamboo);worldPath([[-260,-2150],[-310,-1780],[-250,-1500],[-180,-1180],[-120,-930]],120,"rgba(60,66,47,.74)")}
  function drawEast(){fillEllipse(1650,-180,650,590,"rgba(42,34,25,.78)","rgba(139,103,67,.20)");RUIN_WALLS.forEach(o=>drawRect(o,"rgba(55,47,38,.92)","rgba(159,123,80,.35)"));const z=mobileCameraScale(),s=screenPoint(1840,-155);if(visible(1840,-155,260)){ctx.save();ctx.strokeStyle="rgba(187,146,86,.55)";ctx.lineWidth=Math.max(2,7*z);ctx.beginPath();ctx.moveTo(s.x-130*z,s.y+95*z);ctx.lineTo(s.x-130*z,s.y-110*z);ctx.quadraticCurveTo(s.x,s.y-210*z,s.x+130*z,s.y-110*z);ctx.lineTo(s.x+130*z,s.y+95*z);ctx.stroke();ctx.restore()}}
  function drawSouth(){fillEllipse(360,1580,730,680,"rgba(23,39,46,.82)","rgba(79,122,140,.22)");for(const p of PONDS){fillEllipse(p.x,p.y,p.rx,p.ry,"rgba(34,78,91,.62)","rgba(113,171,189,.34)");for(let i=1;i<=3;i++)fillEllipse(p.x,p.y,p.rx*i/4,p.ry*i/4,"rgba(0,0,0,0)","rgba(130,186,200,.10)")}worldPath([[355,920],[360,1220],[350,1550],[370,1910],[410,2240]],105,"rgba(73,70,59,.86)");for(let i=0;i<8;i++){const x=330+(i%2?30:-20),y=1230+i*115;drawRect({x:x-45,y:y-14,w:90,h:28},"rgba(92,88,72,.80)","rgba(180,165,122,.25)")}}
  function drawWest(){fillEllipse(-1660,330,690,640,"rgba(39,34,32,.85)","rgba(120,91,78,.20)");ROCKS.forEach(drawRock);worldPath([[-2190,520],[-1880,430],[-1600,350],[-1330,260],[-1050,170]],115,"rgba(65,55,49,.86)")}
  function drawWorld(){
    ctx.fillStyle="#0b100d";ctx.fillRect(0,0,W,H);
    // Subtle ground tiles anchored in world space.
    const z=mobileCameraScale(),g=180*z,ox=(((-player.x*z)+W/2)%g+g)%g,oy=(((-player.y*z)+H/2)%g+g)%g;ctx.save();ctx.strokeStyle="rgba(191,182,150,.025)";ctx.lineWidth=1;ctx.beginPath();for(let x=ox;x<W;x+=g){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=oy;y<H;y+=g){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();ctx.restore();
    // Main roads first so all authored districts are physically connected on screen.
    for(const road of ROADS)worldPath(road,150,"rgba(47,48,40,.94)");
    for(const road of ROADS)worldPath(road,8,"rgba(155,139,98,.09)");
    drawNorth();drawEast();drawSouth();drawWest();drawArena();TRAINING.forEach(p=>drawTraining(...p));LANTERNS.forEach(p=>drawLantern(...p));
    // World rim: cliff/wall line. This is the actual finite boundary used by the gameplay clamp.
    const tl=screenPoint(-HALF,-HALF),br=screenPoint(HALF,HALF);ctx.save();ctx.strokeStyle="rgba(188,159,96,.38)";ctx.lineWidth=Math.max(2,7*z);ctx.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);ctx.strokeStyle="rgba(0,0,0,.72)";ctx.lineWidth=Math.max(4,20*z);ctx.strokeRect(tl.x-7*z,tl.y-7*z,br.x-tl.x+14*z,br.y-tl.y+14*z);ctx.restore();
  }

  // Replace old placeholder background/landmark circles entirely.
  drawBackground=drawWorld;

  function currentZone(){let best=null,bestD=Infinity;for(const zone of ZONES){const d=Math.hypot(player.x-zone.x,player.y-zone.y);if(d<zone.r&&d<bestD){best=zone;bestD=d}}return best}
  function drawAuthoredMinimap(){
    if(state!=="playing"&&state!=="paused")return;const mobile=Math.min(W,H)<=520,size=mobile?100:132,x=W-size-10,y=mobile?76:82,p=8,inner=size-p*2,sc=inner/(HALF*2),mx=wx=>x+p+(wx+HALF)*sc,my=wy=>y+p+(wy+HALF)*sc;
    ctx.save();ctx.globalAlpha=.98;ctx.fillStyle="rgba(5,9,8,.93)";ctx.fillRect(x,y,size,size);ctx.strokeStyle="rgba(216,190,115,.5)";ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    ctx.strokeStyle="rgba(118,109,81,.40)";ctx.lineWidth=mobile?1.4:1.8;ctx.lineCap="round";for(const road of ROADS){ctx.beginPath();road.forEach(([a,b],i)=>i?ctx.lineTo(mx(a),my(b)):ctx.moveTo(mx(a),my(b)));ctx.stroke()}
    for(const z of ZONES){ctx.fillStyle=z.id==="south"?"rgba(71,126,145,.35)":z.id==="north"?"rgba(69,119,71,.35)":z.id==="east"?"rgba(151,111,74,.28)":z.id==="west"?"rgba(121,91,80,.28)":"rgba(183,165,111,.24)";ctx.beginPath();ctx.arc(mx(z.x),my(z.y),Math.max(2,z.r*sc*.42),0,Math.PI*2);ctx.fill()}
    for(const e of enemies){if(e.dead||(!e.elitePrefix&&e.type!=="midboss"&&e.type!=="boss"))continue;ctx.fillStyle=e.type==="boss"?"#ff655b":e.type==="midboss"?"#f4bd5f":"#c796e5";ctx.beginPath();ctx.arc(mx(e.x),my(e.y),e.type==="boss"?3.5:2.1,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle="#f1d56f";for(const c of chests){if(!c.dead)ctx.fillRect(mx(c.x)-1.5,my(c.y)-1.5,3,3)}ctx.fillStyle="#f4fbff";ctx.shadowColor="#dff7ff";ctx.shadowBlur=5;ctx.beginPath();ctx.arc(mx(player.x),my(player.y),3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    const zone=currentZone();ctx.fillStyle="rgba(235,226,199,.88)";ctx.font=`${mobile?8:9}px system-ui`;ctx.textAlign="left";ctx.fillText(zone?zone.name:"강호도",x+6,y+10);ctx.restore();
  }
  const priorDraw=draw;draw=function(){priorDraw();drawAuthoredMinimap()};
  window.GameWorldMap=Object.assign({},window.GameWorldMap||{},{WORLD_HALF:HALF,zones:ZONES,roads:ROADS,currentZone});
})();
