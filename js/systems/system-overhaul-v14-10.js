"use strict";
/* v14.10 systemic pass: ultimate invulnerability, finite map/minimap, clear ore choice rewards. */
(()=>{
  const WORLD_HALF=2600;
  const WORLD_MARGIN=72;
  const CLEAR_REWARD={
    gosu:{chance:.40,grades:[["unique",.75],["legendary",.25]]},
    sura:{chance:.35,grades:[["mythic",.92],["eternal",.08]]}
  };
  const landmarks=[
    {id:"center",name:"연무장",x:0,y:0,r:430,color:"rgba(188,180,151,.055)"},
    {id:"north",name:"청죽림",x:-260,y:-1540,r:360,color:"rgba(72,125,79,.065)"},
    {id:"east",name:"폐관문",x:1650,y:-180,r:300,color:"rgba(151,111,74,.06)"},
    {id:"south",name:"월영지",x:360,y:1580,r:390,color:"rgba(74,110,135,.06)"},
    {id:"west",name:"단애로",x:-1660,y:330,r:330,color:"rgba(126,96,89,.055)"}
  ];

  function clampWorld(v){return Math.max(-WORLD_HALF+WORLD_MARGIN,Math.min(WORLD_HALF-WORLD_MARGIN,v))}
  function clampEntity(e){if(!e)return;e.x=clampWorld(e.x);e.y=clampWorld(e.y)}

  // 모든 캐릭터 절기: 컷신 여부와 무관하게 시전 직후 무적을 보장한다.
  const baseUseUltimate=useUltimate;
  useUltimate=function(){
    if(state!=="playing"||player.ultimate<100)return baseUseUltimate.apply(this,arguments);
    player.invuln=Math.max(player.invuln||0,1.25);
    return baseUseUltimate.apply(this,arguments);
  };
  const baseUltimateAttack=ultimateAttack;
  ultimateAttack=function(){player.invuln=Math.max(player.invuln||0,.85);return baseUltimateAttack.apply(this,arguments)};

  // 유한 월드 경계. 기존 스폰 로직은 유지하되 경계 밖 생성만 안쪽으로 보정한다.
  const baseSpawnEnemy=spawnEnemy;
  spawnEnemy=function(){const result=baseSpawnEnemy.apply(this,arguments);const e=enemies[enemies.length-1];clampEntity(e);return result};
  const baseSpawnMiniBoss=spawnMiniBoss;
  spawnMiniBoss=function(){const before=enemies.length,result=baseSpawnMiniBoss.apply(this,arguments);for(const e of enemies.slice(before))clampEntity(e);return result};
  const baseSpawnBoss=spawnBoss;
  spawnBoss=function(){const result=baseSpawnBoss.apply(this,arguments);clampEntity(boss);return result};
  let worldClampTimer=0;
  const baseUpdate=update;
  update=function(dt){const result=baseUpdate.apply(this,arguments);if(state==="playing"){player.x=clampWorld(player.x);player.y=clampWorld(player.y);worldClampTimer-=dt;if(worldClampTimer<=0){worldClampTimer=.25;for(const e of enemies)if(!e.dead)clampEntity(e)}}return result};

  function drawWorldLandmarks(){
    const z=mobileCameraScale();
    // 경계선
    const tl=ws(-WORLD_HALF,-WORLD_HALF),br=ws(WORLD_HALF,WORLD_HALF);
    ctx.save();
    ctx.strokeStyle="rgba(214,188,112,.16)";ctx.lineWidth=Math.max(1,2*z);ctx.setLineDash([18*z,18*z]);
    ctx.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);ctx.setLineDash([]);
    // 지역
    for(const lm of landmarks){
      const s=ws(lm.x,lm.y),rr=lm.r*z;if(s.x+rr<-40||s.x-rr>W+40||s.y+rr<-40||s.y-rr>H+40)continue;
      ctx.fillStyle=lm.color;ctx.beginPath();ctx.arc(s.x,s.y,rr,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="rgba(230,221,190,.055)";ctx.lineWidth=1;ctx.beginPath();ctx.arc(s.x,s.y,rr*.72,0,Math.PI*2);ctx.stroke();
      // 아주 가벼운 지형 표식
      if(lm.id==="north"){
        ctx.strokeStyle="rgba(101,151,99,.10)";for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(s.x+i*34*z,s.y-90*z);ctx.lineTo(s.x+i*34*z,s.y+90*z);ctx.stroke()}
      }else if(lm.id==="east"){
        ctx.strokeStyle="rgba(190,148,92,.11)";ctx.lineWidth=5*z;ctx.strokeRect(s.x-70*z,s.y-54*z,140*z,108*z);ctx.beginPath();ctx.moveTo(s.x,s.y-54*z);ctx.lineTo(s.x,s.y+54*z);ctx.stroke();
      }else if(lm.id==="south"){
        ctx.strokeStyle="rgba(111,166,186,.10)";for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(s.x,s.y,(45+i*42)*z,0,Math.PI*2);ctx.stroke()}
      }else if(lm.id==="west"){
        ctx.strokeStyle="rgba(177,137,116,.10)";for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(s.x-100*z,s.y+i*34*z);ctx.lineTo(s.x+100*z,s.y+(i-1)*34*z);ctx.stroke()}
      }else{
        ctx.strokeStyle="rgba(218,201,157,.08)";for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(s.x,s.y,(90+i*70)*z,0,Math.PI*2);ctx.stroke()}
      }
    }
    ctx.restore();
  }
  const baseDrawBackground=drawBackground;
  drawBackground=function(){baseDrawBackground();drawWorldLandmarks()};

  function drawMinimap(){
    if(state!=="playing"&&state!=="paused")return;
    const mobile=Math.min(W,H)<=520,size=mobile?94:126,x=W-size-10,y=mobile?76:82,pad=8,inner=size-pad*2;
    const mapX=wx=>x+pad+((wx+WORLD_HALF)/(WORLD_HALF*2))*inner;
    const mapY=wy=>y+pad+((wy+WORLD_HALF)/(WORLD_HALF*2))*inner;
    ctx.save();ctx.globalAlpha=.94;ctx.fillStyle="rgba(6,10,8,.72)";ctx.fillRect(x,y,size,size);ctx.strokeStyle="rgba(218,195,124,.38)";ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,size-1,size-1);
    ctx.fillStyle="rgba(210,205,183,.12)";for(const lm of landmarks){ctx.beginPath();ctx.arc(mapX(lm.x),mapY(lm.y),mobile?2:2.6,0,Math.PI*2);ctx.fill()}
    for(const e of enemies){if(e.dead)continue;if(e.type!=="boss"&&e.type!=="midboss"&&!e.elitePrefix)continue;ctx.fillStyle=e.type==="boss"?"#ff655b":e.type==="midboss"?"#f4bd5f":"#c796e5";ctx.beginPath();ctx.arc(mapX(e.x),mapY(e.y),e.type==="boss"?3.5:2.2,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle="#f1d56f";for(const c of chests){if(c.dead)continue;ctx.fillRect(mapX(c.x)-1.5,mapY(c.y)-1.5,3,3)}
    const px=mapX(player.x),py=mapY(player.y);ctx.fillStyle="#f4fbff";ctx.shadowColor="#dff7ff";ctx.shadowBlur=5;ctx.beginPath();ctx.arc(px,py,3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.fillStyle="rgba(232,226,206,.7)";ctx.font=`${mobile?8:9}px system-ui`;ctx.textAlign="left";ctx.fillText("강호도",x+6,y+10);ctx.restore();
  }
  const baseDraw=draw;
  draw=function(){baseDraw();if(!window.__CHEONHA_AUTHORED_MINIMAP__)drawMinimap()};

  function pickGrade(table){const r=Math.random();let c=0;for(const [g,p] of table){c+=p;if(r<=c)return g}return table[table.length-1][0]}
  function rewardOverlay(){
    let root=document.getElementById("clearOreReward");if(root)return root;
    root=document.createElement("section");root.id="clearOreReward";root.className="overlay";root.style.zIndex="220";root.innerHTML=`<div class="panel clear-ore-choice-panel"><h2 id="clearOreRewardTitle">강호 보은</h2><p class="desc" id="clearOreRewardDesc"></p><div class="clear-ore-choice-grid" id="clearOreRewardGrid"></div></div>`;document.body.appendChild(root);return root;
  }
  function offerClearOreReward(diff){
    const cfg=CLEAR_REWARD[diff];if(!cfg||Math.random()>=cfg.chance)return;
    const grade=pickGrade(cfg.grades),types=sampleRandom(Object.keys(oreTypes),3),root=rewardOverlay(),grid=root.querySelector("#clearOreRewardGrid");
    root.querySelector("#clearOreRewardTitle").textContent=diff==="sura"?"수라의 전리품":"고수의 전리품";
    root.querySelector("#clearOreRewardDesc").textContent=`확률 보상 발동 · ${gradeName(grade)} 광석 세 종류 중 하나를 선택할 수 있다.`;
    grid.innerHTML=types.map(type=>`<button type="button" class="clear-ore-choice rarity-border-${grade}" data-type="${type}"><b class="rarity-${grade}">${gradeName(grade)} ${oreTypes[type].name}</b><span>${oreTypes[type].ability} · ${oreTypes[type].desc}</span></button>`).join("");
    grid.querySelectorAll("[data-type]").forEach(btn=>btn.addEventListener("click",()=>{const type=btn.dataset.type,key=oreKey(type,grade);account.ores[key]=(account.ores[key]||0)+1;saveAccountData();refreshForge();root.classList.remove("show");showMessage(`${gradeName(grade)} ${oreTypes[type].name} 획득`,1.4);GameAudio.playUI("ore-pickup")}));
    root.classList.add("show");
  }
  const baseEndGame=endGame;
  endGame=function(win,reason=""){const diff=selectedDifficulty,result=baseEndGame.apply(this,arguments);if(win&&(diff==="gosu"||diff==="sura"))setTimeout(()=>offerClearOreReward(diff),260);return result};

  window.GameWorldMap={WORLD_HALF,landmarks,offerClearOreReward};
})();
