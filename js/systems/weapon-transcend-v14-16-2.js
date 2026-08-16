/* weapon-transcend-v14-16-2.js
 * v14.16.2 엔드게임 무신 초월 전투 옵션 런타임.
 * 영원 무기 1초월에서 선택한 옵션을 실제 전투 로직에 연결한다.
 */
(()=>{
"use strict";
const BUILD="weapon-transcend-v14.16.2";
const LV_SCALE={1:.75,2:1,3:1.25};
function tx(){return player?.weaponTranscend||{level:0,option:null}}
function level(){return Math.max(0,Math.min(3,Number(tx().level)||0))}
function has(id){return level()>0&&tx().option===id}
function now(){return Number(elapsed)||0}
function alive(e){return !!e&&!e.dead}
function bossLike(e){return e?.type==="boss"||e?.type==="midboss"||!!e?.raidBoss}
function pulse(x,y,color="#f5e6a8",r=64){try{addVisual({type:"ring",x,y,r,life:.34,max:.34,color,width:5,source:"weaponTranscend"})}catch(_){} }
function text(e,s,color="#fff0b0"){try{addVisual({type:"text",x:e?.x??player.x,y:(e?.y??player.y)-30,text:s,life:.48,max:.48,color})}catch(_){} }
function weaponMatches(w){return selectedWeapon===w&&level()>0}

// 마지막으로 설치되는 피해 래퍼: 기존 캐릭터/왜도 특수 판정을 보존하고 초월만 전후처리한다.
const previousDamageEnemy=damageEnemy;
damageEnemy=function(e,dmg,source,opt={}){
 if(!alive(e))return 0;
 let adjusted=dmg;
 const L=level(),T=tx().option,t=now();

 // 창 · 일점파천: 같은 투사체의 후속 관통일수록 피해가 커진다.
 if(T==="spear_point_heaven"&&selectedWeapon==="spear"&&source==="basic"){
  const hit=Math.max(0,Number(opt.projectileHitIndex)||0);
  adjusted*=1+Math.min(4,hit)*([0,.08,.12,.16][L]||0);
 }
 // 사독심장: 사독이 남은 대상에게 만천화우/잠독기폭 계열을 강화, 보스 보너스는 15% 상한.
 if(T==="poison_deadheart"&&selectedWeapon==="poison"&&(e.deathPoisonTime||0)>0&&["skyflower","latentPoison"].includes(source)){
  let bonus=[0,.10,.18,.25][L]||0;if(bossLike(e))bonus=Math.min(.15,bonus);adjusted*=1+bonus;
 }
 // 오행순환 발동 버프.
 if(T==="tao_five_cycle"&&selectedWeapon==="tao"&&t<(player._transFiveCycleUntil||0))adjusted*=1+([0,.08,.12,.16][L]||0);
 // 혈전무쌍: 잃은 체력에 비례해 공격력 상승.
 if(T==="saber_bloodwar"&&selectedWeapon==="saber"){
  const lost=1-Math.max(0,Math.min(1,(player.hp||0)/Math.max(1,player.maxHp||1)));
  adjusted*=1+lost*([0,.18,.24,.30][L]||0);
 }
 // 천마멸도: 천마군림도가 남긴 마흔을 다음 비-군림도 타격이 소비한다.
 if(T==="saber_demon_mark"&&selectedWeapon==="saber"&&source!=="demon"&&!String(source).startsWith("transcend")&&(e._transDemonMarkUntil||0)>t){
  adjusted*=1+([0,.18,.28,.38][L]||0);e._transDemonMarkUntil=0;text(e,"마흔 파쇄","#d7a3ff");
 }
 // 극월개방: 경화수월 중 왜도 계열 피해 강화.
 if(T==="katana_extreme_open"&&selectedWeapon==="katana"&&(player.gyeonghwaTimer||0)>0&&String(source)!=="moonEclipseEcho"){
  adjusted*=1+Math.max(0,Number(player._transGyeonghwaDamage)||0);
 }

 const before=Math.max(0,Number(e.hp)||0);
 const dealt=Number(previousDamageEnemy(e,adjusted,source,opt))||Math.max(0,before-Math.max(0,Number(e.hp)||0));
 if(dealt<=0)return dealt;

 // 검해무진: 서로 다른 검 무공 3종이 같은 대상에게 적중하면 검흔 폭발.
 if(T==="sword_blade_sea"&&selectedWeapon==="sword"&&!String(source).startsWith("transcend")){
  const groups={basic:"기본검",meteor:"유성검우",taiji:"태극검진",tenk:"만검귀종",tenkFused:"만검귀종"};
  const g=groups[source];
  if(g&&alive(e)){
   let m=e._transBladeSea;if(!m||m.until<t)m={until:t+6,set:new Set()};m.until=t+6;m.set.add(g);e._transBladeSea=m;
   if(m.set.size>=3){m.set.clear();m.until=t+1;const burst=adjusted*([0,.90,1.15,1.40][L]||0);previousDamageEnemy(e,burst,"transcendSwordSea",{color:"#eefaff",shake:6,skipImpactVfx:true});pulse(e.x,e.y,"#eefaff",78+L*7);text(e,"검해무진","#ffffff")}
  }
 }
 // 용맥폭발: 낙성창진/무극패왕창 타격점에서 추가 창기 폭발. 대상별 짧은 내부 쿨다운.
 if(T==="spear_vein_burst"&&selectedWeapon==="spear"&&["starfall","overlord"].includes(source)&&alive(e)&&(e._transSpearBurstAt||0)<=t){
  e._transSpearBurstAt=t+.24;const burst=adjusted*([0,.22,.28,.35][L]||0);aoe(e.x,e.y,46+L*6,burst,"transcendSpearBurst",{color:"#f1c36e",shake:3,skipImpactVfx:true});pulse(e.x,e.y,"#ffe7a1",58+L*5);
 }
 // 일월교대: 동일 대상에 해/달이 교대로 맞으면 일월 폭발.
 if(T==="bow_sunmoon_cycle"&&selectedWeapon==="bow"&&source==="sunmoon"&&["sun","moon"].includes(opt.projectileShape)&&alive(e)){
  const shape=opt.projectileShape,prev=e._transSunMoon;
  if(prev&&prev.shape!==shape&&prev.until>=t){e._transSunMoon=null;aoe(e.x,e.y,60+L*7,adjusted*([0,.55,.70,.85][L]||0),"transcendSunMoon",{elemental:true,color:"#f4d77e",shake:5,skipImpactVfx:true});pulse(e.x,e.y,"#fff1bd",75+L*7);text(e,"일월교대","#fff1bd")}
  else e._transSunMoon={shape,until:t+5};
 }
 // 도술 속성 판정: 화/빙/뢰 세 종류를 6초 안에 모두 맞히면 오행순환.
 if(T==="tao_five_cycle"&&selectedWeapon==="tao"&&opt.elemental&&!String(source).startsWith("transcend")){
  let kind="thunder";const c=String(opt.color||"").toLowerCase();if(source==="firedragon"||c.includes("ff8")||c.includes("db70"))kind="fire";else if(c.includes("8fd2"))kind="ice";
  let cycle=player._transFiveCycle;if(!cycle||cycle.until<t)cycle={until:t+6,set:new Set()};cycle.until=t+6;cycle.set.add(kind);player._transFiveCycle=cycle;
  if(cycle.set.size>=3){cycle.set.clear();player._transFiveCycleUntil=t+([0,4,5,6][L]||4);pulse(player.x,player.y,"#dff7ff",105);text(player,"오행순환","#dff7ff")}
 }
 // 천뢰강림: 일정 횟수의 속성 타격마다 강화 벼락.
 if(T==="tao_thunderfall"&&selectedWeapon==="tao"&&opt.elemental&&!String(source).startsWith("transcend")&&alive(e)){
  const need=[0,9,7,5][L]||9;player._transThunderHits=(player._transThunderHits||0)+1;
  if(player._transThunderHits>=need){player._transThunderHits=0;previousDamageEnemy(e,adjusted*([0,.65,.80,1.0][L]||0),"transcendThunderfall",{elemental:true,color:"#dff7ff",shake:4,skipImpactVfx:true});try{addVisual({type:"lightning",x1:e.x,y1:e.y-310,x2:e.x,y2:e.y,width:5+L,life:.22,max:.22,color:"#e9fbff"})}catch(_){};text(e,"천뢰강림","#e9fbff")}
 }
 // 천마멸도 마흔 부여.
 if(T==="saber_demon_mark"&&selectedWeapon==="saber"&&source==="demon"&&alive(e))e._transDemonMarkUntil=t+6;
 // 일극천하: 보스에게 일극개방이 적중하면 처치 없이도 내부 쿨마다 일극 1스택.
 if(T==="fist_one_world"&&selectedWeapon==="fist"&&source==="tenThousand"&&bossLike(e)&&(e._transOneWorldNext||0)<=t){
  e._transOneWorldNext=t+([0,8,6.5,5][L]||8);if(typeof setOneStrikeStacks==="function")setOneStrikeStacks((player.oneStrikeStacks||0)+1);text(e,"일극천하","#fff0a8");
 }
 // 월식잔향: 은월/월흔 폭발에 확률 잔월참. 원 본타가 죽였으면 주변으로 짧은 잔향만 남긴다.
 if(T==="katana_eclipse_echo"&&selectedWeapon==="katana"&&(opt.katanaFx?.silver||opt.katanaFx?.scarBurst)&&Math.random()<([0,.15,.22,.30][L]||0)){
  const echo=adjusted*([0,.22,.30,.38][L]||0);if(alive(e))previousDamageEnemy(e,echo,"moonEclipseEcho",{katanaNoSilver:true,skipImpactVfx:true,color:"#dff7ff"});else aoe(e.x,e.y,66+L*5,echo*.65,"moonEclipseEcho",{katanaNoSilver:true,skipVisual:true,skipImpactVfx:true,color:"#dff7ff"});try{addVisual({type:"slashArc",x:e.x,y:e.y,a:Math.random()*Math.PI*2,r:52+L*6,life:.28,max:.28,color:"#eefaff",width:4+L})}catch(_){};
 }
 return dealt;
};

// 만독귀원: 사망 직전 5중첩 독을 주변 적에게 전염.
const previousKillEnemy=killEnemy;
killEnemy=function(e,source="basic",opt={}){
 const wasDead=!!e?.dead,stacks=Math.max(0,Number(e?.poisonStacks)||0),poison=Math.max(0,Number(e?.poison)||0),time=Math.max(0,Number(e?.poisonTime)||0),x=e?.x,y=e?.y;
 previousKillEnemy(e,source,opt);
 if(!wasDead&&e?.dead&&has("poison_return")&&selectedWeapon==="poison"&&stacks>=5&&poison>0){
  const L=level(),raw=poison/Math.max(.01,(player.damageMul||1)*(player.poisonMul||1)),targets=GameSpatial.queryCircle(x,y,175).filter(z=>z!==e&&!z.dead).slice(0,3+L);
  for(const z of targets)applyPoison(z,raw*([0,.45,.55,.65][L]||.45),Math.max(3.5,Math.min(5,time)),Math.min(3,L));pulse(x,y,"#b78cff",70+L*7);
 }
};

// 무진연시: 기본 공격 일정 횟수마다 부채꼴 추가 사격.
const previousFireBasic=fireBasic;
fireBasic=function(){
 const before=projectiles?.length||0;previousFireBasic();
 if(!has("bow_endless_volley")||selectedWeapon!=="bow"||state!=="playing")return;
 if((projectiles?.length||0)<=before)return;const L=level(),need=[0,8,7,6][L]||8;player._transBowBasics=(player._transBowBasics||0)+1;if(player._transBowBasics<need)return;player._transBowBasics=0;
 const t=nearest();if(!t)return;const a=Math.atan2(t.y-player.y,t.x-player.x),n=3+L,lv=Math.max(1,player.arts?.[weaponDefs.bow.basic.id]||1),base=(11+lv*4)*.65;spreadAngles(a,n,.10).forEach(aa=>projectile({vx:Math.cos(aa)*760,vy:Math.sin(aa)*760,damage:base,r:3,pierce:1,shape:"arrow",trail:1,source:"transcendBowVolley",ignorePassive:true,color:"#fff0b5"}));text(player,"무진연시","#fff0b5");
};

// 불괴금강 / 혈전무쌍 생존 효과. 기존 금강호체/호신강기 판정을 그대로 보존한다.
const previousHurtPlayer=hurtPlayer;
hurtPlayer=function(amount){
 const L=level(),T=tx().option,t=now(),shieldBefore=Number(player.shield)||0,guardBefore=!!player.diamondGuardReady,hpBefore=Number(player.hp)||0;
 let adjusted=amount;
 if(T==="saber_bloodwar"&&selectedWeapon==="saber"&&(player.hp||0)/Math.max(1,player.maxHp||1)<.35)adjusted*=([1,.90,.84,.78][L]||1);
 if(T==="fist_unbreakable"&&selectedWeapon==="fist"&&t<(player._transUnbreakableUntil||0))adjusted*=([1,.82,.74,.66][L]||1);
 previousHurtPlayer(adjusted);
 if(T==="fist_unbreakable"&&selectedWeapon==="fist"){
  const blocked=(shieldBefore>(Number(player.shield)||0))||(guardBefore&&!player.diamondGuardReady&&hpBefore>=(Number(player.hp)||0));
  if(blocked){player._transUnbreakableUntil=t+([0,2,2.5,3][L]||2);pulse(player.x,player.y,"#ffe7a1",74);text(player,"불괴금강","#ffe7a1")}
 }
};

// 극월개방은 경화수월이 새로 켜진 순간 한 번만 지속시간/피해 보정을 부여한다.
const previousUpdate=update;
update=function(dt){
 previousUpdate(dt);
 if(has("katana_extreme_open")&&selectedWeapon==="katana"){
  const active=(player.gyeonghwaTimer||0)>0;
  if(active&&!player._transGyeonghwaActive){const L=level(),st=Math.max(0,Math.min(24,Number(player.extremeMoonStacks)||0));player._transGyeonghwaActive=true;player.gyeonghwaTimer+=Math.min(4,st*.05*(1+L*.35));player._transGyeonghwaDamage=Math.min(.30,st*.004*L);text(player,"극월개방","#e8f4ff")}
  else if(!active){player._transGyeonghwaActive=false;player._transGyeonghwaDamage=0}
 }else if(player){player._transGyeonghwaActive=false;player._transGyeonghwaDamage=0}
};

window.WeaponTranscendV14162={BUILD,level,option:()=>tx().option};
})();
