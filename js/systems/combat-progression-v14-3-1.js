"use strict";

/** v14.3.1 전투 성장 패치: 제작 무기 연동 난이도, 후반 성장, 정예·보스 강화, 신규 무공 준비시간. */
const CombatProgressionV1431=(()=>{
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const ACTIVE_COOLDOWNS=Object.freeze({
    meteor:["meteor",4.92],tenk:["tenk",7.8],dragonspin:["dragonspin",3.82],starfall:["starfall",5.92],overlord:["overlord",6.95],
    arrowrain:["arrowrain",5.57],sunmoon:["sunmoon",5.22],thousand:["thousand",4],miasma:["miasma",6.48],lifedeath:["lifedeath",7.35],
    firedragon:["firedragon",4.38],icearray:["icepulse",.8],fivethunder:["fivethunder",6.42],whirlwind:["whirlwind",1.64],mountain:["mountain",4.58],
    demon:["demon",7.8],moonchain:["moonchain",4.2],zanshin:["zanshinDrop",1.23],nameless:["nameless",7.3],hundredstep:["hundredstep",3.18],
    taijifist:["taijifist",4.2],dragonreturn:["dragonreturn",6.42]
  });
  const TRAITS=Object.freeze([
    {id:"swift",name:"신속한",color:"#78b7d2",hp:1.28,damage:1.18,speed:1.48,taken:.94,xp:2.25},
    {id:"iron",name:"철벽의",color:"#d2bd78",hp:2.05,damage:1.12,speed:.88,taken:.78,xp:2.55},
    {id:"frenzy",name:"광폭한",color:"#d46d63",hp:1.48,damage:1.68,speed:1.22,taken:.9,xp:2.4}
  ]);

  function forgedPower(item){
    if(!item)return 1;
    let score=Math.max(1,Number(item.damageMul)||1);
    const ability={han:.08,moon:.06,black:.05,poison:.08,fire:.08,ice:.07,thunder:.07}[item.ability]||0;
    score*=1+ability;
    for(const line of item.potentials||[]){
      const value=Math.max(0,Number(line.value)||0);
      const weight={damage:1,attackSpeed:.85,cooldown:.75,crit:.55,critDamage:.28,boss:.3,area:.3,reduction:.42,speed:.3,hp:.0025,projectile:.045,pierce:.03}[line.key]||.18;
      score*=1+value*weight;
    }
    return clamp(score,1,3.2);
  }

  function threatFactor(){return player.dynamicThreat||1}
  // 수라 적정 장비선: 신화 이상은 무강도 인정, 전설은 +15에서 인정한다.
  // 입장 자체를 막지는 않고 미달 시 최종 보스에 '수라 위압'을 적용하는 소프트 게이트다.
  function suraGearReady(item){
    if(!item)return false;
    const gi=gradeIndex(item.grade),lv=Math.max(0,Number(item.level)||0);
    return gi>=5||(gi===4&&lv>=15);
  }
  function progress(){return runDuration>0?clamp(elapsed/runDuration,0,1):0}
  function latePhase(){return clamp((progress()-.52)/.48,0,1)}

  const baseResetGame=resetGame;
  resetGame=function(){
    baseResetGame.apply(this,arguments);
    player.forgedCombatPower=forgedPower(player.forgedWeapon);
    player.dynamicThreat=1+Math.min(.06,Math.max(0,player.forgedCombatPower-1)*.04);
    player.suraGearReady=selectedDifficulty!=="sura"||suraGearReady(player.forgedWeapon);
    player.skillWarmup=0;
    player.metrics.eliteTraitKills=0;
    const extra=Math.round((player.dynamicThreat-1)*100);
    if(extra>=2)ui.weaponHud.textContent+=` · 적응 +${extra}%`;
    if(selectedDifficulty==="sura"&&!player.suraGearReady){
      ui.weaponHud.textContent+=" · 수라 위압";
      showMessage("수라 위압 · 권장 장비 미달 (신화 이상 / 전설 +15)",2.6);
    }
  };

  const baseEnemyDef=enemyDef;
  enemyDef=function(type){
    const def=baseEnemyDef.apply(this,arguments),late=latePhase(),rank=difficultyDefs[selectedDifficulty].rank,dynamic=threatFactor();
    const lateHp=1+Math.pow(late,1.75)*(.58+rank*.12);
    const lateDamage=1+Math.pow(late,1.45)*(.26+rank*.075);
    const lateSpeed=1+Math.pow(late,1.2)*(.045+rank*.012);
    const suraLate=rank===4?1+Math.pow(late,1.7)*.28:1;
    def.hp*=lateHp*dynamic*suraLate;
    def.damage*=lateDamage*(1+(dynamic-1)*.48)*(rank===4?1+Math.pow(late,1.45)*.10:1);
    def.speed*=lateSpeed*(rank===4?1+late*.025:1);
    return def;
  };

  function applyTrait(entity,trait){
    if(!entity||entity.dead)return;
    // 정예 배율은 이 모듈에서 단 한 번만 적용한다.
    entity.elitePrefix=trait.name;entity.eliteTrait=trait.id;entity.eliteColor=trait.color;
    entity.hp*=trait.hp;entity.maxHp=entity.hp;entity.damage*=trait.damage;entity.speed*=trait.speed;
    entity.damageTakenMul=trait.taken;entity.xp=Math.max(entity.xp+2,Math.ceil(entity.xp*trait.xp));entity.r*=1.08;
  }

  const baseSpawnEnemy=spawnEnemy;
  spawnEnemy=function(type,x,y){
    const before=enemies.length,result=baseSpawnEnemy.apply(this,arguments),entity=enemies[before];
    if(!entity||["midboss","boss"].includes(type))return result;
    const rank=difficultyDefs[selectedDifficulty].rank,late=latePhase();
    const extraChance=.012+late*(.08+rank*.012)+(threatFactor()-1)*.008+(rank===4?(.018+late*.025):0);
    if(Math.random()<extraChance){
      const trait=TRAITS[Math.floor(Math.random()*TRAITS.length)];
      applyTrait(entity,trait);
    }
    return result;
  };

  const baseDamageEnemy=damageEnemy;
  damageEnemy=function(entity,amount){
    if(entity?.damageTakenMul)arguments[1]=amount*entity.damageTakenMul;
    return baseDamageEnemy.apply(this,arguments);
  };

  const baseKillEnemy=killEnemy;
  killEnemy=function(entity){
    const countTrait=!!(entity?.eliteTrait&&!entity.dead&&!['master','assassin','midboss','boss'].includes(entity.type));
    const result=baseKillEnemy.apply(this,arguments);
    if(countTrait&&entity.dead){player.metrics.elites++;player.metrics.eliteTraitKills++;}
    return result;
  };

  const baseSpawnMiniBoss=spawnMiniBoss;
  spawnMiniBoss=function(){
    const before=enemies.length,result=baseSpawnMiniBoss.apply(this,arguments),entity=enemies.slice(before).find(e=>e.type==="midboss");
    if(entity){
      const late=latePhase(),dynamic=threatFactor();
      entity.hp*=1.18+late*.38;entity.hp*=1+(dynamic-1)*.8;entity.maxHp=entity.hp;
      entity.damage*=1.12+late*.18;entity.damage*=1+(dynamic-1)*.35;entity.speed*=1.04+late*.08;
      entity.special=Math.min(entity.special||2.3,1.75);entity.enraged=false;
    }
    GameEvents.emit("midboss:spawn",{entity,index:miniBossCount});
    return result;
  };

  const baseSpawnBoss=spawnBoss;
  spawnBoss=function(){
    const result=baseSpawnBoss.apply(this,arguments);
    if(boss){
      const dynamic=threatFactor(),rank=difficultyDefs[selectedDifficulty].rank;
      boss.hp*=1.24+rank*.04;boss.hp*=1+(dynamic-1)*.9;
      if(rank===4){
        boss.hp*=1.12;
        if(!player.suraGearReady){
          boss.hp*=1.18;boss.damageTakenMul=(boss.damageTakenMul||1)*.72;boss.suraPressure=true;
        }
      }
      boss.maxHp=boss.hp;
      boss.damage*=1.14+rank*.025;boss.damage*=1+(dynamic-1)*.4;
      if(rank===4)boss.damage*=player.suraGearReady?1.08:1.22;
      boss.speed*=rank===4?1.10:1.07;
      boss.summon*=.88;boss.blast*=.88;if(boss.dash)boss.dash*=.88;if(boss.orbs)boss.orbs*=.88;
      boss.finalRage=false;
      if(rank===4&&boss.suraPressure)showMessage("수라 위압 · 장비 격차로 혈마의 마기가 압도한다",2.4);
    }
    return result;
  };

  const baseUpdateEnemies=updateEnemies;
  updateEnemies=function(dt){
    for(const entity of enemies){
      if(entity.dead)continue;
      if(entity.type==="midboss"&&!entity.enraged&&entity.hp/entity.maxHp<=.5){
        entity.enraged=true;entity.speed*=1.2;entity.damage*=1.24;entity.special=Math.min(entity.special||1,.45);
        showMessage(`${entity.bossName} 격노 · 특수 초식 가속`,1.5);GameAudio.duck(.35,.68);
      }
    }
    if(boss&&!boss.dead&&!boss.finalRage&&boss.hp/boss.maxHp<=.18){
      boss.finalRage=true;boss.speed*=1.22;boss.damage*=1.25;boss.summon=Math.min(boss.summon,.35);boss.blast=Math.min(boss.blast,.3);
      if(boss.dash)boss.dash=Math.min(boss.dash,.42);if(boss.orbs)boss.orbs=Math.min(boss.orbs,.5);
      for(let i=0;i<2+difficultyDefs[selectedDifficulty].rank;i++)spawnAround(i%2?"assassin":"master",130+i*28);
      showMessage("혈마 최종 폭주 · 만혈귀원",2.2);screenShake=Math.max(screenShake,20);GameAudio.duck(.75,.5);
    }
    return baseUpdateEnemies.apply(this,arguments);
  };

  const baseTickArts=tickArts;
  tickArts=function(dt){
    if(player.skillWarmup>0){player.skillWarmup=Math.max(0,player.skillWarmup-dt);return}
    return baseTickArts.apply(this,arguments);
  };

  function primeNewArt(artId){
    player.skillWarmup=Math.max(player.skillWarmup||0,.65);
    player.fireTimer=Math.max(player.fireTimer||0,.32);
    const cooldown=ACTIVE_COOLDOWNS[artId];
    if(cooldown)player.cooldowns[cooldown[0]]=Math.max(player.cooldowns[cooldown[0]]||0,cooldown[1]);
  }

  function showLearnEffect(detail){
    primeNewArt(detail.id);
    const root=document.getElementById("skillLearnToast");
    if(root){
      root.querySelector("b").textContent=detail.name;
      root.querySelector("span").textContent=detail.hidden?"히든 무공 습득":"신규 무공 습득";
      root.classList.remove("show");void root.offsetWidth;root.classList.add("show");
      setTimeout(()=>root.classList.remove("show"),1250);
    }
    addVisual({type:"ring",x:player.x,y:player.y,r:145,life:.75,max:.75,color:detail.hidden?"#ff8ca8":"#ffe59a",width:9});
    addVisual({type:"text",x:player.x,y:player.y-34,text:detail.name,life:.9,max:.9,color:"#fff2bd"});
    GameAudio.duck(.42,.62);GameAudio.playUI("skill-learn");
  }

  GameEvents.on("skill:learned",showLearnEffect);

  return Object.freeze({forgedPower,threatFactor,latePhase,primeNewArt});
})();
