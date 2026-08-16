"use strict";

/**
 * v14.16.2 · 천마신교 1인 레이드 · 열쇠/전투진입/엔드게임 보상
 *
 * 기존 생존 난이도의 스폰·혈마 승리 판정과 분리된 보스 러시 컨트롤러다.
 * 모든 공격은 raid.telegraphs에 경고 판정을 먼저 등록한 뒤에만 피해를 준다.
 */
(()=>{
  const RAID_BUILD="cheonha-solo-raid-v3-keyed-transcend";
  const ARENA_RADIUS=545;
  const START_LEVEL=20;
  const GATE_LEVELS=[8,9,10,10];
  const RAID_ASSETS=[
    "assets/raid/map/cheonma-altar.webp",
    "assets/raid/bosses/peng-danhui.png",
    "assets/raid/bosses/namgung-hyeok.png",
    "assets/raid/bosses/ma-heojin.png",
    "assets/raid/bosses/cheondan.png",
    "assets/raid/bosses/cheonma-throne.png",
    "assets/raid/bosses/cheonma-left-maqi-arm.png",
    "assets/raid/bosses/cheonma-right-maqi-arm.png",
    "assets/raid/bosses/cheonma-demon-dragon.png"
  ];
  const STAGES=[
    {id:"peng",gate:1,name:"도마종 단주 팽단휘",sprite:RAID_ASSETS[1],duration:100,hp:140000,damage:26,speed:66,r:48,gimmick:"혈도세 · 체력 60%에서 파천도진 강화"},
    {id:"namgung",gate:2,name:"법마종 대주 남궁혁",sprite:RAID_ASSETS[2],duration:105,hp:240000,damage:31,speed:54,r:45,gimmick:"사상법진 · 빛나는 안전 법인으로 이동"},
    {id:"ma",gate:3,name:"검마종 종주 마허진",sprite:RAID_ASSETS[3],duration:110,hp:390000,damage:37,speed:60,r:47,gimmick:"삼절검총 · 검인 3개 파괴 전 본체 보호"},
    {id:"cheondan",gate:4,name:"우호법 천단",sprite:RAID_ASSETS[4],duration:120,hp:620000,damage:43,speed:50,r:53,gimmick:"금강반진 · 정면 방어 중 후방을 공략"},
    {id:"cheonma",gate:5,name:"천마(폭주)",sprite:RAID_ASSETS[5],duration:330,hp:1250000,damage:50,speed:0,r:92,gimmick:"마수 한쪽 파괴 → 마룡 변신 → 천마 본체",fixed:true}
  ];
  const FINAL_ASSETS=Object.freeze({body:RAID_ASSETS[5],leftArm:RAID_ASSETS[6],rightArm:RAID_ASSETS[7],dragon:RAID_ASSETS[8]});
  const FINAL_HP=Object.freeze({arm:420000,dragon:900000,body:1250000});

  const raid={
    active:false,lastRun:false,stageIndex:0,completedGates:0,stageTime:0,currentBoss:null,
    telegraphs:[],parts:[],patternIndex:0,patternTimer:0,awaitingGrowth:false,awaitingCombat:false,keyConsumed:false,nextStage:0,
    previousDifficulty:"chuchul",gimmickTriggered:false,gimmickTimer:0,shieldActive:false,
    shieldAngle:0,autoTraining:false,finishing:false,finalMaxTotal:0,finalDamage:0,
    finalPhase:0,finalCompletedDamage:0,finalPhaseMax:{arm:0,dragon:0,body:0},overseer:null,phaseGrace:0
  };

  const hud={
    root:document.getElementById("raidHud"),stage:document.getElementById("raidStageText"),
    timer:document.getElementById("raidTimerText"),boss:document.getElementById("raidBossName"),
    gimmick:document.getElementById("raidGimmickText"),parts:document.getElementById("raidPartBars"),
    lobby:document.getElementById("soloRaidLobby"),tokens:document.getElementById("raidTokenBalance")
  };

  function ensureRaidAccount(){
    account.raidKeys=Math.max(0,Math.floor(Number(account.raidKeys)||0));account.divineStones=Math.max(0,Math.floor(Number(account.divineStones)||0));account.eternalOreSelectors=Math.max(0,Math.floor(Number(account.eternalOreSelectors)||0));
    account.raidStats=Object.assign({runs:0,clears:0,bestProgress:0,bestFinalDamage:0},account.raidStats||{});
    return account.raidStats;
  }
  function fmtClock(seconds){seconds=Math.max(0,Math.ceil(seconds));return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`}
  function angleDiff(a,b){return Math.atan2(Math.sin(a-b),Math.cos(a-b))}
  function distanceToSegment(px,py,x1,y1,x2,y2){
    const vx=x2-x1,vy=y2-y1,l2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((px-x1)*vx+(py-y1)*vy)/l2));
    return Math.hypot(px-(x1+vx*t),py-(y1+vy*t));
  }
  function raidPowerScale(){return 1}
  function arenaPoint(index,radius=330){const a=-Math.PI/2+index*Math.PI/2;return{x:Math.cos(a)*radius,y:Math.sin(a)*radius}}

  function clearCombatObjects(keepBoss=false){
    for(const item of projectiles)GamePools.projectile.release(item);
    for(const item of particles)GamePools.particle.release(item);
    projectiles.length=gems.length=particles.length=visuals.length=fields.length=delayed.length=hazards.length=chests.length=0;
    if(!keepBoss){enemies.length=0;boss=null;raid.currentBoss=null;raid.parts.length=0;raid.overseer=null}
    raid.telegraphs.length=0;GameSpatial.rebuild(enemies);
  }

  function makeBoss(stage,overrides={}){
    const hp=Math.round((overrides.hp||stage.hp)),fixed=overrides.fixed??!!stage.fixed;
    return {
      ...overrides,type:"boss",raidBoss:true,raidId:overrides.raidId||stage.id,bossName:overrides.bossName||stage.name,sprite:overrides.sprite||stage.sprite,
      x:overrides.x??0,y:overrides.y??(fixed?-355:-310),homeX:overrides.x??0,homeY:overrides.y??(fixed?-355:-310),r:overrides.r||stage.r,hp,maxHp:hp,speed:overrides.speed??stage.speed,damage:overrides.damage??stage.damage,
      xp:0,color:"#8f2d32",hit:0,orbitHit:0,pushX:0,pushY:0,slow:1,slowTime:0,
      stunTime:0,poison:0,poisonTime:0,poisonTick:0,dead:false,fixed,
      summon:Infinity,blast:Infinity,dash:Infinity,orbs:Infinity,cross:Infinity,puddle:Infinity,
      phase2:true,phase3:true,phase3Burst:true,special:Infinity,chargeDelay:0,chargeTime:0,
      chargeVx:0,chargeVy:0,contactGrace:1.4
    };
  }

  function makePart(id,name,x,y,hp,r=55,visual={}){
    const part={type:"raidpart",raidPart:true,raidId:id,bossName:name,x,y,homeX:x,homeY:y,r,hp,maxHp:hp,speed:0,damage:0,xp:0,color:"#bd4b4e",hit:0,orbitHit:0,pushX:0,pushY:0,slow:1,slowTime:0,stunTime:0,poison:0,poisonTime:0,poisonTick:0,dead:false,contactGrace:999,...visual};
    raid.parts.push(part);enemies.push(part);return part;
  }

  function finalHp(key){return Math.round(FINAL_HP[key])}
  function spawnFinalPhaseOne(stage){
    raid.finalPhase=1;raid.finalCompletedDamage=0;raid.phaseGrace=2.4;
    raid.finalPhaseMax={arm:finalHp("arm"),dragon:finalHp("dragon"),body:finalHp("body")};
    raid.finalMaxTotal=raid.finalPhaseMax.arm+raid.finalPhaseMax.dragon+raid.finalPhaseMax.body;
    const armHp=raid.finalPhaseMax.arm;
    raid.overseer={raidBoss:true,raidDisplayOnly:true,raidId:"cheonma-overseer",bossName:"천마(폭주)",sprite:FINAL_ASSETS.body,x:0,y:-425,homeX:0,homeY:-425,r:0,hp:armHp,maxHp:armHp,damage:stage.damage,fixed:true,dead:false};
    raid.currentBoss=raid.overseer;boss=raid.overseer;
    makePart("cheonma-left-arm","좌측 거대 마수",-245,-65,armHp,96,{sprite:FINAL_ASSETS.leftArm,spriteWidth:545,spriteOffsetX:-145,spriteOffsetY:-70,raidFinalArm:true});
    makePart("cheonma-right-arm","우측 거대 마수",245,-65,armHp,96,{sprite:FINAL_ASSETS.rightArm,spriteWidth:545,spriteOffsetX:145,spriteOffsetY:-70,raidFinalArm:true});
    showMessage("1페이즈 · 좌우 마수 중 한쪽을 파괴하라",2.5);updateRaidHud();
  }

  function startFinalPhaseTwo(){
    clearCombatObjects();raid.finalPhase=2;raid.finalCompletedDamage=raid.finalPhaseMax.arm;raid.phaseGrace=2.6;raid.patternIndex=0;raid.patternTimer=2.8;
    const stage=STAGES[4],dragon=makeBoss(stage,{raidId:"cheonma-dragon",bossName:"폭주 마룡",sprite:FINAL_ASSETS.dragon,hp:FINAL_HP.dragon,x:0,y:-230,homeX:0,homeY:-230,r:112,fixed:true,speed:0,damage:stage.damage*1.08,raidFinalEntity:true});
    raid.currentBoss=dragon;boss=dragon;enemies.push(dragon);player.invuln=Math.max(player.invuln||0,2.8);screenShake=Math.max(screenShake,22);
    addVisual({type:"ring",x:0,y:-180,r:320,life:1.2,max:1.2,color:"#c33cff",width:16});particle(0,-180,"#a63cff",220,34);
    showMessage("2페이즈 · 천마가 마룡으로 변신한다",2.7);GameAudio.playSFX("boss-spawn");updateRaidHud();
  }

  function startFinalPhaseThree(){
    clearCombatObjects();raid.finalPhase=3;raid.finalCompletedDamage=raid.finalPhaseMax.arm+raid.finalPhaseMax.dragon;raid.phaseGrace=2.8;raid.patternIndex=0;raid.patternTimer=3.1;
    const stage=STAGES[4],body=makeBoss(stage,{raidId:"cheonma-body",bossName:"천마(폭주) · 본체",sprite:FINAL_ASSETS.body,hp:FINAL_HP.body,x:0,y:-385,homeX:0,homeY:-385,r:82,fixed:true,speed:0,damage:stage.damage*1.18,raidFinalEntity:true});
    raid.currentBoss=body;boss=body;enemies.push(body);player.invuln=Math.max(player.invuln||0,3);screenShake=Math.max(screenShake,25);
    addVisual({type:"ring",x:0,y:-310,r:360,life:1.35,max:1.35,color:"#ff354f",width:18});particle(0,-310,"#d92c52",240,38);
    showMessage("3페이즈 · 천마 본체가 직접 강림한다",2.8);GameAudio.playSFX("boss-spawn");updateRaidHud();
  }

  function spawnStage(index){
    if(!raid.active||index<0||index>=STAGES.length)return;
    clearCombatObjects();raid.awaitingCombat=false;raid.stageIndex=index;raid.nextStage=index;raid.patternIndex=0;raid.patternTimer=2.8;
    if(index!==4){raid.finalPhase=0;raid.phaseGrace=0}
    raid.gimmickTriggered=false;raid.gimmickTimer=0;raid.shieldActive=false;raid.stageTime=STAGES[index].duration;
    player.x=0;player.y=index===4?245:250;player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.3);
    player.invuln=Math.max(player.invuln||0,2.2);spawnTimer=Infinity;nextMiniBossAt=Infinity;finalBossAt=Infinity;runDuration=Infinity;bossSpawned=true;
    const stage=STAGES[index];let entity;
    if(stage.id==="cheonma"){spawnFinalPhaseOne(stage);entity=raid.currentBoss}
    else{entity=makeBoss(stage);boss=entity;raid.currentBoss=entity;enemies.push(entity)}
    state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";ui.bossWrap.style.display="block";
    hud.root?.classList.add("show");updateRaidHud();
    if(index!==4)showMessage(`${index+1}관문 · ${stage.name}`,2.5);
    GameAudio.playSFX("boss-spawn");GameEvents.emit("boss:spawn",{boss:entity,raid:true,stage:index});
  }

  function queueTelegraph(spec){
    if(!raid.active||state!=="playing")return;
    const warning=Math.max(.55,Number(spec.warning)||.9);
    raid.telegraphs.push(Object.assign({warning,time:warning,color:"#f35b50",name:"위험 패턴",executed:false},spec));
  }
  function hitCircle(x,y,r,damage){if(Math.hypot(player.x-x,player.y-y)<=r+(player.hitRadius||player.r))hurtPlayer(damage)}
  function hitLine(x1,y1,x2,y2,width,damage){if(distanceToSegment(player.x,player.y,x1,y1,x2,y2)<=width+(player.hitRadius||player.r))hurtPlayer(damage)}
  function hitCone(x,y,a,r,half,damage){
    const dx=player.x-x,dy=player.y-y,d=Math.hypot(dx,dy),da=Math.abs(angleDiff(Math.atan2(dy,dx),a));
    if(d<=r+(player.hitRadius||player.r)&&da<=half)hurtPlayer(damage);
  }
  function burstCircle(x,y,r,damage,color="#d84a45"){hitCircle(x,y,r,damage);addVisual({type:"ring",x,y,r,life:.42,max:.42,color,width:9});particle(x,y,color,150,16)}
  function burstLine(x1,y1,x2,y2,width,damage,color="#ef6258"){hitLine(x1,y1,x2,y2,width,damage);addVisual({type:"line",x1,y1,x2,y2,width:width*1.35,life:.24,max:.24,color})}
  function bossToPlayerAngle(entity=raid.currentBoss){return Math.atan2(player.y-entity.y,player.x-entity.x)}
  function lineThroughPoint(x,y,a,length=1250){return{x1:x-Math.cos(a)*length,y1:y-Math.sin(a)*length,x2:x+Math.cos(a)*length,y2:y+Math.sin(a)*length}}

  function pengPattern(e){
    const i=raid.patternIndex++%3,damage=e.damage*(e.raidEnraged?1.18:1);
    if(i===0){
      const a=bossToPlayerAngle(e),line=lineThroughPoint(player.x,player.y,a,800);
      queueTelegraph({kind:"line",name:"혈도횡단",...line,width:34,warning:1.05,execute:()=>burstLine(line.x1,line.y1,line.x2,line.y2,34,damage,"#ef5b4e")});
    }else if(i===1){
      const a=bossToPlayerAngle(e);
      queueTelegraph({kind:"cone",name:"멸문도강",x:e.x,y:e.y,a,r:390,half:.42,warning:1.0,execute:()=>{hitCone(e.x,e.y,a,390,.42,damage*1.15);addVisual({type:"cone",x:e.x,y:e.y,a,r:390,half:.42,life:.25,max:.25,color:"#ff6d52"})}});
    }else{
      const lines=[0,Math.PI/2,Math.PI/4,-Math.PI/4].map(a=>lineThroughPoint(e.x,e.y,a,760));
      queueTelegraph({kind:"multiLine",name:"파천도진",lines,width:24,warning:1.2,execute:()=>lines.forEach(line=>burstLine(line.x1,line.y1,line.x2,line.y2,24,damage*.82,"#d5403d"))});
    }
    if(!raid.gimmickTriggered&&e.hp/e.maxHp<=.6){
      raid.gimmickTriggered=true;e.raidEnraged=true;e.speed*=1.16;
      queueTelegraph({kind:"circle",name:"기믹 · 혈도세 해방",x:e.x,y:e.y,r:245,warning:1.55,color:"#ff4038",execute:()=>{burstCircle(e.x,e.y,245,e.damage*1.3,"#ff4038");raid.patternTimer=Math.min(raid.patternTimer,1.2);showMessage("팽단휘의 혈도세가 폭주한다",1.7)}});
    }
  }

  function namgungSafeSeal(e){
    const safe=arenaPoint(Math.floor(raid.patternIndex/2)%4,300);
    queueTelegraph({kind:"safe",name:"기믹 · 사상법진",safeX:safe.x,safeY:safe.y,safeR:92,warning:2.05,color:"#7fbfff",execute:()=>{
      if(Math.hypot(player.x-safe.x,player.y-safe.y)>92-(player.hitRadius||player.r))hurtPlayer(e.damage*1.55);
      addVisual({type:"ring",x:safe.x,y:safe.y,r:92,life:.55,max:.55,color:"#8fd6ff",width:9});
    }});
  }
  function namgungPattern(e){
    const i=raid.patternIndex++%4;
    if(i===2){namgungSafeSeal(e);return}
    if(i===0){
      const marks=[[-115,-70],[115,-70],[-115,110],[115,110]].map(([x,y])=>({x:player.x+x,y:player.y+y,r:64}));
      queueTelegraph({kind:"multiCircle",name:"봉마뢰",circles:marks,warning:1.15,color:"#8578ff",execute:()=>marks.forEach(m=>burstCircle(m.x,m.y,m.r,e.damage*.82,"#846cf0"))});
    }else if(i===1){
      const a=bossToPlayerAngle(e),count=7;
      queueTelegraph({kind:"radial",name:"만법귀원",x:e.x,y:e.y,r:105,warning:1.0,color:"#8e70ec",execute:()=>{
        for(let n=0;n<count;n++){const aa=a+(n-(count-1)/2)*.24;hazards.push({type:"orb",x:e.x,y:e.y,vx:Math.cos(aa)*210,vy:Math.sin(aa)*210,r:9,life:4.2,damage:e.damage*.62,color:"#8b69e8",dead:false})}
      }});
    }else{
      const ring=[135,260,385];
      queueTelegraph({kind:"rings",name:"삼중법환",x:e.x,y:e.y,rings:ring,width:38,warning:1.25,color:"#596de2",execute:()=>ring.forEach(r=>{const d=Math.hypot(player.x-e.x,player.y-e.y);if(Math.abs(d-r)<38+(player.hitRadius||player.r))hurtPlayer(e.damage*.9);addVisual({type:"ring",x:e.x,y:e.y,r,life:.3,max:.3,color:"#7288ff",width:12})})});
    }
  }

  function spawnSwordSeals(e){
    const hp=Math.round(e.maxHp*.105),points=[arenaPoint(0,255),arenaPoint(1,255),arenaPoint(3,255)];
    points.forEach((p,index)=>makePart(`sword-seal-${index+1}`,`검인 ${index+1}`,p.x,p.y,hp,29));
    raid.gimmickTimer=12;showMessage("삼절검총 · 검인 3개를 파괴하라",2.2);updateRaidHud();
  }
  function maPattern(e){
    const i=raid.patternIndex++%3;
    if(!raid.gimmickTriggered&&e.hp/e.maxHp<=.68){raid.gimmickTriggered=true;spawnSwordSeals(e)}
    if(i===0){
      const target={x:player.x,y:player.y},lines=[-.42,0,.42].map(off=>lineThroughPoint(target.x,target.y,bossToPlayerAngle(e)+off,720));
      queueTelegraph({kind:"multiLine",name:"삼절검진",lines,width:19,warning:1.1,color:"#70cce4",execute:()=>lines.forEach(line=>burstLine(line.x1,line.y1,line.x2,line.y2,19,e.damage*.72,"#78d9ee"))});
    }else if(i===1){
      const circles=Array.from({length:5},(_,n)=>{const a=n*Math.PI*2/5+raid.stageIndex;return{x:player.x+Math.cos(a)*115,y:player.y+Math.sin(a)*115,r:54}});
      queueTelegraph({kind:"multiCircle",name:"유성검락",circles,warning:1.0,color:"#74d8ec",execute:()=>circles.forEach(c=>burstCircle(c.x,c.y,c.r,e.damage*.7,"#85e6f3"))});
    }else{
      const a=bossToPlayerAngle(e);
      queueTelegraph({kind:"cone",name:"무형검역",x:e.x,y:e.y,a,r:450,half:.25,warning:.9,color:"#b6f5ff",execute:()=>{hitCone(e.x,e.y,a,450,.25,e.damage*1.15);addVisual({type:"cone",x:e.x,y:e.y,a,r:450,half:.25,life:.22,max:.22,color:"#b6f5ff"})}});
    }
  }

  function activateCheondanShield(e){
    raid.shieldActive=true;raid.shieldAngle=bossToPlayerAngle(e);raid.gimmickTimer=4.2;
    showMessage("금강반진 · 정면 공격을 막는다. 후방으로 이동하라",2.1);updateRaidHud();
  }
  function cheondanPattern(e){
    const i=raid.patternIndex++%4;
    if(i===1){activateCheondanShield(e);return}
    if(i===0){
      const target={x:player.x,y:player.y};
      queueTelegraph({kind:"circle",name:"금강진각",x:target.x,y:target.y,r:128,warning:1.0,color:"#e2a846",execute:()=>burstCircle(target.x,target.y,128,e.damage,"#e2a846")});
    }else if(i===2){
      const a=bossToPlayerAngle(e);
      queueTelegraph({kind:"cone",name:"항마벽력장",x:e.x,y:e.y,a,r:360,half:.56,warning:1.15,color:"#efad4c",execute:()=>{hitCone(e.x,e.y,a,360,.56,e.damage*1.1);addVisual({type:"cone",x:e.x,y:e.y,a,r:360,half:.56,life:.26,max:.26,color:"#efad4c"})}});
    }else{
      const rings=[115,220,325];
      queueTelegraph({kind:"rings",name:"부동명왕진",x:e.x,y:e.y,rings,width:32,warning:1.3,color:"#d39d47",execute:()=>rings.forEach(r=>{const d=Math.hypot(player.x-e.x,player.y-e.y);if(Math.abs(d-r)<32+(player.hitRadius||player.r))hurtPlayer(e.damage*.85);addVisual({type:"ring",x:e.x,y:e.y,r,life:.3,max:.3,color:"#efc568",width:10})})});
    }
  }

  function alivePart(id){return raid.parts.find(part=>part.raidId===id&&!part.dead)}
  function finalArmPattern(e){
    const left=alivePart("cheonma-left-arm"),right=alivePart("cheonma-right-arm"),i=raid.patternIndex++%3;
    if(i===0&&left){
      const a=Math.atan2(player.y-left.y,player.x-left.x),x2=left.x+Math.cos(a)*1150,y2=left.y+Math.sin(a)*1150;
      queueTelegraph({kind:"line",name:"좌측 마수 · 멸혼마광",x1:left.x,y1:left.y,x2,y2,width:46,warning:1.35,color:"#b83dff",execute:()=>burstLine(left.x,left.y,x2,y2,46,e.damage,"#b83dff")});
    }else if(i===1&&right){
      const target={x:player.x,y:player.y},circles=[target,...[0,1,2].map(n=>{const a=n*Math.PI*2/3;return{x:target.x+Math.cos(a)*145,y:target.y+Math.sin(a)*145,r:72}})];circles[0].r=132;
      queueTelegraph({kind:"multiCircle",name:"우측 마수 · 마장폭발",circles,warning:1.4,color:"#df3cff",execute:()=>circles.forEach(c=>burstCircle(c.x,c.y,c.r,e.damage*.82,"#cf42ff"))});
    }else{
      const arms=[left,right].filter(Boolean),lines=arms.map(arm=>{const a=Math.atan2(player.y-arm.y,player.x-arm.x);return{x1:arm.x,y1:arm.y,x2:arm.x+Math.cos(a)*1200,y2:arm.y+Math.sin(a)*1200}});
      queueTelegraph({kind:"multiLine",name:"양대 마수 · 교차멸진",lines,width:38,warning:1.55,color:"#f044ff",execute:()=>lines.forEach(line=>burstLine(line.x1,line.y1,line.x2,line.y2,38,e.damage*.9,"#e545ff"))});
    }
  }
  function demonDragonPattern(e){
    const i=raid.patternIndex++%4;
    if(i===0){
      const a=bossToPlayerAngle(e);queueTelegraph({kind:"cone",name:"마룡 · 멸세용식",x:e.x,y:e.y,a,r:520,half:.42,warning:1.4,color:"#b338ff",execute:()=>{hitCone(e.x,e.y,a,520,.42,e.damage*1.08);addVisual({type:"cone",x:e.x,y:e.y,a,r:520,half:.42,life:.32,max:.32,color:"#c440ff"})}});
    }else if(i===1){
      const rings=[145,285,425];queueTelegraph({kind:"rings",name:"마룡 · 마미천륜",x:e.x,y:e.y,rings,width:42,warning:1.45,color:"#8f3ee8",execute:()=>rings.forEach(r=>{const d=Math.hypot(player.x-e.x,player.y-e.y);if(Math.abs(d-r)<42+(player.hitRadius||player.r))hurtPlayer(e.damage*.88);addVisual({type:"ring",x:e.x,y:e.y,r,life:.34,max:.34,color:"#a548f2",width:14})})});
    }else if(i===2){
      const circles=Array.from({length:6},(_,n)=>{const a=n*Math.PI/3+raid.patternIndex*.2;return{x:player.x+Math.cos(a)*150,y:player.y+Math.sin(a)*150,r:68}});queueTelegraph({kind:"multiCircle",name:"마룡 · 육조마흔",circles,warning:1.2,color:"#d53cff",execute:()=>circles.forEach(c=>burstCircle(c.x,c.y,c.r,e.damage*.72,"#d947ff"))});
    }else{
      const a=bossToPlayerAngle(e),lines=[-.32,0,.32].map(off=>{const q=a+off;return{x1:e.x,y1:e.y,x2:e.x+Math.cos(q)*1250,y2:e.y+Math.sin(q)*1250}});queueTelegraph({kind:"multiLine",name:"마룡 · 삼중마식",lines,width:28,warning:1.25,color:"#a930f2",execute:()=>lines.forEach(line=>burstLine(line.x1,line.y1,line.x2,line.y2,28,e.damage*.74,"#b83cff"))});
    }
  }
  function heavenlyDemonBodyPattern(e){
    const i=raid.patternIndex++%4;
    if(i===0){
      const a=bossToPlayerAngle(e),lines=[0,Math.PI/2].map(off=>lineThroughPoint(player.x,player.y,a+off,900));queueTelegraph({kind:"multiLine",name:"천마 본체 · 천마멸세",lines,width:44,warning:1.35,color:"#ff304e",execute:()=>lines.forEach(line=>burstLine(line.x1,line.y1,line.x2,line.y2,44,e.damage*.9,"#ff3852"))});
    }else if(i===1){
      const target={x:player.x,y:player.y};queueTelegraph({kind:"circle",name:"천마 본체 · 군림마장",x:target.x,y:target.y,r:178,warning:1.25,color:"#ff3f5d",execute:()=>burstCircle(target.x,target.y,178,e.damage*1.12,"#ff3b58")});
    }else if(i===2){
      const a=bossToPlayerAngle(e);queueTelegraph({kind:"cone",name:"천마 본체 · 천마신장",x:e.x,y:e.y,a,r:560,half:.55,warning:1.5,color:"#e92c50",execute:()=>{hitCone(e.x,e.y,a,560,.55,e.damage*1.15);addVisual({type:"cone",x:e.x,y:e.y,a,r:560,half:.55,life:.34,max:.34,color:"#f33758"})}});
    }else{
      const safe=arenaPoint(raid.patternIndex%4,305);queueTelegraph({kind:"safe",name:"천마 본체 · 마역붕괴",safeX:safe.x,safeY:safe.y,safeR:98,warning:2.0,color:"#ff304d",execute:()=>{if(Math.hypot(player.x-safe.x,player.y-safe.y)>98-(player.hitRadius||player.r))hurtPlayer(e.damage*1.45);addVisual({type:"ring",x:safe.x,y:safe.y,r:98,life:.5,max:.5,color:"#ff6b82",width:10})}});
    }
  }

  function schedulePattern(){
    const e=raid.currentBoss;if(!e||e.dead)return;
    if(e.raidId==="peng")pengPattern(e);
    else if(e.raidId==="namgung")namgungPattern(e);
    else if(e.raidId==="ma")maPattern(e);
    else if(e.raidId==="cheondan")cheondanPattern(e);
    else if(e.raidId==="cheonma-overseer")finalArmPattern(e);
    else if(e.raidId==="cheonma-dragon")demonDragonPattern(e);
    else heavenlyDemonBodyPattern(e);
    const base={peng:3.25,namgung:3.45,ma:3.25,cheondan:3.5,"cheonma-overseer":3.35,"cheonma-dragon":3.15,"cheonma-body":2.95}[e.raidId]||3.4;
    raid.patternTimer=base*(e.raidEnraged?.82:1);
  }

  function tickTelegraphs(dt){
    for(const warning of raid.telegraphs){
      warning.time-=dt;
      if(warning.time<=0&&!warning.executed){warning.executed=true;warning.execute?.()}
    }
    raid.telegraphs=raid.telegraphs.filter(warning=>!warning.executed);
    updateWarningLabel();
  }
  function tickGimmicks(dt){
    if(raid.gimmickTimer<=0)return;raid.gimmickTimer-=dt;
    if(raid.currentBoss?.raidId==="ma"&&raid.gimmickTimer<=0){
      const seals=raid.parts.filter(part=>part.raidId.startsWith("sword-seal-")&&!part.dead);
      if(seals.length){hurtPlayer(raid.currentBoss.damage*1.35);raid.currentBoss.hp=Math.min(raid.currentBoss.maxHp,raid.currentBoss.hp+raid.currentBoss.maxHp*.08);seals.forEach(part=>part.dead=true);showMessage("검총 붕괴 실패 · 마허진의 기혈 회복",1.8)}
    }
    if(raid.currentBoss?.raidId==="cheondan"&&raid.gimmickTimer<=0){raid.shieldActive=false;showMessage("금강반진 해제 · 공격 기회",1.2)}
  }

  function raidTick(dt){
    if(!raid.active||state!=="playing")return;
    spawnTimer=Infinity;nextMiniBossAt=Infinity;finalBossAt=Infinity;runDuration=Infinity;bossSpawned=true;
    const distance=Math.hypot(player.x,player.y);if(distance>ARENA_RADIUS){const q=ARENA_RADIUS/distance;player.x*=q;player.y*=q}
    for(const entity of enemies){if((entity.raidBoss&&entity.fixed)||entity.raidFinalArm){entity.x=entity.homeX??entity.x;entity.y=entity.homeY??entity.y;entity.pushX=entity.pushY=0}}
    if(raid.phaseGrace>0){raid.phaseGrace=Math.max(0,raid.phaseGrace-dt);player.invuln=Math.max(player.invuln||0,.2);updateRaidHud();return}
    raid.stageTime-=dt;raid.patternTimer-=dt;tickGimmicks(dt);tickTelegraphs(dt);
    if(raid.patternTimer<=0&&raid.telegraphs.length<2)schedulePattern();
    if(raid.stageTime<=0)finishRaid(false,"time");
    updateRaidHud();
  }

  function currentProgress(){
    if(raid.stageIndex===4){
      let dealt=raid.finalCompletedDamage;
      if(raid.finalPhase===1){const armDamage=raid.parts.filter(p=>p.raidFinalArm).reduce((n,p)=>n+Math.max(0,p.maxHp-Math.max(0,p.hp)),0);dealt=Math.min(raid.finalPhaseMax.arm,armDamage)}
      else if(raid.currentBoss)dealt+=Math.max(0,raid.currentBoss.maxHp-Math.max(0,raid.currentBoss.hp));
      const fraction=raid.finalMaxTotal?dealt/raid.finalMaxTotal:0;raid.finalDamage=Math.max(raid.finalDamage,fraction);return 4+Math.max(0,Math.min(1,fraction));
    }
    const body=raid.currentBoss,fraction=body?1-Math.max(0,body.hp)/Math.max(1,body.maxHp):0;
    return Math.max(0,Math.min(5,raid.completedGates+Math.max(0,Math.min(1,fraction))));
  }

  function randomOre(grade){
    const ids=Object.keys(oreTypes),type=ids[Math.floor(Math.random()*ids.length)],key=oreKey(type,grade);
    account.ores[key]=(account.ores[key]||0)+1;return `${gradeName(grade)} ${oreTypes[type].name}`;
  }
  function settleRaidRewards(progress,win,reason){
    ensureRaidAccount();const items=[];
    if(reason!=="quit"){
      if(win){account.eternalOreSelectors++;account.weaponSoulStones+=5;account.divineStones+=3;items.push("영원 광석 선택권 1장","무혼석 5개","무신석 3개")}
      else if(raid.stageIndex===4&&raid.finalPhase>=3){items.push(randomOre("mythic"));account.weaponSoulStones+=3;account.divineStones+=2;items.push("무혼석 3개","무신석 2개")}
      else if(raid.stageIndex===4&&raid.finalPhase>=2){items.push(randomOre("mythic"));account.weaponSoulStones+=2;account.divineStones+=1;items.push("무혼석 2개","무신석 1개")}
      else if(progress>=4){items.push(randomOre("legendary"));account.weaponSoulStones+=2;account.divineStones+=1;items.push("무혼석 2개","무신석 1개")}
      else if(progress>=3){items.push(randomOre("legendary"));account.weaponSoulStones+=1;items.push("무혼석 1개")}
      else if(progress>=2){items.push(randomOre("unique"));account.weaponSoulStones+=1;items.push("무혼석 1개")}
      else if(progress>=1)items.push(randomOre("epic"));
    }
    const stats=account.raidStats;if(raid.keyConsumed){stats.runs++;if(win)stats.clears++;stats.bestProgress=Math.max(stats.bestProgress,progress);stats.bestFinalDamage=Math.max(stats.bestFinalDamage,raid.finalDamage||0);}
    saveAccountData();return{items};
  }

  function finishRaid(win,reason="defeat"){
    if(!raid.active||raid.finishing)return;raid.finishing=true;
    if(win)raid.finalDamage=1;
    const progress=win?5:currentProgress(),reward=settleRaidRewards(progress,win,reason),stage=STAGES[Math.min(4,raid.stageIndex)];
    raid.lastRun=true;raid.active=false;raid.telegraphs.length=0;hud.root?.classList.remove("show");removeWarningLabel();
    state=win?"victory":"gameover";pointer.active=false;ui.joystick.style.display="none";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";ui.bossWrap.style.display="none";
    // 일반 원정 집계는 업적 금자를 지급할 수 있으므로 레이드에서는 전용 raidStats만 사용한다.
    if(typeof runFinalized!=="undefined")runFinalized=true;
    const pct=Math.round((progress-Math.floor(progress))*100),where=win?"최종 완주":raid.stageIndex<4?`${raid.stageIndex+1}관문 · ${stage.name} ${pct}% 피해`:`최종 천마 ${Math.round((raid.finalDamage||0)*100)}% 피해`;
    ui.resultTitle.textContent=win?"천마를 굴복시켰다":"사대관문에서 패퇴했다";
    ui.finalStats.innerHTML=`콘텐츠 <b>천마신교 1인 레이드</b><br>도달 기록 <b>${where}</b><br>레이드 진행도 <b>${progress.toFixed(2)} / 5.00</b><br>최종 경지 <b>${player.level}</b> · 금자/경험치 획득 <b>0</b><br>보상 <b>${reward.items.length?reward.items.join(" · "):"없음"}</b>${reason==="quit"?'<br><span class="danger-note">중도 이탈은 보상이 지급되지 않는다.</span>':""}`;
    document.getElementById("restartBtn").textContent="같은 협객으로 레이드 재도전";
    ui.result.classList.add("show");GameAudio.playUI(win?"victory":"defeat");raid.previousDifficulty&& (selectedDifficulty=raid.previousDifficulty);
    clearCombatObjects();raid.finishing=false;
  }

  function gateClear(entity){
    const cleared=raid.stageIndex;raid.completedGates=Math.max(raid.completedGates,cleared+1);raid.currentBoss=null;boss=null;ui.bossWrap.style.display="none";
    raid.telegraphs.length=0;raid.parts.forEach(part=>part.dead=true);raid.parts.length=0;projectiles.length=hazards.length=delayed.length=0;
    if(cleared===4){finishRaid(true,"clear");return}
    const levels=GATE_LEVELS[cleared];showMessage(`${cleared+1}관문 돌파 · 경지 +${levels}`,2.1);GameAudio.playUI("victory");
    player.hp=Math.min(player.maxHp,player.hp+player.maxHp*.3);player.level+=levels;player.xp=0;player.xpNeed=xpRequirement(player.level);pendingLevelUps+=levels;
    raid.awaitingGrowth=true;raid.nextStage=cleared+1;state="levelup";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";setTimeout(levelChoice,180);
  }

  function updateRaidHud(){
    if(!raid.active)return;const stage=STAGES[raid.stageIndex],e=raid.currentBoss;
    const final=raid.stageIndex===4,phaseName={1:"1/3 · 양대 마수",2:"2/3 · 폭주 마룡",3:"3/3 · 천마 본체"}[raid.finalPhase]||"강림 준비";
    const displayName=final?(raid.finalPhase===1?"천마의 양대 마수":e?.bossName||stage.name):stage.name;
    if(hud.stage)hud.stage.textContent=final?`최종 레이드 · ${phaseName}`:`${raid.stageIndex+1}관문 / 4관문`;
    if(hud.timer)hud.timer.textContent=fmtClock(raid.stageTime);if(hud.boss)hud.boss.textContent=displayName;
    if(hud.gimmick){
      let text=stage.gimmick;
      if(stage.id==="ma"&&raid.parts.some(p=>p.raidId.startsWith("sword-seal-")&&!p.dead))text=`검총 붕괴까지 ${Math.max(0,raid.gimmickTimer).toFixed(1)}초`;
      if(stage.id==="cheondan"&&raid.shieldActive)text=`금강반진 ${Math.max(0,raid.gimmickTimer).toFixed(1)}초 · 후방 공격`;
      if(final&&raid.finalPhase===1)text="좌우 마수 중 어느 한쪽이든 파괴하면 마룡으로 변신";
      if(final&&raid.finalPhase===2)text="마룡의 전조 범위를 회피하고 본체를 끌어내라";
      if(final&&raid.finalPhase===3)text="천마 본체 직접전 · 마역붕괴의 안전 법인을 확인";
      hud.gimmick.textContent=text;
    }
    if(hud.parts){const visible=raid.parts.filter(p=>!p.raidId.startsWith("sword-seal-")||!p.dead);hud.parts.innerHTML=visible.map(p=>`<div class="raid-part-bar ${p.dead?"destroyed":""}"><span>${p.bossName}</span><div class="raid-part-track"><i style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></i></div></div>`).join("")}
    const title=ui.bossWrap.querySelector("b");if(title)title.textContent=displayName;
    if(final&&raid.finalPhase===1){const target=raid.parts.filter(p=>p.raidFinalArm&&!p.dead).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(target){e.hp=target.hp;e.maxHp=target.maxHp}}
    if(e&&!e.dead){ui.bossFill.style.width=`${Math.max(0,e.hp/e.maxHp*100)}%`;ui.bossText.textContent=`${Math.ceil(e.hp).toLocaleString()} / ${Math.ceil(e.maxHp).toLocaleString()}`}
  }

  function startRaidGrowth(){
    player.level=START_LEVEL;player.xp=0;player.xpNeed=xpRequirement(START_LEVEL);
    const arts=weaponDefs[selectedWeapon].arts.filter(art=>art.hidden);
    for(const art of arts){player.hiddenReady[art.id]=true;player.hiddenNotified[art.id]=true;if((player.arts[art.id]||0)<1){player.arts[art.id]=1;art.onLearn?.(player,1);GameEvents.emit("skill:learned",{id:art.id,name:art.name,hidden:true,raid:true})}}
    pendingLevelUps=START_LEVEL-1;raid.awaitingGrowth=true;raid.awaitingCombat=false;raid.nextStage=0;state="levelup";levelChoice();
  }

  async function beginRaid(){
    if(!selectedWeapon){showMessage("먼저 협객을 선택하시오",1.4);return}
    ensureRaidAccount();if(account.raidKeys<1){showMessage("천마전의 열쇠가 필요하다",1.5);openLobby();return}
    const button=document.getElementById("soloRaidStart");button.disabled=true;button.textContent="레이드 에셋 준비 중…";
    try{
      const [weaponResult,raidResult]=await Promise.all([GameAssets.preloadWeapon(selectedWeapon),GameAssets.preloadList(RAID_ASSETS,()=>{},3)]);
      if(weaponResult.failed.length||raidResult.failed.length)showSystemToast("일부 레이드 에셋을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.",true);
      ensureRaidAccount();raid.active=true;raid.lastRun=false;raid.finishing=false;raid.keyConsumed=false;raid.awaitingCombat=false;raid.stageIndex=0;raid.completedGates=0;raid.finalDamage=0;raid.finalPhase=0;raid.finalCompletedDamage=0;raid.phaseGrace=0;raid.previousDifficulty=selectedDifficulty;selectedDifficulty="chuchul";
      initAudio();resetGame();clearCombatObjects();elapsed=0;spawnTimer=Infinity;nextMiniBossAt=Infinity;finalBossAt=Infinity;runDuration=Infinity;bossSpawned=true;
      updateCombatPortrait();[ui.menu,ui.result,ui.pause,ui.augment,ui.forge,hud.lobby].forEach(layer=>layer?.classList.remove("show"));
      ui.ultimateBtn.style.display="none";ui.dodgeBtn.style.display="none";hud.root?.classList.add("show");startRaidGrowth();last=performance.now();
    }catch(error){console.error("레이드 시작 실패",error);showSystemToast("레이드를 시작하지 못했습니다. 다시 시도해 주세요.",true)}
    finally{button.disabled=false;button.textContent="선택 협객으로 레이드 출전"}
  }

  function openLobby(){
    if(!selectedWeapon){showMessage("레이드에 출전할 협객을 먼저 선택하시오",1.5);return}
    ensureRaidAccount();const cp=window.CombatPowerSystem?CombatPowerSystem.equippedPower(selectedWeapon):0,rec=window.CombatPowerSystem?.recommended?.("raid")||55000;if(hud.tokens)hud.tokens.textContent=`천마전의 열쇠 ${account.raidKeys.toLocaleString()}개`;const start=document.getElementById("soloRaidStart");if(start){start.disabled=account.raidKeys<1;start.textContent=account.raidKeys<1?"천마전의 열쇠가 필요합니다":`레이드 준비 · 권장 전투력 ${CombatPowerSystem?.format?CombatPowerSystem.format(rec):rec}`};const power=document.getElementById("raidPowerHint");if(power)power.innerHTML=`현재 전투력 <b>${window.CombatPowerSystem?CombatPowerSystem.format(cp):cp}</b> / 권장 <b>${window.CombatPowerSystem?CombatPowerSystem.format(rec):rec}</b>${cp<rec?" · <span class='danger-note'>영원 +15 이상 권장</span>":" · 출전 권장"}`;hud.lobby?.classList.add("show");
  }
  function decorateGrowth(){
    if(!raid.active||state!=="levelup")return;ui.levelUp.classList.add("raid-growth");
    const title=ui.levelUp.querySelector("h2"),desc=ui.levelUp.querySelector(".desc");if(title)title.textContent=raid.stageIndex===0&&raid.completedGates===0?"레이드 사전 수련":"관문 돌파 · 전투 재정비";if(desc)desc.textContent="적은 생성되지 않는다. 남은 깨달음을 모두 배분한 뒤 전투진입을 눌러야 다음 구간이 시작된다.";
    const counter=document.createElement("div");counter.className="raid-growth-counter";counter.innerHTML=`<span>남은 성장</span><b>${pendingLevelUps}회</b><button class="secondary raid-auto-train" type="button">남은 성장 자동 수련</button>`;
    ui.hiddenBanner.prepend(counter);counter.querySelector("button").addEventListener("click",autoTrainRaid,{once:true});
  }
  function autoTrainRaid(){
    if(raid.autoTraining)return;raid.autoTraining=true;
    const step=()=>{if(!raid.active||pendingLevelUps<=0||state!=="levelup"){raid.autoTraining=false;return}const choice=ui.choices.querySelector(".choice");if(choice)choice.click();setTimeout(step,70)};step();
  }

  function updateWarningLabel(){
    const next=raid.telegraphs.slice().sort((a,b)=>a.time-b.time)[0];if(!next){removeWarningLabel();return}
    let label=document.querySelector(".raid-pattern-warning");if(!label){label=document.createElement("div");label.className="raid-pattern-warning";document.body.appendChild(label)}label.textContent=`⚠ ${next.name} · ${Math.max(0,next.time).toFixed(1)}초`;
  }
  function removeWarningLabel(){document.querySelector(".raid-pattern-warning")?.remove()}

  function drawTelegraph(t){
    const z=mobileCameraScale(),progress=Math.max(0,Math.min(1,t.time/t.warning)),pulse=.42+.2*Math.sin(performance.now()*.025);ctx.save();ctx.strokeStyle=t.color;ctx.fillStyle=t.color;ctx.lineWidth=Math.max(2,4*z);ctx.globalAlpha=.22+pulse*.18;
    const circle=(x,y,r)=>{const s=ws(x,y);ctx.beginPath();ctx.arc(s.x,s.y,r*z,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.8;ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,r*z*progress,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.lineWidth=Math.max(3,7*z);ctx.stroke();ctx.globalAlpha=.22+pulse*.18};
    const line=l=>{const a=ws(l.x1,l.y1),b=ws(l.x2,l.y2);ctx.lineWidth=(l.width||t.width||25)*2*z;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=.9;ctx.lineWidth=Math.max(2,3*z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=.22+pulse*.18};
    if(t.kind==="circle")circle(t.x,t.y,t.r);
    else if(t.kind==="multiCircle")t.circles.forEach(c=>circle(c.x,c.y,c.r));
    else if(t.kind==="line")line(t);
    else if(t.kind==="multiLine")t.lines.forEach(line);
    else if(t.kind==="cone"){const s=ws(t.x,t.y);ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,t.r*z,t.a-t.half,t.a+t.half);ctx.closePath();ctx.fill();ctx.globalAlpha=.85;ctx.stroke()}
    else if(t.kind==="radial")circle(t.x,t.y,t.r);
    else if(t.kind==="rings")t.rings.forEach(r=>{const s=ws(t.x,t.y);ctx.beginPath();ctx.arc(s.x,s.y,r*z,0,Math.PI*2);ctx.lineWidth=(t.width||30)*z;ctx.stroke()});
    else if(t.kind==="safe"){
      ctx.globalAlpha=.16+.09*pulse;ctx.fillStyle="#df3e45";ctx.fillRect(0,0,W,H);ctx.globalAlpha=.9;ctx.strokeStyle="#7fd4ff";const s=ws(t.safeX,t.safeY);ctx.lineWidth=Math.max(4,8*z);ctx.beginPath();ctx.arc(s.x,s.y,t.safeR*z,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=.13;ctx.fillStyle="#7fd4ff";ctx.fill()
    }
    ctx.restore();
  }
  function drawRaidWarnings(){if(!raid.active)return;raid.telegraphs.forEach(drawTelegraph)}

  function drawRaidEntity(entity){
    if(entity.dead)return;const stage=STAGES.find(item=>item.id===entity.raidId)||STAGES[raid.stageIndex],img=GameAssets.image(entity.sprite||stage.sprite),hitPoint=ws(entity.x,entity.y),z=mobileCameraScale();
    if(entity.raidPart&&!entity.sprite){
      ctx.save();ctx.translate(hitPoint.x,hitPoint.y);ctx.rotate(elapsed*1.8);ctx.strokeStyle=entity.raidId.startsWith("sword-seal-")?"#89ddef":"#e24c4e";ctx.fillStyle="rgba(16,20,24,.72)";ctx.lineWidth=3*z;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2,x=Math.cos(a)*entity.r*z,y=Math.sin(a)*entity.r*z;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();return;
    }
    if(!img?.naturalWidth)return;
    const renderPoint=ws(entity.x+(entity.spriteOffsetX||0),entity.y+(entity.spriteOffsetY||0));
    const finalWidth=entity.raidId==="cheonma-dragon"?670:["cheonma-body","cheonma-overseer"].includes(entity.raidId)?570:155;
    const width=(entity.spriteWidth||finalWidth)*z,height=width*(img.naturalHeight/img.naturalWidth),yOffset=entity.spriteYOffset??(["cheonma-body","cheonma-overseer","cheonma-dragon"].includes(entity.raidId)?.5:.72);
    ctx.save();ctx.imageSmoothingEnabled=true;if(entity.hit>0)ctx.filter="brightness(1.8) saturate(.75)";ctx.drawImage(img,renderPoint.x-width/2,renderPoint.y-height*yOffset,width,height);ctx.restore();
    if(entity.raidFinalArm){ctx.save();ctx.strokeStyle="rgba(218,78,255,.9)";ctx.shadowColor="#b53cff";ctx.shadowBlur=12;ctx.lineWidth=3*z;ctx.setLineDash([10*z,7*z]);ctx.beginPath();ctx.arc(hitPoint.x,hitPoint.y,entity.r*z,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore()}
    if(entity.raidId==="cheondan"&&raid.shieldActive){ctx.save();ctx.strokeStyle="#f4c15c";ctx.shadowColor="#f4b64d";ctx.shadowBlur=13;ctx.lineWidth=9*z;ctx.beginPath();ctx.arc(hitPoint.x,hitPoint.y,92*z,raid.shieldAngle-1.05,raid.shieldAngle+1.05);ctx.stroke();ctx.restore()}
  }

  const baseDrawBackground=drawBackground;
  drawBackground=function(){
    if(!raid.active)return baseDrawBackground.apply(this,arguments);
    ctx.fillStyle="#040508";ctx.fillRect(0,0,W,H);const img=GameAssets.image(RAID_ASSETS[0]);if(!img?.naturalWidth)return;
    const size=1400,z=mobileCameraScale(),top=ws(-size/2,-size/2);ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(img,top.x,top.y,size*z,size*z);ctx.restore();
  };
  const baseDrawEnemies=drawEnemies;
  drawEnemies=function(){
    if(!raid.active)return baseDrawEnemies.apply(this,arguments);
    const hidden=enemies.filter(e=>e.raidBoss||e.raidPart).map(e=>({e,dead:e.dead}));hidden.forEach(({e})=>e.dead=true);baseDrawEnemies.apply(this,arguments);hidden.forEach(({e,dead})=>e.dead=dead);if(raid.overseer)drawRaidEntity(raid.overseer);hidden.forEach(({e})=>drawRaidEntity(e));
  };
  const baseDraw=draw;
  draw=function(){baseDraw.apply(this,arguments);if(raid.active)drawRaidWarnings()};

  const baseUpdate=update;
  update=function(dt){
    if(raid.active){spawnTimer=Infinity;nextMiniBossAt=Infinity;finalBossAt=Infinity;runDuration=Infinity;bossSpawned=true}
    const result=baseUpdate.apply(this,arguments);if(raid.active)raidTick(dt);return result;
  };
  const baseDamageEnemy=damageEnemy;
  damageEnemy=function(entity,amount,source,options={}){
    if(raid.active&&entity){
      if(entity.raidDisplayOnly||(entity.raidFinalEntity||entity.raidFinalArm)&&raid.phaseGrace>0)return 0;
      if(entity.raidId==="ma"&&raid.parts.some(part=>part.raidId.startsWith("sword-seal-")&&!part.dead))amount=Math.min(amount*.05,Math.max(0,entity.hp-1));
      if(entity.raidId==="cheondan"&&raid.shieldActive){const from=Math.atan2(player.y-entity.y,player.x-entity.x);if(Math.abs(angleDiff(from,raid.shieldAngle))<1.05)amount*=.1}
    }
    return baseDamageEnemy.call(this,entity,amount,source,options);
  };
  const baseKillEnemy=killEnemy;
  killEnemy=function(entity,source="basic",options={}){
    if(!raid.active||!entity?.raidBoss&&!entity?.raidPart)return baseKillEnemy.apply(this,arguments);
    if(entity.dead)return;entity.dead=true;particle(entity.x,entity.y,entity.raidPart?"#e6b85f":"#d74345",170,24);
    if(entity.raidPart){
      if(entity.raidFinalArm&&raid.finalPhase===1){showMessage(`${entity.bossName} 파괴 · 마룡 변신`,2);startFinalPhaseTwo();return}
      showMessage(`${entity.bossName} 파괴`,1.1);
      if(entity.raidId.startsWith("sword-seal-")&&!raid.parts.some(part=>part.raidId.startsWith("sword-seal-")&&!part.dead)){raid.gimmickTimer=0;showMessage("삼절검총 붕괴 · 본체 보호 해제",1.7)}
      updateRaidHud();return;
    }
    if(entity.raidId==="cheonma-dragon"&&raid.finalPhase===2){startFinalPhaseThree();return}
    player.kills++;player.metrics.kills++;screenShake=Math.max(screenShake,18);gateClear(entity);
  };
  const baseEndGame=endGame;
  endGame=function(win,reason=""){if(raid.active)return finishRaid(!!win,reason||(!win?"defeat":"clear"));return baseEndGame.apply(this,arguments)};
  const baseGainXp=gainXp;
  gainXp=function(amount){if(raid.active)return;return baseGainXp.apply(this,arguments)};
  const baseUpdateHud=updateHud;
  updateHud=function(){
    baseUpdateHud.apply(this,arguments);if(!raid.active)return;
    ui.levelText.textContent=`경지 ${player.level}`;ui.timeText.textContent=fmtClock(raid.stageTime);ui.killText.textContent=raid.stageIndex<4?`관문 ${raid.stageIndex+1}/4`:"최종전";ui.xpFill.style.width="0%";ui.goldHud.textContent="금자 획득 없음";ui.oreHud.textContent=`열쇠 ${Math.floor(account.raidKeys||0)} · 무신석 ${Math.floor(account.divineStones||0)}`;updateRaidHud();
  };
  const baseLevelChoice=levelChoice;
  levelChoice=function(){const result=baseLevelChoice.apply(this,arguments);setTimeout(decorateGrowth,0);return result};
  const baseRenderPause=renderPause;
  renderPause=function(){baseRenderPause.apply(this,arguments);if(!raid.active)return;const stage=STAGES[raid.stageIndex];ui.pauseContent.insertAdjacentHTML("afterbegin",`<h3>1인 레이드</h3><div class="stat-grid"><div class="stat"><b>${raid.stageIndex<4?`${raid.stageIndex+1}관문`:"최종"}</b><span>현재 구간</span></div><div class="stat"><b>${fmtClock(raid.stageTime)}</b><span>제한시간</span></div><div class="stat"><b>${currentProgress().toFixed(2)}</b><span>진행도</span></div></div><div class="unlock-banner">${stage.name}<br>${stage.gimmick}</div>`)};

  function onGrowthReady(){
    if(!raid.active)return;raid.awaitingGrowth=false;raid.awaitingCombat=true;state="levelup";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";ui.levelUp.classList.add("show","raid-growth","raid-ready");const title=ui.levelUp.querySelector("h2"),desc=ui.levelUp.querySelector(".desc");if(title)title.textContent=raid.nextStage===0?"레이드 준비 완료":"관문 재정비 완료";if(desc)desc.textContent="전투진입 전에는 보스·패턴·제한시간이 시작되지 않는다.";ui.choices.innerHTML="";ui.hiddenBanner.innerHTML=`<div class="unlock-banner"><b>${raid.nextStage===0?"사대관문 출전 준비":"다음 관문 준비 완료"}</b><br>${raid.nextStage===0?"첫 전투진입 시 천마전의 열쇠 1개가 소모된다.":"성장을 확인한 뒤 다음 구간으로 진입하시오."}</div><button class="primary raid-combat-enter" id="raidCombatEnter" type="button">${raid.nextStage===0&&!raid.keyConsumed?"전투진입 · 천마전의 열쇠 ×1":"전투진입"}</button>`;document.getElementById("raidCombatEnter")?.addEventListener("click",enterRaidCombat,{once:true});last=performance.now();
  }
  function enterRaidCombat(){
    if(!raid.active||!raid.awaitingCombat)return;ensureRaidAccount();if(!raid.keyConsumed){if(account.raidKeys<1){showMessage("천마전의 열쇠가 필요하다",1.4);onGrowthReady();return}account.raidKeys--;raid.keyConsumed=true;saveAccountData()}raid.awaitingCombat=false;ui.levelUp.classList.remove("show","raid-growth","raid-ready");ui.hiddenBanner.innerHTML="";fixedAccumulator=0;player.levelResumeGrace=1;player.invuln=Math.max(player.invuln||0,1.4);spawnStage(raid.nextStage);last=performance.now();
  }
  GameEvents.on("level:choice",detail=>{if(raid.active&&raid.awaitingGrowth&&detail?.remaining===0)setTimeout(()=>{},0)});

  document.getElementById("soloRaidClose")?.addEventListener("click",()=>hud.lobby?.classList.remove("show"));
  document.getElementById("soloRaidStart")?.addEventListener("click",beginRaid);
  document.getElementById("restartBtn")?.addEventListener("click",event=>{if(!raid.lastRun)return;event.preventDefault();event.stopImmediatePropagation();ui.result.classList.remove("show");beginRaid()},{capture:true});
  document.getElementById("menuBtn")?.addEventListener("click",()=>{raid.lastRun=false;document.getElementById("restartBtn").textContent="같은 무기군으로 재도전"},{capture:true});
  document.getElementById("quitBtn")?.addEventListener("click",event=>{if(!raid.active)return;event.preventDefault();event.stopImmediatePropagation();finishRaid(false,"quit")},{capture:true});

  window.SoloRaidMode=Object.freeze({
    BUILD:RAID_BUILD,get active(){return raid.active},get state(){return raid},stages:STAGES,assets:RAID_ASSETS,
    begin:beginRaid,openLobby,onGrowthReady,enterCombat:enterRaidCombat,progress:currentProgress,spawnStage
  });
})();
