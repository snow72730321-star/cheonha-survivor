"use strict";

/**
 * v14.15 — 고정 수제 골격 + 버전 고정 시드 장식 맵.
 *
 * WFC/절차 생성은 배포 전에 후보를 만드는 도구로만 사용하고, 실제 게임은 검수된
 * map-v1.json과 동일한 비트맵 환경판을 불러온다. 플레이 중에는 경로 생성이나 충돌
 * 계산을 추가하지 않아 기존 적 추적과 전투 밸런스를 보존한다.
 */
(()=>{
  window.__CHEONHA_AUTHORED_MINIMAP__=true;

  const DATA_PATH="assets/map/data/map-v1.json";
  const EXPECTED_VERSION="cheonha-world-v1";
  const MAP_ART=[
    "assets/map/terrain/common-ground.webp",
    "assets/map/terrain/center-training-ground.webp",
    "assets/map/terrain/north-bamboo-grove.webp",
    "assets/map/terrain/east-ruined-gate.webp",
    "assets/map/terrain/south-moon-pond.webp",
    "assets/map/terrain/west-cliff-road.webp"
  ];
  const FALLBACK={
    schema:1,version:EXPECTED_VERSION,seed:"cheonha-v14.15.0-world-v1",worldHalf:2600,tileWorldSize:720,
    baseArt:MAP_ART[0],
    zones:[
      {id:"center",name:"연무장",x:0,y:0,radius:690,drawWidth:1500,drawHeight:1406,art:MAP_ART[1],minimapColor:"rgba(187,165,104,.42)"},
      {id:"north",name:"청죽림",x:-260,y:-1540,radius:720,drawWidth:1500,drawHeight:1371,art:MAP_ART[2],minimapColor:"rgba(62,132,105,.48)"},
      {id:"east",name:"폐관문",x:1650,y:-180,radius:700,drawWidth:1500,drawHeight:1371,art:MAP_ART[3],minimapColor:"rgba(148,99,69,.46)"},
      {id:"south",name:"월영지",x:360,y:1580,radius:760,drawWidth:1600,drawHeight:1067,art:MAP_ART[4],minimapColor:"rgba(55,117,142,.48)"},
      {id:"west",name:"단애로",x:-1660,y:330,radius:720,drawWidth:1600,drawHeight:1067,art:MAP_ART[5],minimapColor:"rgba(123,88,73,.44)"}
    ],
    roads:[
      [[0,0],[-80,-560],[-180,-1050],[-260,-1540]],[[0,0],[560,-35],[1090,-90],[1650,-180]],
      [[0,0],[110,560],[240,1090],[360,1580]],[[0,0],[-560,95],[-1080,220],[-1660,330]],
      [[-260,-1540],[400,-1770],[980,-1350],[1650,-180]],[[1650,-180],[1780,620],[1170,1220],[360,1580]],
      [[360,1580],[-440,1760],[-1080,1260],[-1660,330]]
    ],decor:{pebbles:150,leaves:120,grass:90}
  };

  let map=FALLBACK;
  let decor=[];
  let ready=false;

  function hashSeed(text){
    let h=2166136261>>>0;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}
    return h>>>0;
  }
  function seededRandom(seed){
    let a=hashSeed(seed)||0x6d2b79f5;
    return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  }
  function validMap(value){
    return Boolean(value&&value.schema===1&&value.version===EXPECTED_VERSION&&value.worldHalf===2600&&Array.isArray(value.zones)&&value.zones.length===5&&Array.isArray(value.roads));
  }
  function buildDecor(){
    const rnd=seededRandom(map.seed),half=map.worldHalf-90,next=(type,count)=>{
      for(let i=0;i<count;i++)decor.push({type,x:(rnd()*2-1)*half,y:(rnd()*2-1)*half,size:2+rnd()*5,angle:rnd()*Math.PI*2,shade:rnd()});
    };
    decor=[];next("pebble",map.decor?.pebbles||0);next("leaf",map.decor?.leaves||0);next("grass",map.decor?.grass||0);
  }
  function decorHash(){
    let h=2166136261>>>0;
    for(const d of decor){const s=`${d.type}:${d.x.toFixed(2)}:${d.y.toFixed(2)}:${d.size.toFixed(2)};`;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}}
    return (h>>>0).toString(16).padStart(8,"0");
  }

  async function prepare(){
    try{
      const response=await fetch(GameAssets.url(DATA_PATH),{cache:"no-cache"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      // 브라우저에서는 Response.json()을 사용한다. 최소 DOM 테스트의 fetch 스텁은
      // 본문 API가 없으므로 그 경우 동일한 내장 데이터를 조용히 유지한다.
      const loaded=typeof response.json==="function"?await response.json():FALLBACK;
      if(!validMap(loaded))throw new Error("지도 데이터 규격 불일치");
      map=loaded;
    }catch(error){
      console.warn("고정 지도 데이터 로드 실패 · 내장 동일본 사용",error);
      map=FALLBACK;
    }
    buildDecor();
    const assets=[map.baseArt,...map.zones.map(zone=>zone.art)];
    const result=await GameAssets.preloadList(assets,()=>{},3);
    if(result.failed.length)console.warn("지도 비트맵 일부 로드 실패",result.failed);
    ready=result.failed.length===0;
    return {version:map.version,seed:map.seed,ready,failed:result.failed,decorHash:decorHash()};
  }

  function screenPoint(x,y){return ws(x,y)}
  function visibleBox(x,y,width,height,margin=100){
    const z=mobileCameraScale(),s=screenPoint(x,y),hw=width*z/2,hh=height*z/2;
    return s.x+hw>-margin&&s.x-hw<W+margin&&s.y+hh>-margin&&s.y-hh<H+margin;
  }
  function worldBounds(){
    const z=Math.max(.01,mobileCameraScale());
    return {left:player.x-W/(2*z)-40,right:player.x+W/(2*z)+40,top:player.y-H/(2*z)-40,bottom:player.y+H/(2*z)+40};
  }

  function drawMirroredGround(){
    const image=GameAssets.image(map.baseArt);
    if(!image?.naturalWidth)return;
    const z=mobileCameraScale(),tile=map.tileWorldSize||720,b=worldBounds(),half=map.worldHalf;
    const startX=Math.max(-half,Math.floor(b.left/tile)*tile),endX=Math.min(half,Math.ceil(b.right/tile)*tile);
    const startY=Math.max(-half,Math.floor(b.top/tile)*tile),endY=Math.min(half,Math.ceil(b.bottom/tile)*tile);
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(let y=startY;y<endY;y+=tile){
      for(let x=startX;x<endX;x+=tile){
        const ix=Math.floor((x+half)/tile),iy=Math.floor((y+half)/tile),flipX=ix%2!==0,flipY=iy%2!==0,s=screenPoint(x,y),size=tile*z;
        ctx.save();ctx.translate(s.x+(flipX?size:0),s.y+(flipY?size:0));ctx.scale(flipX?-1:1,flipY?-1:1);ctx.drawImage(image,0,0,size,size);ctx.restore();
      }
    }
    ctx.restore();
  }
  function worldPath(points,width,color){
    const z=mobileCameraScale();ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width*z;ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();points.forEach(([x,y],i)=>{const s=screenPoint(x,y);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke();ctx.restore();
  }
  function drawRoads(){
    for(const road of map.roads)worldPath(road,184,"rgba(20,20,17,.82)");
    for(const road of map.roads)worldPath(road,142,"rgba(75,67,52,.78)");
    for(const road of map.roads)worldPath(road,5,"rgba(193,163,101,.07)");
  }
  function drawDecor(){
    const z=mobileCameraScale(),b=worldBounds();ctx.save();ctx.lineCap="round";
    for(const d of decor){
      if(d.x<b.left||d.x>b.right||d.y<b.top||d.y>b.bottom)continue;
      const s=screenPoint(d.x,d.y),q=d.size*z;ctx.save();ctx.translate(s.x,s.y);ctx.rotate(d.angle);
      if(d.type==="pebble"){ctx.fillStyle=`rgba(116,110,94,${.10+d.shade*.08})`;ctx.beginPath();ctx.ellipse(0,0,q*1.5,q*.7,0,0,Math.PI*2);ctx.fill()}
      else if(d.type==="leaf"){ctx.strokeStyle=`rgba(147,119,66,${.10+d.shade*.09})`;ctx.lineWidth=Math.max(.6,z);ctx.beginPath();ctx.moveTo(-q,0);ctx.lineTo(q,0);ctx.stroke()}
      else{ctx.strokeStyle=`rgba(80,111,72,${.08+d.shade*.07})`;ctx.lineWidth=Math.max(.6,z);ctx.beginPath();ctx.moveTo(0,q);ctx.lineTo(-q*.4,-q);ctx.moveTo(0,q);ctx.lineTo(q*.55,-q*.8);ctx.stroke()}
      ctx.restore();
    }
    ctx.restore();
  }
  function drawZonePlates(){
    const z=mobileCameraScale();ctx.save();ctx.imageSmoothingEnabled=true;
    for(const zone of map.zones){
      if(!visibleBox(zone.x,zone.y,zone.drawWidth,zone.drawHeight,140))continue;
      const image=GameAssets.image(zone.art);if(!image?.naturalWidth)continue;
      const topLeft=screenPoint(zone.x-zone.drawWidth/2,zone.y-zone.drawHeight/2);
      ctx.drawImage(image,topLeft.x,topLeft.y,zone.drawWidth*z,zone.drawHeight*z);
    }
    ctx.restore();
  }
  function drawWorldRim(){
    const z=mobileCameraScale(),half=map.worldHalf,tl=screenPoint(-half,-half),br=screenPoint(half,half);
    ctx.save();ctx.strokeStyle="rgba(209,175,101,.34)";ctx.lineWidth=Math.max(2,7*z);ctx.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);ctx.strokeStyle="rgba(0,0,0,.76)";ctx.lineWidth=Math.max(4,24*z);ctx.strokeRect(tl.x-8*z,tl.y-8*z,br.x-tl.x+16*z,br.y-tl.y+16*z);ctx.restore();
  }
  function drawWorld(){
    ctx.fillStyle="#080b0a";ctx.fillRect(0,0,W,H);
    drawMirroredGround();drawRoads();drawDecor();drawZonePlates();drawWorldRim();
  }
  drawBackground=drawWorld;

  function currentZone(){
    let best=null,bestDistance=Infinity;
    for(const zone of map.zones){const distance=Math.hypot(player.x-zone.x,player.y-zone.y);if(distance<zone.radius&&distance<bestDistance){best=zone;bestDistance=distance}}
    return best;
  }
  function drawAuthoredMinimap(){
    if(window.SoloRaidMode?.active)return;
    if(state!=="playing"&&state!=="paused")return;
    const mobile=Math.min(W,H)<=520,size=mobile?100:132,x=W-size-10,y=mobile?76:82,pad=8,inner=size-pad*2,half=map.worldHalf;
    const mx=wx=>x+pad+(wx+half)/(half*2)*inner,my=wy=>y+pad+(wy+half)/(half*2)*inner;
    ctx.save();ctx.globalAlpha=.98;ctx.fillStyle="rgba(5,9,8,.93)";ctx.fillRect(x,y,size,size);ctx.strokeStyle="rgba(216,190,115,.5)";ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    ctx.strokeStyle="rgba(126,112,80,.46)";ctx.lineWidth=mobile?1.4:1.8;ctx.lineCap="round";
    for(const road of map.roads){ctx.beginPath();road.forEach(([a,b],i)=>i?ctx.lineTo(mx(a),my(b)):ctx.moveTo(mx(a),my(b)));ctx.stroke()}
    for(const zone of map.zones){ctx.fillStyle=zone.minimapColor||"rgba(180,160,105,.35)";ctx.beginPath();ctx.arc(mx(zone.x),my(zone.y),Math.max(2,zone.radius*inner/(half*2)*.46),0,Math.PI*2);ctx.fill()}
    for(const enemy of enemies){if(enemy.dead||(!enemy.elitePrefix&&enemy.type!=="midboss"&&enemy.type!=="boss"))continue;ctx.fillStyle=enemy.type==="boss"?"#ff655b":enemy.type==="midboss"?"#f4bd5f":"#c796e5";ctx.beginPath();ctx.arc(mx(enemy.x),my(enemy.y),enemy.type==="boss"?3.5:2.1,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle="#f1d56f";for(const chest of chests)if(!chest.dead)ctx.fillRect(mx(chest.x)-1.5,my(chest.y)-1.5,3,3);
    ctx.fillStyle="#f4fbff";ctx.shadowColor="#dff7ff";ctx.shadowBlur=5;ctx.beginPath();ctx.arc(mx(player.x),my(player.y),3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    const zone=currentZone();ctx.fillStyle="rgba(235,226,199,.9)";ctx.font=`${mobile?8:9}px system-ui`;ctx.textAlign="left";ctx.fillText(zone?zone.name:"강호도",x+6,y+10);ctx.restore();
  }

  const priorDraw=draw;
  draw=function(){priorDraw();drawAuthoredMinimap()};

  window.GameWorldMap=Object.assign({},window.GameWorldMap||{}, {
    WORLD_HALF:2600,version:EXPECTED_VERSION,get seed(){return map.seed},get zones(){return map.zones},get roads(){return map.roads},
    prepare,currentZone,isReady:()=>ready,decorHash,snapshot:()=>({version:map.version,seed:map.seed,zoneCount:map.zones.length,roadCount:map.roads.length,decorCount:decor.length,decorHash:decorHash()})
  });
})();
