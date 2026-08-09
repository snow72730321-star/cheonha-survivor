"use strict";

/**
 * v14 런타임 안정화 계층.
 *
 * - 연속 레벨업 대기열
 * - 고정 60틱 업데이트와 독립 렌더 FPS
 * - 능력치 상한 통합
 * - 전투 이벤트 발행
 * - 히든 무공 진행도 및 개발 통계
 * - 런 종료 집계 단일화
 */
let pendingLevelUps=0;
let runFinalized=false;
let lastRunReport=null;
let hiddenHudTimer=0;
let renderAccumulatorMs=0;
let fixedAccumulator=0;
let runMetrics=createRunMetrics();

function createRunMetrics(){
  return {
    startedAt:0,endedAt:0,damageBySource:{},killsBySource:{},
    frameCount:0,frameTimeTotal:0,worstFrameMs:0,minFps:Infinity,
    maxEnemies:0,maxProjectiles:0,maxParticles:0,reason:"",win:false
  };
}

/** 플레이어 능력치를 UI 설명과 동일한 범위로 제한한다. */
function enforcePlayerLimits(){
  const limits=GameBalance.limits;
  player.critChance=Math.min(limits.critChance,Math.max(0,player.critChance||0));
  player.damageReduction=Math.min(limits.damageReduction,Math.max(0,player.damageReduction||0));
  player.attackSpeedMul=Math.min(4,Math.max(.25,player.attackSpeedMul||1));
  player.speed=Math.min(limits.moveSpeed,Math.max(60,player.speed||170));
  player.projectileBonus=Math.min(limits.projectileBonus,Math.max(0,Math.floor(player.projectileBonus||0)));
  player.pierceBonus=Math.min(limits.pierceBonus,Math.max(0,Math.floor(player.pierceBonus||0)));
  player.areaMul=Math.min(limits.areaMultiplier,Math.max(.5,player.areaMul||1));
  player.cooldownRate=Math.min(limits.cooldownRate,Math.max(.25,player.cooldownRate||1));
}

/** 게임 종료·중도 포기의 기록을 정확히 한 번만 집계한다. */
function finalizeRunStats(win=false,reason=""){ 
  if(runFinalized||!player||!selectedWeapon)return false;
  runFinalized=true;
  ensureV6Account();
  account.stats.runs++;
  account.stats.kills+=player.kills||0;
  account.stats.perfectDodges+=player.metrics?.perfectDodges||0;
  account.stats.totalDamage+=(player.metrics?.damageDealt||0);
  if(reason==="quit")account.stats.quits=(account.stats.quits||0)+1;
  if(win){
    account.stats.clears++;
    account.stats.bestDifficulty=Math.max(account.stats.bestDifficulty,difficultyDefs[selectedDifficulty].rank);
  }
  runMetrics.endedAt=performance.now();runMetrics.reason=reason;runMetrics.win=win;
  lastRunReport=buildRunReport();
  checkAchievements();
  saveAccountData();
  GameEvents.emit("run:finished",{win,reason,report:lastRunReport});
  return true;
}

function buildRunReport(){
  const seconds=Math.max(.001,(runMetrics.endedAt-runMetrics.startedAt)/1000);
  const averageFps=runMetrics.frameTimeTotal>0?1000/(runMetrics.frameTimeTotal/runMetrics.frameCount):0;
  return {
    build:14,weapon:selectedWeapon,difficulty:selectedDifficulty,win:runMetrics.win,reason:runMetrics.reason,
    elapsed:Number(elapsed.toFixed(2)),level:player.level,kills:player.kills,
    damageTaken:Number((player.metrics.damageTaken||0).toFixed(1)),
    totalDamage:Number((player.metrics.damageDealt||0).toFixed(1)),
    damageBySource:Object.fromEntries(Object.entries(runMetrics.damageBySource).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[k,Number(v.toFixed(1))])),
    averageFps:Number(averageFps.toFixed(1)),minFps:Number((runMetrics.minFps===Infinity?0:runMetrics.minFps).toFixed(1)),
    worstFrameMs:Number(runMetrics.worstFrameMs.toFixed(1)),maxEnemies:runMetrics.maxEnemies,
    maxProjectiles:runMetrics.maxProjectiles,maxParticles:runMetrics.maxParticles,
    realSeconds:Number(seconds.toFixed(1)),timestamp:new Date().toISOString()
  };
}

/** 여러 레벨을 동시에 획득했을 때 선택창을 횟수만큼 순차 표시한다. */
gainXp=function gainXpQueued(amount){
  player.xp+=amount*player.xpMul;
  let gained=0;
  while(player.xp>=player.xpNeed){
    player.xp-=player.xpNeed;player.level++;player.xpNeed=xpRequirement(player.level);gained++;
  }
  if(gained>0){
    pendingLevelUps+=gained;
    GameEvents.emit("level:gained",{count:gained,level:player.level});
    if(state==="playing")levelChoice();
  }
};

levelChoice=function levelChoiceQueued(){
  if(pendingLevelUps<=0)return;
  state="levelup";ui.dodgeBtn.style.display="none";
  const pool=choicePool();
  const artPool=pool.filter(choice=>choice.kind==="art");
  const picks=[];

  function take(source){
    if(!source.length)return;
    const index=Math.floor(Math.random()*source.length);
    const choice=source.splice(index,1)[0];
    const poolIndex=pool.indexOf(choice);
    if(poolIndex>=0)pool.splice(poolIndex,1);
    picks.push(choice);
  }

  take(artPool);take(artPool);
  while(picks.length<3&&pool.length)take(pool);

  const repeats=[
    {kind:"repeat",name:"내공 정련",tag:"반복 성장",desc:"모든 피해가 영구적으로 2% 증가한다.",apply:()=>player.damageMul*=1.02},
    {kind:"repeat",name:"기혈 순환",tag:"반복 성장",desc:"최대 체력이 5 증가하고 최대 체력의 20%를 회복한다.",apply:()=>{player.maxHp+=5;player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.2)}},
    {kind:"repeat",name:"신법 연마",tag:"반복 성장",desc:"이동속도가 1.5% 증가하고 보법 재사용 대기시간이 1% 감소한다.",apply:()=>{player.speed*=1.015;player.dodgeCooldownMul=Math.max(.55,player.dodgeCooldownMul*.99)}}
  ];
  for(const reward of repeats){if(picks.length<3)picks.push(reward)}

  const ready=weaponDefs[selectedWeapon].arts.filter(art=>art.hidden&&player.hiddenReady[art.id]&&!player.arts[art.id]);
  ui.hiddenBanner.innerHTML=ready.length?`<div class="unlock-banner">히든 단서 완성: ${ready.map(art=>art.name).join(" · ")}</div><div style="height:9px"></div>`:"";
  ui.choices.innerHTML="";

  for(const choice of picks){
    const button=document.createElement("button");
    button.type="button";button.className="choice";
    button.innerHTML=`<strong>${choice.name}<span class="tag">${choice.tag}</span></strong><small>${choice.desc}</small>`;
    button.addEventListener("click",()=>{
      const previousArtLevel=choice.kind==="art"?(player.arts[choice.id]||0):-1;
      choice.apply();enforcePlayerLimits();pendingLevelUps--;
      ui.levelUp.classList.remove("show");
      if(choice.kind==="art"&&previousArtLevel===0){
        const art=weaponDefs[selectedWeapon].arts.find(item=>item.id===choice.id);
        GameEvents.emit("skill:learned",{id:choice.id,name:choice.name,hidden:!!art?.hidden});
      }else GameAudio.playUI("level-choice");
      showMessage(`${choice.name}의 깨달음을 얻었다`,1.5);
      GameEvents.emit("level:choice",{choice,remaining:pendingLevelUps});
      if(pendingLevelUps>0){setTimeout(levelChoice,0)}else{state="playing";ui.dodgeBtn.style.display="flex";last=performance.now()}
    },{once:true});
    ui.choices.appendChild(button);
  }
  ui.levelUp.classList.add("show");
};

/** 전투 밖으로 나갈 때 히든 무공 진행 HUD/레벨업 단서를 반드시 정리한다. */
function clearHiddenProgressUi(){
  hiddenHudTimer=0;
  const root=document.getElementById("hiddenProgressHud");
  if(root){root.classList.remove("show");root.innerHTML="";}
  if(ui.hiddenBanner)ui.hiddenBanner.innerHTML="";
}

/** 가장 진행도가 높은 히든 무공 조건을 전투 HUD에 표시한다. */
function updateHiddenProgressHud(dt){
  hiddenHudTimer-=dt;if(hiddenHudTimer>0)return;hiddenHudTimer=.2;
  const root=document.getElementById("hiddenProgressHud");
  if(!root||state!=="playing"||!selectedWeapon){root?.classList.remove("show");return}
  const candidates=weaponDefs[selectedWeapon].arts
    .filter(art=>art.hidden&&!player.arts[art.id]&&typeof art.progress==="function")
    .map(art=>({art,progress:art.progress(player)}))
    .filter(entry=>entry.progress.v>=.45)
    .sort((a,b)=>b.progress.v-a.progress.v).slice(0,2);
  if(!candidates.length){root.classList.remove("show");return}
  root.innerHTML=candidates.map(({art,progress})=>`<div class="hidden-progress-row"><b>${art.name}</b><span>${progress.text}</span></div><div class="hidden-progress-track"><span style="width:${Math.round(progress.v*100)}%"></span></div>`).join("");
  root.classList.add("show");
}

/** 개발자 통계는 설정에서 켠 경우에만 결과 화면에 붙인다. */
function appendRunMetrics(){
  if(!account.settings?.devMetrics||!lastRunReport||!ui.finalStats)return;
  const top=Object.entries(lastRunReport.damageBySource).slice(0,6).map(([name,value])=>`${name}: ${Math.round(value)}`).join("\n")||"기록 없음";
  ui.finalStats.insertAdjacentHTML("beforeend",`<h3>개발 통계</h3><div class="dev-metrics">총 피해 ${Math.round(lastRunReport.totalDamage)}\n평균/최저 FPS ${lastRunReport.averageFps} / ${lastRunReport.minFps}\n최악 프레임 ${lastRunReport.worstFrameMs}ms\n최대 적/투사체/파티클 ${lastRunReport.maxEnemies}/${lastRunReport.maxProjectiles}/${lastRunReport.maxParticles}\n\n무공별 피해\n${top}</div>`);
}

// 최신 함수들을 한 번만 감싸 이벤트와 통계를 연결한다.
const runtimeResetGame=resetGame;
resetGame=function(){
  // 이전 런에서 남은 풀링 객체를 회수한 뒤 배열을 초기화한다.
  for(const item of projectiles)GamePools.projectile.release(item);
  for(const item of particles)GamePools.particle.release(item);
  runtimeResetGame.apply(this,arguments);
  pendingLevelUps=0;runFinalized=false;fixedAccumulator=0;renderAccumulatorMs=0;clearHiddenProgressUi();syncGameSpeedButton();
  runMetrics=createRunMetrics();runMetrics.startedAt=performance.now();
  player.hitRadius=player.r||14;player.collisionRadius=Math.max(8,(player.r||14)-2);
  player.spriteWidth=48;player.spriteHeight=64;player.spriteOffsetY=-12;player.animationState="idle";
  player.metrics.damageDealt=0;player.metrics.damageBySource={};
  GameEvents.emit("run:started",{weapon:selectedWeapon,difficulty:selectedDifficulty});
};

const runtimeEndGame=endGame;
endGame=function(win,reason=""){
  if(runFinalized)return;
  finalizeRunStats(win,reason||(!win?"defeat":"clear"));
  const result=runtimeEndGame.apply(this,arguments);
  clearHiddenProgressUi();
  appendRunMetrics();
  return result;
};

const runtimeDamageEnemy=damageEnemy;
damageEnemy=function(entity,amount,source="unknown",options={}){
  const before=Math.max(0,entity?.hp||0);
  const result=runtimeDamageEnemy.apply(this,arguments);
  const dealt=Math.max(0,before-Math.max(0,entity?.hp||0));
  if(dealt>0){
    player.metrics.damageDealt=(player.metrics.damageDealt||0)+dealt;
    runMetrics.damageBySource[source]=(runMetrics.damageBySource[source]||0)+dealt;
    GameEvents.emit("enemy:damaged",{entity,dealt,source,options});
  }
  return result;
};

const runtimeKillEnemy=killEnemy;
killEnemy=function(entity,source="basic",options={}){
  const alive=entity&&!entity.dead;
  const result=runtimeKillEnemy.apply(this,arguments);
  if(alive&&entity.dead){
    runMetrics.killsBySource[source]=(runMetrics.killsBySource[source]||0)+1;
    GameEvents.emit("enemy:killed",{entity,source,options});
  }
  return result;
};

const runtimeFireBasic=fireBasic;
fireBasic=function(){GameEvents.emit("attack:basic",{weapon:selectedWeapon});return runtimeFireBasic.apply(this,arguments)};

const runtimeDodge=performDodge;
performDodge=function(){
  const ready=state==="playing"&&player.dodgeCooldown<=0&&player.dodgeTimer<=0;
  const before=player.metrics?.perfectDodges||0;
  const result=runtimeDodge.apply(this,arguments);
  if(ready)GameEvents.emit("dodge:used",{});
  if((player.metrics?.perfectDodges||0)>before)GameEvents.emit("dodge:perfect",{});
  return result;
};

const runtimeHurt=hurtPlayer;
hurtPlayer=function(amount){
  const hp=player.hp;const result=runtimeHurt.apply(this,arguments);
  if(player.hp<hp)GameEvents.emit("player:hurt",{amount:hp-player.hp});
  return result;
};

const runtimeSpawnBoss=spawnBoss;
spawnBoss=function(){const result=runtimeSpawnBoss.apply(this,arguments);GameEvents.emit("boss:spawn",{boss});return result};

const runtimeSpawnMiniBoss=spawnMiniBoss;
spawnMiniBoss=function(){const result=runtimeSpawnMiniBoss.apply(this,arguments);GameEvents.emit("miniboss:spawn",{enemy:enemies[enemies.length-1]});return result};

/** 절기 컷신 길이 설정을 적용한다. */
const runtimeUltimateFull=useUltimate;
useUltimate=function(){
  const mode=account.settings?.reducedMotion?"off":account.settings?.cutsceneMode||"full";
  if(mode==="full")return runtimeUltimateFull.apply(this,arguments);
  if(state!=="playing"||player.ultimate<100)return;
  player.ultimate=0;player.ultimateUses++;player.metrics.ultimateUses++;updateUltimateHud();
  GameEvents.emit("ultimate:used",{weapon:selectedWeapon});
  if(mode==="off"){
    ultimateAttack();screenShake=Math.max(screenShake,8);flash=Math.max(flash,.4);return;
  }
  state="cutscene";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";
  const ch=characterDefs[selectedWeapon],pal=ultimatePalettes[selectedWeapon]||["#fff0a0","#d9b95f"];
  ui.cutscene.style.setProperty("--ult",pal[0]);ui.cutscene.style.setProperty("--ult2",pal[1]);
  ui.cutsceneName.textContent=typeof currentUltimateName==="function"?currentUltimateName(selectedWeapon):ch.ultimate;ui.cutsceneLine.textContent=ch.name+" · "+ch.quote;
  drawPortrait(ui.cutsceneCanvas,selectedWeapon,currentSkin());
  ui.cutscene.classList.remove("show");void ui.cutscene.offsetWidth;ui.cutscene.classList.add("show");
  setTimeout(()=>{ui.cutscene.classList.remove("show");state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";ultimateAttack();last=performance.now()},520);
};

const runtimeUpdate=update;
update=function(dt){
  // 공간 인덱스는 매 고정 틱 시작 시 한 번 재구축한다.
  GameSpatial.rebuild(enemies);

  // 공격 쿨다운은 매 틱 감소해야 한다. 이전 구현처럼 여기서 매번
  // 최소값으로 끌어올리면 0에 도달하지 못해 자동공격이 영구 정지한다.
  // 따라서 실제로 새 공격이 발사되어 타이머가 다시 양수가 된 순간에만
  // 최소 공격 간격을 적용한다.
  const fireTimerBefore=player.fireTimer;
  const result=runtimeUpdate.apply(this,arguments);
  const firedThisTick=fireTimerBefore<=dt&&player.fireTimer>0;
  if(firedThisTick){
    player.fireTimer=Math.max(GameBalance.limits.attackInterval,player.fireTimer);
  }
  if(state==="playing"){
    player.animationState=player.dodgeTimer>0?"dodge":player.invuln>.45?"hit":player.moving?"walk":"idle";
    enforcePlayerLimits();updateHiddenProgressHud(dt);
    runMetrics.maxEnemies=Math.max(runMetrics.maxEnemies,enemies.length);
    runMetrics.maxProjectiles=Math.max(runMetrics.maxProjectiles,projectiles.length);
    runMetrics.maxParticles=Math.max(runMetrics.maxParticles,particles.length);
  }
  return result;
};

/**
 * 물리 업데이트는 항상 60Hz 고정 틱으로 처리하고,
 * 화면만 설정된 30/60 FPS로 렌더링한다.
 */
loop=function fixedTimestepLoop(now){
  const frameMs=Math.min(250,Math.max(0,now-last));last=now;
  runMetrics.frameCount++;runMetrics.frameTimeTotal+=frameMs;runMetrics.worstFrameMs=Math.max(runMetrics.worstFrameMs,frameMs);
  if(frameMs>0)runMetrics.minFps=Math.min(runMetrics.minFps,1000/frameMs);

  if(state==="playing")fixedAccumulator+=frameMs/1000;else fixedAccumulator=0;
  let steps=0;
  while(fixedAccumulator>=GameBalance.fixedStep&&steps<GameBalance.maxCatchUpSteps){
    let step=GameBalance.fixedStep;
    const gameSpeed=Math.max(1,Math.min(3,Number(account.settings?.gameSpeed||1)));
    step*=gameSpeed;
    if(typeof slowTimer!=="undefined"&&slowTimer>0){slowTimer-=step;step*=slowScale}else if(typeof slowScale!=="undefined")slowScale=1;
    update(step);GameEvents.emit("runtime:tick",{dt:step});fixedAccumulator-=GameBalance.fixedStep;steps++;
  }
  // 탭 복귀 등으로 누적된 과도한 지연은 버려 이른바 spiral of death를 방지한다.
  if(steps===GameBalance.maxCatchUpSteps)fixedAccumulator=0;

  renderAccumulatorMs+=frameMs;
  const renderInterval=1000/Number(account.settings?.fps||60);
  if(renderAccumulatorMs>=renderInterval){draw();GameEvents.emit("runtime:frame",{frameMs});renderAccumulatorMs%=renderInterval}
  requestAnimationFrame(loop);
};

// 중도 포기도 정상 원정으로 집계한다. 캡처 단계에서 기존 메뉴 이동 리스너보다 먼저 실행한다.
document.getElementById("quitBtn")?.addEventListener("click",()=>finalizeRunStats(false,"quit"),{capture:true});
document.getElementById("quitBtn")?.addEventListener("click",clearHiddenProgressUi,{capture:true});
document.getElementById("menuBtn")?.addEventListener("click",clearHiddenProgressUi,{capture:true});

function syncGameSpeedButton(){
  const button=document.getElementById("speedBtn");
  if(!button)return;
  const speed=Math.max(1,Math.min(3,Number(account.settings?.gameSpeed||1)));
  button.textContent=`${speed}×`;
  button.setAttribute("aria-label",`게임 속도 ${speed}배`);
  button.setAttribute("title",`게임 속도 ${speed}배`);
}

document.getElementById("speedBtn")?.addEventListener("click",()=>{
  ensureV6Account();
  const speeds=[1,1.5,2,3];
  const current=Number(account.settings?.gameSpeed||1);
  const index=Math.max(0,speeds.indexOf(current));
  account.settings.gameSpeed=speeds[(index+1)%speeds.length];
  saveAccountData();
  syncGameSpeedButton();
  if(typeof showMessage==="function")showMessage(`전투 속도 ${account.settings.gameSpeed}배`,.8);
});
syncGameSpeedButton();

window.getLastRunReport=()=>lastRunReport;
window.GameRuntimeV14=Object.freeze({enforcePlayerLimits,finalizeRunStats,buildRunReport});
