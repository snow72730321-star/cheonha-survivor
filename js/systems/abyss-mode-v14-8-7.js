"use strict";
/** v14.8.7 무한나락: 영원 +25도 15분 생존이 목표가 되는 엔드게임 모드. */
const AbyssModeV1487=(()=>{
  const ID="abyss", TARGET=900;
  let nextBossAt=180,nextAbyssMiniAt=180,lastStage=0;
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function active(){return selectedDifficulty===ID}
  function stage(){return active()?Math.floor(elapsed/180):0}
  function stageProgress(){return active()?elapsed/180:0}
  function after15(){return Math.max(0,(elapsed-TARGET)/60)}
  function multipliers(){
    const s=stageProgress(), post=after15();
    // 0~15분 동안 연속 상승. 15분 이후에는 매분 추가로 더 가혹해진다.
    return {
      hp:(1+Math.pow(s,1.42)*.18)*(1+post*.18),
      damage:(1+Math.pow(s,1.28)*.15)*(1+post*.12),
      speed:(1+Math.min(.22,Math.pow(s,1.18)*.025+post*.012)),
      elite:Math.min(.38,.055+s*.035+post*.018)
    };
  }
  function stageName(n){return ["낙하","침식","압살","혈겁","절명","심연"][Math.min(5,n)]||`심연 ${n}`}
  function ensureStats(){
    if(!account.stats)account.stats={};
    account.stats.bestAbyssTime=Math.max(0,Number(account.stats.bestAbyssTime)||0);
    account.stats.bestAbyssKills=Math.max(0,Math.floor(Number(account.stats.bestAbyssKills)||0));
  }

  const baseReset=resetGame;
  resetGame=function(){
    baseReset.apply(this,arguments);
    if(!active())return;
    nextBossAt=360;nextAbyssMiniAt=180;lastStage=0;
    player.abyssMode=true;player.abyssTarget=TARGET;player.abyssTranscend={damage:0,haste:0,speed:0,area:0,vitality:0,ultimate:0};
    // 수라 위압과 별개. 나락은 장비가 강해도 적이 따라 강해지는 스케일링을 사용하지 않는다.
    player.dynamicThreat=1;
    ui.weaponHud.textContent=`${weaponDefs[selectedWeapon].name} · 무한나락 · 15분 생존 목표${player.forgedWeapon?" · "+player.forgedWeapon.name:""}`;
  };

  const baseEnemyDef=enemyDef;
  enemyDef=function(type){
    const def=baseEnemyDef.apply(this,arguments);
    if(!active())return def;
    const m=multipliers();
    def.hp*=m.hp;def.damage*=m.damage;def.speed*=m.speed;
    return def;
  };

  const baseSpawnEnemy=spawnEnemy;
  spawnEnemy=function(type,x,y){
    const before=enemies.length,result=baseSpawnEnemy.apply(this,arguments),e=enemies[before];
    if(!active()||!e||["midboss","boss"].includes(type))return result;
    const m=multipliers();
    // 기존 정예가 아니어도 나락 단계에 따라 추가 강화 개체가 등장한다.
    if(!e.eliteTrait&&Math.random()<m.elite){
      const roll=Math.random();
      e.abyssElite=roll<.34?"흉성":roll<.67?"철귀":"혈광";
      if(roll<.34){e.hp*=1.65;e.maxHp=e.hp;e.damage*=1.25;e.speed*=1.18;e.color="#9c5570"}
      else if(roll<.67){e.hp*=2.25;e.maxHp=e.hp;e.damage*=1.12;e.speed*=.94;e.damageTakenMul=(e.damageTakenMul||1)*.82;e.color="#9b825a"}
      else{e.hp*=1.45;e.maxHp=e.hp;e.damage*=1.72;e.speed*=1.28;e.color="#a74444"}
      e.r*=1.08;e.xp=Math.ceil(e.xp*2.2);
    }
    return result;
  };

  const baseMini=spawnMiniBoss;
  spawnMiniBoss=function(){
    const before=enemies.length,result=baseMini.apply(this,arguments),e=enemies.slice(before).find(x=>x.type==="midboss");
    if(active()&&e){const s=stageProgress();e.hp*=1.25+s*.16;e.maxHp=e.hp;e.damage*=1.15+s*.07;e.speed*=1.05+Math.min(.18,s*.018);e.special=Math.min(e.special||2.3,1.35)}
    return result;
  };

  const baseBoss=spawnBoss;
  spawnBoss=function(){
    const result=baseBoss.apply(this,arguments);
    if(active()&&boss){
      const n=Math.max(1,Math.floor(elapsed/180)),s=stageProgress();
      boss.bossName=`나락혈마 · ${n}겁`;
      boss.hp*=1.32+s*.18;boss.maxHp=boss.hp;boss.damage*=1.18+s*.065;boss.speed*=1.04+Math.min(.16,s*.016);
      boss.summon=Math.max(.72,(boss.summon||2)*(.88-Math.min(.24,s*.025)));
      boss.blast=Math.max(.68,(boss.blast||2)*(.88-Math.min(.24,s*.025)));
      boss.dash=Math.max(.72,(boss.dash||2)*(.9-Math.min(.22,s*.022)));
      boss.orbs=Math.max(.8,(boss.orbs||2)*(.9-Math.min(.22,s*.022)));
      ui.bossText.textContent=`${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`;
    }
    return result;
  };

  const baseUpdate=update;
  update=function(dt){
    const wasActive=active();
    const result=baseUpdate.apply(this,arguments);
    if(!wasActive||state!=="playing")return result;
    const st=stage();
    if(st>lastStage){
      lastStage=st;
      const minute=Math.floor(elapsed/60);
      showMessage(`무한나락 ${stageName(st)} · ${minute}분 돌파`,2.4);
      screenShake=Math.max(screenShake,9+Math.min(12,st));
      // 단계 전환 직후 회복을 주지 않는다. 엔드게임 생존 압박을 유지한다.
    }
    // 3분마다 혈마. 이전 혈마가 살아 있으면 중복 생성하지 않는다.
    if(elapsed>=nextBossAt){
      if(!boss||boss.dead){bossSpawned=false;spawnBoss();nextBossAt+=180}
      else nextBossAt+=45;
    }
    // 3분 이후 45초마다 중간보스. 12분 이후에는 한 번에 2체까지 압박한다.
    if(elapsed>=nextAbyssMiniAt){
      const count=elapsed>=720?2:1;
      for(let i=0;i<count;i++)spawnMiniBoss();
      nextAbyssMiniAt+=45;
    }
    // 10분부터 회복 드롭이 희박해지고, 12분 이후에는 자연재생도 약화한다.
    if(elapsed>=600){player.regenTimer=Math.max(player.regenTimer,elapsed>=720?10:8.8)}
    return result;
  };

  const baseEnd=endGame;
  endGame=function(win,reason=""){
    if(active()){
      ensureStats();
      account.stats.bestAbyssTime=Math.max(account.stats.bestAbyssTime,elapsed);
      account.stats.bestAbyssKills=Math.max(account.stats.bestAbyssKills,player.kills||0);
      saveAccountData?.();
    }
    const result=baseEnd.apply(this,arguments);
    if(active()&&ui.resultTitle){
      ui.resultTitle.textContent=elapsed>=TARGET?"심연에 이름을 새겼다":"나락에 삼켜졌다";
      ui.finalStats?.insertAdjacentHTML("beforeend",`<br><b>무한나락 기록 ${fmtTime(elapsed)}</b> · 15분 목표 ${elapsed>=TARGET?"달성":"미달"}`);
    }
    return result;
  };

  const baseHud=updateHud;
  updateHud=function(){
    baseHud.apply(this,arguments);
    if(active())ui.timeText.textContent=`나락 ${fmtTime(elapsed)}`;
  };

  const basePause=renderPause;
  renderPause=function(){
    basePause.apply(this,arguments);
    if(active())ui.pauseRun.textContent=`생존 ${fmtTime(elapsed)} · 15분 목표 · 격파 ${player.kills}`;
  };

  return Object.freeze({active,stage,multipliers,TARGET});
})();
window.AbyssModeV1487=AbyssModeV1487;
