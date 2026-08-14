"use strict";
/* 왜도 리메이크: 월은신도/월흔/월은화/만월화/극월/발월/월영참/월하유성보/참월·절월/극·시공절/경화수월. */
(()=>{
const KPATH="assets/vfx/skills/katana/";
const UI_PATH="assets/ui/katana/";
const uiAsset=n=>["full_moon_stack.png","moonflower.png","star_sheet.png","star_ring.png","moon_scar_stack.png"].includes(n);
const assetPath=n=>(uiAsset(n)?UI_PATH:KPATH)+n;
// GameAssets는 asset-loader.js의 전역 lexical binding이다. window 속성으로 접근하면 브라우저에서 undefined가 되어
// 왜도 전용 GIF/UI가 전혀 로드되지 않으므로 반드시 직접 참조한다.
const assetStore=typeof GameAssets!=="undefined"?GameAssets:null;
const img=n=>assetStore?.image(assetPath(n));
// iOS/Safari canvas는 animated GIF를 drawImage()할 때 첫 프레임에 고정되는 경우가 있다.
// 제공된 GIF는 원본으로 보존하고, 런타임에서는 같은 프레임을 추출한 PNG sheet를 직접 재생한다.
const KATANA_ANIM_META={
 "full_moon":{sheet:"full_moon.sheet.png",fw:224,fh:217,frames:12,cols:4,d:[60,60,60,60,60,60,60,60,60,60,60,60],total:720},
 "moon_scar_burst":{sheet:"moon_scar_burst.sheet.png",fw:334,fh:292,frames:9,cols:3,d:[110,60,90,90,90,90,90,90,90],total:800},
 "moon_execute":{sheet:"moon_execute.sheet.png",fw:334,fh:292,frames:7,cols:3,d:[90,90,90,90,90,90,90],total:630},
 "silver_moon_hit":{sheet:"silver_moon_hit.sheet.png",fw:134,fh:111,frames:6,cols:3,d:[60,60,60,60,60,60],total:360},
 "balwol":{sheet:"balwol.sheet.png",fw:517,fh:221,frames:12,cols:4,d:[60,60,60,60,60,60,60,60,60,60,60,60],total:720},
 "balwol_echo":{sheet:"balwol_echo.sheet.png",fw:198,fh:129,frames:12,cols:4,d:[60,60,60,60,60,60,60,60,60,60,60,60],total:720},
 "moon_sword_1":{sheet:"moon_sword_1.sheet.png",fw:626,fh:300,frames:10,cols:4,d:[90,90,90,90,90,90,90,90,90,90],total:900},
 "moon_sword_2":{sheet:"moon_sword_2.sheet.png",fw:494,fh:276,frames:8,cols:3,d:[60,60,60,60,60,60,60,60],total:480},
 "moon_sword_3":{sheet:"moon_sword_3.sheet.png",fw:588,fh:345,frames:12,cols:4,d:[60,60,60,60,60,60,60,60,60,60,60,60],total:720},
 "chamwol":{sheet:"chamwol.sheet.png",fw:414,fh:148,frames:8,cols:3,d:[60,60,60,60,60,60,60,60],total:480},
 "jeolwol":{sheet:"jeolwol.sheet.png",fw:773,fh:435,frames:52,cols:8,d:Array(52).fill(50),total:2600},
 "moon_buff":{sheet:"moon_buff.sheet.png",fw:352,fh:348,frames:16,cols:4,d:Array(16).fill(90),total:1440},
 "time_space_cut":{sheet:"time_space_cut.sheet.png",fw:500,fh:281,frames:14,cols:4,d:Array(14).fill(100),total:1400},
 "gyeonghwa_suwol":{sheet:"gyeonghwa_suwol.sheet.png",fw:178,fh:165,frames:9,cols:3,d:[90,90,90,90,90,60,60,60,60],total:690}
};
const KATANA_SHEETS=Object.values(KATANA_ANIM_META).map(m=>m.sheet);
const KATANA_ASSETS=["full_moon_stack.png","moonflower.png","star_sheet.png","star_ring.png","moon_scar_stack.png",...KATANA_SHEETS];
if(assetStore)Promise.all(KATANA_ASSETS.map(n=>assetStore.load(assetPath(n)))).catch(()=>{});

const katanaSource=s=>["balwol","balwolEcho","moonForm1","moonForm2","moonForm3","moonMeteor"].includes(s);
const noSilverSource=s=>["silverMoon","moonScarBurst","moonExecute","chamwol","jeolwol","timeSpaceCut","gyeonghwaEcho","gyeonghwaDodge"].includes(s);
const gyeonghwaDuration=lv=>[0,6,7,8][Math.max(0,Math.min(3,lv|0))]||0;
const gyeonghwaEchoMul=lv=>[0,.45,.55,.65][Math.max(0,Math.min(3,lv|0))]||0;

function initKatanaState(){
 Object.assign(player,{
  moonFlowerStacks:0,moonFlowerLock:0,moonPhase:0,extremeMoonStacks:0,
  katanaScarTriggers:0,katanaMoonFormCycles:0,katanaJeolwolCasts:0,
  katanaMoonFormActive:false,katanaMoonFormStep:0,katanaMoonFormTimer:0,
  katanaEchoQueue:[],katanaHiddenQueue:[],katanaMirrorQueue:[],katanaDodgeCharge:0,
  moonMeteorBuff:0,timeSpaceBuff:0,gyeonghwaTimer:0,
  katanaDamageBonus:0,katanaLifeSteal:0,katanaLifeStealWindow:0,katanaLifeStealHealed:0
 });
}
const _reset=resetGame;resetGame=function(){_reset();initKatanaState()};

function flowerGain(){
 if(selectedWeapon!=="katana"||(player.moonFlowerLock||0)>0)return;
 player.moonFlowerStacks=Math.min(3,(player.moonFlowerStacks||0)+1);
 if(player.moonFlowerStacks>=3&&(player.arts?.moonchain||0)>0&&!player.katanaMoonFormActive)startMoonForms();
}
function scarTrigger(){player.katanaScarTriggers=(player.katanaScarTriggers||0)+1;flowerGain()}
function vfx(type,x,y,life=.7,o={}){addVisual(Object.assign({type,x,y,life,max:life,color:"#eaf6ff"},o))}
function addScar(e,n=1){if(!e||e.dead)return;e.moonScar=Math.min(3,(e.moonScar||0)+n)}
function executeThreshold(stacks){return stacks>=3?.10:stacks===2?.06:stacks===1?.03:0}
function isGyeonghwaActive(){return selectedWeapon==="katana"&&(player.arts?.voidslash||0)>0&&(player.gyeonghwaTimer||0)>0}

const _damage=damageEnemy;
damageEnemy=function(e,dmg,source,opt={}){
 if(!e||e.dead)return 0;
 const eligible=selectedWeapon==="katana"&&katanaSource(source)&&!opt.katanaNoSilver&&!noSilverSource(source);
 const hitX=e.x,hitY=e.y,scarBurst=eligible&&(e.moonScar||0)>=3;
 // 은월은 대상이 이 한 타격으로 죽더라도 반드시 먼저 판정한다.
 const silver=eligible&&Math.random()<Math.min(.70,Math.max(0,player.critChance+(player.moonMeteorBuff>0?.20:0)));
 const scaled=dmg*(1+(player.katanaDamageBonus||0))*(player.timeSpaceBuff>0?1.35:1)*(silver?1.60:1);
 if(scarBurst)e.moonScar=0;
 // 트리거가 된 본 타격을 먼저 처리한다. 기존 구현은 월흔 폭발이 먼저 적을 죽이면 본 타격/은월이 취소됐다.
 const hpBefore=e.hp;
 const dealt=Number(_damage(e,scaled,source,Object.assign({},opt,{katanaNoSilver:!silver,silverMoon:silver})))||0;
 const silverOneShotExecution=!!(silver&&dealt>0&&hpBefore>0&&e.dead);
 let scarApplied=false,executed=silverOneShotExecution;
 // 은월은 타격의 우선 VFX다. 월흔이 새로 생기는 경우 표식이 읽히도록 은월 광량을 약간 낮춘다.
 if(silver&&dealt>0){
  if(!silverOneShotExecution&&!e.dead&&!scarBurst){addScar(e,1);scarApplied=true;}
  const silverOpacity=silverOneShotExecution?.52:scarBurst?.58:scarApplied?.72:1;
  vfx("katanaSilverHit",hitX,hitY,.36,{r:46,target:e,priority:60,opacityScale:silverOpacity});
  if(silverOneShotExecution){vfx("katanaExecute",hitX,hitY,.63,{r:92,target:e,priority:100,opacityScale:1});scarTrigger();}
 }
 // 극월 생명력 흡수: 실제 초당 최대 체력 8% 상한.
 if(selectedWeapon==="katana"&&dealt>0&&(player.katanaLifeSteal||0)>0){
  const cap=player.maxHp*.08,remain=Math.max(0,cap-(player.katanaLifeStealHealed||0));
  const heal=Math.min(remain,dealt*player.katanaLifeSteal);
  if(heal>0){player.hp=Math.min(player.maxHp,player.hp+heal);player.katanaLifeStealHealed=(player.katanaLifeStealHealed||0)+heal;}
 }
 // 월흔 폭발은 은월/발월 잔상보다 높은 렌더 우선순위를 갖는다.
 if(scarBurst&&!silverOneShotExecution){
  vfx("katanaScarBurst",hitX,hitY,.80,{r:78,target:e,priority:90,opacityScale:1});
  if(!e.dead)_damage(e,Math.max(1,dmg*1.8),"moonScarBurst",{katanaNoSilver:true,skipImpactVfx:true,color:"#dff7ff"});
  scarTrigger();
  if(!e.dead)e.moonScar=isGyeonghwaActive()?1:0;
 }
 if(!e.dead&&(e.moonScar||0)>0&&e.hp/e.maxHp<=executeThreshold(e.moonScar)){
  const boss=e.type==="boss"||e.type==="midboss";
  executed=true;
  vfx("katanaExecute",e.x,e.y,.63,{r:92,target:e,priority:100,opacityScale:1});
  if(boss)_damage(e,Math.max(e.maxHp*.035,scaled*2.2),"moonExecute",{katanaNoSilver:true,skipImpactVfx:true,color:"#f3fbff"});
  else {e.hp=0;killEnemy(e,"moonExecute",{katanaNoSilver:true});}
  e.moonScar=0;scarTrigger();
 }
 // 발월 지연참격 호출자가 이번 타격의 특수 VFX 상태를 받아 자신의 광량을 낮출 수 있게 한다.
 opt.katanaFx={silver,scarApplied,scarBurst,executed};
 return dealt;
};

// 발월: 본참격 + 같은 월드 궤적에 지연참격. 경화수월 중에는 본참격만 잔상이 한 번 복제한다.
const _fire=fireBasic;
fireBasic=function(){
 if(selectedWeapon!=="katana")return _fire();
 const t=nearest();if(!t)return;
 const lv=player.arts.iai||1,a=Math.atan2(t.y-player.y,t.x-player.x),len=(260+lv*22)*player.areaMul,width=(13+lv*1.7)*Math.sqrt(player.areaMul),dmg=26+lv*8,x=player.x,y=player.y;
 player.facing=a;
 const hitTargets=lineHit(x,y,x+Math.cos(a)*len,y+Math.sin(a)*len,width,dmg,"balwol",{skipVisual:true,shake:4,color:C.katana})||[];
 vfx("katanaBalwol",x+Math.cos(a)*len*.46,y+Math.sin(a)*len*.46,.72,{a,r:len,width});
 const echoes=Math.min(4,1+Math.floor((lv-1)/2)),interval=Math.max(.08,.14-lv*.006);
 // 지연참격은 새 적을 다시 훑지 않는다. 최초 발월에 실제로 맞은 객체만 개별 추적/타격/VFX 처리한다.
 for(const target of hitTargets)for(let i=0;i<echoes;i++)player.katanaEchoQueue.push({t:.16+i*interval,target,x:target.x,y:target.y,a,r:Math.max(82,(target.r||18)*4.2),dmg:dmg*(.62+.04*lv)});
 player.katanaEchoQueue.sort((a,b)=>a.t-b.t);
 if(isGyeonghwaActive()){
  const glv=player.arts.voidslash||1;
  player.katanaMirrorQueue.push({t:.12,type:"balwol",x,y,a,len,width,dmg:dmg*gyeonghwaEchoMul(glv)});
 }
 player.fireTimer=Math.max(.38,.88-lv*.045)*(player.timeSpaceBuff>0?.8:1);
};

const MOON_FORM_STEP_DELAY={1:.90,2:.52,3:.76};
function startMoonForms(){player.katanaMoonFormActive=true;player.katanaMoonFormStep=1;player.katanaMoonFormTimer=.03}
function castMoonForm(step){
 const lv=player.arts.moonchain||1,len=(310+lv*24)*player.areaMul,width=(22+lv*3)*Math.sqrt(player.areaMul),mul=[0,1.4,1.8,2.6][step],dmg=(25+lv*9)*mul;
 let a=facingAngle();
 // 2식만 현재 사거리 안에서 체력이 가장 높은 적을 새로 지정해 그 방향으로 발동한다.
 if(step===2){
  const range=len*.62;
  const target=enemies.filter(e=>!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<=range).sort((x,y)=>y.hp-x.hp)[0];
  if(!target)return false; // 대상이 없으면 짧게 기다렸다 다시 탐색해 2식을 허공에 낭비하지 않는다.
  a=Math.atan2(target.y-player.y,target.x-player.x);
 }
 lineHit(player.x-Math.cos(a)*len*.35,player.y-Math.sin(a)*len*.35,player.x+Math.cos(a)*len*.65,player.y+Math.sin(a)*len*.65,width,dmg,"moonForm"+step,{skipVisual:true,shake:4+step,color:"#edf8ff"});
 vfx("katanaMoonForm"+step,player.x+Math.cos(a)*len*.18,player.y+Math.sin(a)*len*.18,[.9,.9,.52,.76][step],{a,r:len,width,priority:20});
 player.moonFlowerStacks=Math.max(0,(player.moonFlowerStacks||0)-1);
 return true;
}
function gainMoonPhase(){
 if(!(player.arts?.nameless>0))return;
 player.moonPhase=Math.min(5,(player.moonPhase||0)+1);
 castChamwol(player.moonPhase);
 if(player.moonPhase>=5)player.katanaHiddenQueue.push({t:.62,type:"jeolwol"});
}
function castChamwol(count){
 const target=visibleEnemies(0).sort((a,b)=>b.hp-a.hp)[0];if(!target)return;
 for(let i=0;i<count;i++){
  const a=(i%2?-.72:.72)+(i-count/2)*.13,len=Math.max(W,H)*1.5,x1=target.x-Math.cos(a)*len*.5,y1=target.y-Math.sin(a)*len*.5,x2=target.x+Math.cos(a)*len*.5,y2=target.y+Math.sin(a)*len*.5;
  player.katanaHiddenQueue.push({t:i*.09,type:"chamwol",x1,y1,x2,y2,a,damage:54+(player.arts.nameless||1)*18});
 }
}
function gainExtremeMoon(){
 if((player.extremeMoonStacks||0)>=24)return;
 player.extremeMoonStacks++;
 player.critChance+=.0075;
 player.katanaDamageBonus=(player.katanaDamageBonus||0)+.0125;
 player.katanaLifeSteal=(player.katanaLifeSteal||0)+.0015;
 player.dodgeCooldownMul*=.995;
}
function activateGyeonghwa(){
 const lv=player.arts?.voidslash||0;if(lv<=0)return;
 gainExtremeMoon();
 player.gyeonghwaTimer=gyeonghwaDuration(lv);
 vfx("katanaGyeonghwa",player.x,player.y,.69,{followPlayer:true,r:112});
 showMessage(`경화수월 · 극월 ${player.extremeMoonStacks}/24`,1.15);
}
function castJeolwol(){
 vfx("katanaJeolwol",player.x,player.y,2.6,{screen:true,r:Math.max(W,H)});
 for(const e of visibleEnemies(-120))if(!e.dead)_damage(e,150+(player.arts.nameless||1)*55,"jeolwol",{katanaNoSilver:true,skipImpactVfx:true,color:"#f7fbff",shake:10});
 player.moonPhase=0;
 player.katanaJeolwolCasts=(player.katanaJeolwolCasts||0)+1;
 // 극월/경화수월은 히든2를 습득한 이후의 절월부터 적용한다.
 if((player.arts?.voidslash||0)>0)activateGyeonghwa();
 showMessage("절월 · 만월절단",1.2);
}

// 월하유성보: 회피 3점, 정밀회피는 2점. 경화수월 중 정밀회피는 회피 시작점에 잔상 참격을 남긴다.
const _dodge=performDodge;
performDodge=function(){
 const before=player.metrics?.dodges||0,pb=player.metrics?.perfectDodges||0,sx=player.x,sy=player.y,a=facingAngle();
 _dodge();
 if(selectedWeapon!=="katana"||(player.metrics?.dodges||0)<=before)return;
 const perfect=(player.metrics?.perfectDodges||0)>pb;
 if(perfect&&isGyeonghwaActive()){
  const lv=player.arts.voidslash||1,len=190+lv*18;
  player.katanaMirrorQueue.push({t:.16,type:"dodge",x:sx,y:sy,a,len,width:20+lv*2,dmg:(30+lv*10)*gyeonghwaEchoMul(lv)});
 }
 player.katanaDodgeCharge=(player.katanaDodgeCharge||0)+(perfect?2:1);
 if((player.arts?.zanshin||0)>0&&player.katanaDodgeCharge>=3){
  player.katanaDodgeCharge-=3;
  player.moonMeteorBuff=4.5+.35*player.arts.zanshin;
  player.dodgeCooldown=Math.max(.55,player.dodgeCooldown*(1-Math.min(.22,.08+player.arts.zanshin*.025)));
  vfx("katanaMoonBuff",player.x,player.y,1.44,{followPlayer:true,r:105});
  aoe(player.x,player.y,72+player.arts.zanshin*7,18+player.arts.zanshin*8,"moonMeteor",{skipVisual:true,color:"#e9f7ff",shake:4});
  showMessage("월하유성보",.75);
 }
};

// 기존 왜도 자동 arts를 억제하고 새 자원 루프를 진행한다.
const _tick=tickArts;
tickArts=function(dt){
 if(selectedWeapon!=="katana")return _tick(dt);
 const a=player.arts,save=[a.moonchain,a.zanshin,a.nameless];a.moonchain=0;a.zanshin=0;a.nameless=0;_tick(dt);[a.moonchain,a.zanshin,a.nameless]=save;
 player.moonFlowerLock=Math.max(0,(player.moonFlowerLock||0)-dt);
 player.moonMeteorBuff=Math.max(0,(player.moonMeteorBuff||0)-dt);
 player.timeSpaceBuff=Math.max(0,(player.timeSpaceBuff||0)-dt);
 player.gyeonghwaTimer=Math.max(0,(player.gyeonghwaTimer||0)-dt);
 player.katanaLifeStealWindow=(player.katanaLifeStealWindow||0)+dt;
 if(player.katanaLifeStealWindow>=1){player.katanaLifeStealWindow%=1;player.katanaLifeStealHealed=0;}

 for(const q of player.katanaEchoQueue||[])q.t-=dt;
 while(player.katanaEchoQueue?.length&&player.katanaEchoQueue[0].t<=0){
  const q=player.katanaEchoQueue.shift(),target=q.target;
  if(!target||target.dead)continue;
  const tx=target.x,ty=target.y,hitOpt={skipImpactVfx:true,shake:2,color:C.katana,distance:Math.hypot(tx-player.x,ty-player.y)};
  damageEnemy(target,q.dmg,"balwolEcho",hitOpt);
  const fx=hitOpt.katanaFx||{};
  // 은월/월흔/처형이 겹치면 발월 추가참격은 배경 레이어처럼 낮춰 핵심 피드백을 가리지 않는다.
  const echoOpacity=fx.executed?.12:fx.scarBurst?.18:(fx.silver||fx.scarApplied)?.38:1;
  vfx("katanaBalwolEcho",tx,ty,.72,{a:q.a,r:q.r||96,target,priority:10,opacityScale:echoOpacity});
 }

 for(const q of player.katanaMirrorQueue||[])q.t-=dt;
 while(player.katanaMirrorQueue?.length&&player.katanaMirrorQueue[0].t<=0){
  const q=player.katanaMirrorQueue.shift();
  if(q.type==="balwol"){
   lineHit(q.x,q.y,q.x+Math.cos(q.a)*q.len,q.y+Math.sin(q.a)*q.len,q.width,q.dmg,"gyeonghwaEcho",{skipVisual:true,katanaNoSilver:true,shake:2,color:"#dff7ff"});
   vfx("katanaMirrorBalwol",q.x+Math.cos(q.a)*q.len*.46,q.y+Math.sin(q.a)*q.len*.46,.72,{a:q.a,r:q.len,width:q.width,mirror:true});
  }else if(q.type==="dodge"){
   const hx=Math.cos(q.a)*q.len*.5,hy=Math.sin(q.a)*q.len*.5;
   lineHit(q.x-hx,q.y-hy,q.x+hx,q.y+hy,q.width,q.dmg,"gyeonghwaDodge",{skipVisual:true,katanaNoSilver:true,shake:2,color:"#dff7ff"});
   vfx("katanaMirrorDodge",q.x,q.y,.72,{a:q.a,r:q.len,width:q.width,mirror:true});
  }
 }

 if(player.katanaMoonFormActive){
  player.katanaMoonFormTimer-=dt;
  if(player.katanaMoonFormTimer<=0){
   const step=player.katanaMoonFormStep;
   if(step>3){
    player.katanaMoonFormActive=false;player.katanaMoonFormCycles=(player.katanaMoonFormCycles||0)+1;
    player.moonFlowerLock=Math.max(2.75,4.85-(player.arts.moonchain||1)*.35);gainMoonPhase();
   }else{
    const casted=castMoonForm(step);
    if(!casted&&step===2)player.katanaMoonFormTimer=.12;
    else{player.katanaMoonFormStep=step+1;player.katanaMoonFormTimer=MOON_FORM_STEP_DELAY[step]||.6;}
   }
  }
 }
 for(const q of player.katanaHiddenQueue||[])q.t-=dt;
 while(player.katanaHiddenQueue?.length&&player.katanaHiddenQueue[0].t<=0){
  const q=player.katanaHiddenQueue.shift();
  if(q.type==="chamwol"){
   lineHit(q.x1,q.y1,q.x2,q.y2,16,q.damage,"chamwol",{skipVisual:true,katanaNoSilver:true,shake:5,color:"#f4fbff"});
   vfx("katanaChamwol",(q.x1+q.x2)/2,(q.y1+q.y2)/2,.48,{a:q.a,r:Math.hypot(q.x2-q.x1,q.y2-q.y1)});
  }else if(q.type==="jeolwol")castJeolwol();
 }
};

// 극·시공절: 화면 전체 1타 + 월흔 확정 +1 + 만월화 강제 다음 단계 + 10초 강화.
const _ultimate=ultimateAttack;
ultimateAttack=function(){
 if(selectedWeapon!=="katana")return _ultimate();
 vfx("katanaTimeSpaceCut",player.x,player.y,1.4,{screen:true,r:Math.max(W,H)});
 for(const e of visibleEnemies(-140)){
  if(e.dead)continue;
  _damage(e,112,"timeSpaceCut",{katanaNoSilver:true,skipImpactVfx:true,color:"#f1f8ff",shake:8});
  if(!e.dead)addScar(e,1);
 }
 player.timeSpaceBuff=10;
 if((player.arts?.nameless||0)>0){
  if((player.moonPhase||0)>=5){castJeolwol();player.moonPhase=1}else gainMoonPhase();
 }
 showMessage("극·시공절 · 시공단월",1.4);
};

// 인게임 자원/표식/VFX 렌더. 왜도 VFX는 모두 PNG 스프라이트 시트 기반으로 수동 재생해 iOS Canvas에서도 안정적으로 애니메이션한다.
function frameAt(meta,ms,loop=false){
 if(loop)ms=((ms%meta.total)+meta.total)%meta.total;else ms=Math.max(0,Math.min(meta.total-1,ms));
 let acc=0;for(let i=0;i<meta.frames;i++){acc+=meta.d[i]||100;if(ms<acc)return i}return meta.frames-1;
}
function drawImg(im,x,y,w,h,a=1,rot=0){if(!im?.complete||!im.naturalWidth)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(rot);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawAnim(name,timeSec,x,y,w,h,a=1,rot=0,loop=false){
 const meta=KATANA_ANIM_META[name];if(!meta)return;const im=img(meta.sheet);if(!im?.complete||!im.naturalWidth)return;
 const fi=frameAt(meta,Math.max(0,timeSec||0)*1000,loop),sx=(fi%meta.cols)*meta.fw,sy=Math.floor(fi/meta.cols)*meta.fh;
 ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(rot);ctx.drawImage(im,sx,sy,meta.fw,meta.fh,-w/2,-h/2,w,h);ctx.restore();
}
function katanaVfxPriority(v){
 if(Number.isFinite(v.priority))return v.priority;
 if(v.type==="katanaExecute")return 100;
 if(v.type==="katanaScarBurst")return 90;
 if(v.type==="katanaSilverHit")return 60;
 if(v.type==="katanaBalwolEcho")return 10;
 return 20;
}
function drawKatanaVisuals(){
 const ordered=visuals.filter(v=>String(v.type).startsWith("katana")).slice().sort((a,b)=>katanaVfxPriority(a)-katanaVfxPriority(b));
 for(const v of ordered){
  const alpha=Math.max(0,Math.min(1,v.life/(v.max||v.life||1))),s=v.screen?{x:W/2,y:H/2}:v.followPlayer?{x:W/2,y:H/2}:v.target&&!v.target.dead?ws(v.target.x,v.target.y):ws(v.x,v.y);
  let f=null,w=90,h=70,rot=v.a||0,opacity=Math.min(1,.35+alpha*.8)*(Number.isFinite(v.opacityScale)?v.opacityScale:1);
  if(v.type==="katanaSilverHit"){f="silver_moon_hit";w=80;h=66}
  else if(v.type==="katanaScarBurst"){f="moon_scar_burst";w=112;h=98}
  else if(v.type==="katanaExecute"){f="moon_execute";w=126;h=110}
  else if(v.type==="katanaBalwol"){f="balwol";w=Math.min(520,(v.r||300)*1.12);h=w*221/517}
  else if(v.type==="katanaBalwolEcho"){f="balwol_echo";w=Math.min(136,(v.r||96)*1.02);h=w*129/198}
  else if(v.type==="katanaMirrorBalwol"){f="balwol";w=Math.min(520,(v.r||300)*1.12);h=w*221/517;opacity*=.48}
  else if(v.type==="katanaMirrorDodge"){f="balwol";w=Math.min(310,(v.r||190)*1.18);h=w*221/517;opacity*=.42}
  else if(v.type.startsWith("katanaMoonForm")){const n=v.type.slice(-1);f=`moon_sword_${n}`;const dims={1:[626,300],2:[494,276],3:[588,345]}[n];w=Math.min(520,(v.r||330)*1.18);h=w*dims[1]/dims[0]}
  else if(v.type==="katanaMoonBuff"){f="moon_buff";w=145;h=143;rot=0}
  else if(v.type==="katanaGyeonghwa"){f="gyeonghwa_suwol";w=178;h=165;rot=0;opacity=Math.min(1,.55+alpha*.55)}
  else if(v.type==="katanaChamwol"){f="chamwol";w=Math.min(Math.max(W,H)*1.15,760);h=w*148/414}
  else if(v.type==="katanaJeolwol"){
   f="jeolwol";rot=0;const meta=KATANA_ANIM_META.jeolwol,fi=frameAt(meta,Math.max(0,v.age||0)*1000,false)+1;
   if(fi<=35){w=Math.min(meta.fw,W*.96);h=w*meta.fh/meta.fw;}
   else{const cover=Math.max(W/meta.fw,H/meta.fh);w=meta.fw*cover;h=meta.fh*cover;}
  }
  else if(v.type==="katanaTimeSpaceCut"){f="time_space_cut";const cover=Math.max(W/500,H/281);w=500*cover;h=281*cover;rot=0}
  if(f)drawAnim(f,v.age||0,s.x,s.y,w,h,opacity,rot,false);
 }
}
function drawKatanaHUD(){
 if(selectedWeapon!=="katana")return;
 const cx=W/2,cy=H/2;
 // 월은화: 플레이어 좌측 호에 3개. 빈 슬롯은 동일 꽃 실루엣.
 const flower=img("moonflower.png");
 const flowerArcCenter=Math.PI,flowerArcStep=Math.PI*.24,flowerRadius=74;
 for(let i=0;i<3;i++){
  const ang=flowerArcCenter+(i-1)*flowerArcStep,x=cx+Math.cos(ang)*flowerRadius,y=cy+Math.sin(ang)*flowerRadius;
  ctx.save();
  if(i>=(player.moonFlowerStacks||0)){ctx.globalAlpha=player.moonFlowerLock>0?.12:.22;ctx.filter="grayscale(1) brightness(.28)"}
  else{ctx.globalAlpha=.95;ctx.shadowColor="#e7fbff";ctx.shadowBlur=9}
  if(flower?.complete&&flower.naturalWidth)ctx.drawImage(flower,x-13,y-13,26,26);
  ctx.restore();
 }
 // 만월화 1~4는 4칸 sheet, 5는 full_moon 애니메이션 시트.
 if((player.arts?.nameless||0)>0&&(player.moonPhase||0)>0){
  const phase=player.moonPhase;
  if(phase<5){const m=img("full_moon_stack.png");if(m?.complete&&m.naturalWidth)ctx.drawImage(m,(phase-1)*128,0,128,128,cx-25,cy-92,50,50)}
  else drawAnim("full_moon",elapsed,cx,cy-68,58,56,.96,0,true);
 }
 // 극월: star sheet 24개 셀을 순서대로 원형 배치. 히든2 습득 시 빈 별 실루엣도 항상 표시한다.
 if((player.arts?.voidslash||0)>0){
  const stars=img("star_sheet.png"),n=Math.max(0,Math.min(24,player.extremeMoonStacks||0));
  for(let i=0;i<24;i++){
   const a=-Math.PI/2+i*Math.PI*2/24,x=cx+Math.cos(a)*67,y=cy-68+Math.sin(a)*67,sx=(i%6)*128,sy=Math.floor(i/6)*150;
   ctx.save();ctx.globalAlpha=i<n?.95:.10;if(i>=n)ctx.filter="grayscale(1) brightness(.35)";
   if(stars?.complete&&stars.naturalWidth)ctx.drawImage(stars,sx,sy,128,120,x-7,y-7,14,14);
   ctx.restore();
  }
  if(n>=24)drawImg(img("star_ring.png"),cx,cy-68,145,145,.42);
 }
 // 적 월흔 1~3 sheet.
 const scar=img("moon_scar_stack.png");
 if(scar?.complete&&scar.naturalWidth)for(const e of enemies){
  if(e.dead||!(e.moonScar>0))continue;
  const s=ws(e.x,e.y),st=Math.min(3,e.moonScar|0);ctx.drawImage(scar,(st-1)*128,0,128,128,s.x-16,s.y-e.r-36,32,32);
 }
}
const _draw=draw;draw=function(){_draw();drawKatanaVisuals();drawKatanaHUD()};
window.KatanaRework={version:"1.3",flowerGain,addScar,gainMoonPhase,gainExtremeMoon,activateGyeonghwa,isGyeonghwaActive};
})();
