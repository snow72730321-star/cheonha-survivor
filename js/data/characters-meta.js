"use strict";
/* ===== v6 systems: pixel art, ultimates, precision dodge, collections ===== */
const characterDefs={
 sword:{name:"백소린",title:"화산검희",ultimate:"천검개벽",quote:"일검이 만검을 부른다.",hair:"#22252e",robe:"#e5e7df",accent:"#78aebc"},
 spear:{name:"연하진",title:"철혈창군",ultimate:"파천관일",quote:"창끝이 닿는 곳이 곧 전장이다.",hair:"#4b2c27",robe:"#8b3432",accent:"#d5b46b"},
 bow:{name:"설아린",title:"천산궁녀",ultimate:"적궁백시",quote:"떨어트린다. 해와 달도, 하늘도.",hair:"#d9d7ce",robe:"#3e6758",accent:"#e3c06b"},
 poison:{name:"당유화",title:"당문독희",ultimate:"추혼비접",quote:"보이지 않는 독이 가장 깊다.",hair:"#32243e",robe:"#5c3c68",accent:"#9fc76b"},
 tao:{name:"제갈청",title:"천문도사",ultimate:"구천뇌겁",quote:"하늘의 뜻을 부적으로 명한다.",hair:"#283b49",robe:"#d9ddd6",accent:"#65b6d4"},
 saber:{name:"마련화",title:"소천마도",ultimate:"천마합일",quote:"한 번 휘두르면 산도 갈라진다.",hair:"#3c211e",robe:"#6f302b",accent:"#d77b52"},
 katana:{name:"카구라 린",title:"월영낭인",ultimate:"무념일섬",quote:"검이 보였다면 이미 늦었다.",hair:"#171a22",robe:"#2f3043",accent:"#c8c9e8"},
 fist:{name:"소명진",title:"금강권희",ultimate:"항룡진천",quote:"한 걸음, 한 장으로 천하를 울린다.",hair:"#543a2c",robe:"#c59b6b",accent:"#e2c56c"}
};
const skinDefs={
 default:{name:"본연",cost:0,palette:null,desc:"협객 본래의 복식"},
 crimson:{name:"혈월",cost:300,palette:{robe:"#7f252d",accent:"#f08a75"},desc:"붉은 달빛의 전투복"},
 azure:{name:"청룡",cost:600,palette:{robe:"#234f66",accent:"#78d2dd"},desc:"청룡의 비늘을 본뜬 도복"}
};
const achievementDefs=[
 {id:"firstClear",name:"첫 혈겁 돌파",desc:"어떤 난이도든 최초 클리어",reward:150,goal:1,value:()=>account.stats.clears||0},
 {id:"forgeOne",name:"첫 단조",desc:"무기 1회 제작",reward:80,goal:1,value:()=>account.forgeCount||0},
 {id:"perfect20",name:"찰나의 경지",desc:"정밀 회피 누적 20회",reward:180,goal:20,value:()=>account.stats.perfectDodges||0},
 {id:"kills1000",name:"일기당천",desc:"누적 1,000명 격파",reward:220,goal:1000,value:()=>account.stats.kills||0},
 {id:"legend",name:"명장",desc:"전설 이상 무기 보유",reward:300,goal:1,value:()=>account.weapons.some(w=>gradeIndex(w.grade)>=4)?1:0},
 {id:"allPaths",name:"팔문개화",desc:"8개 무기군 모두 플레이",reward:400,goal:8,value:()=>Object.keys(account.stats.paths||{}).length}
];
const evolutionDefs={
 sword:{name:"양의만상검",check:p=>(p.arts.qingfeng||0)>=8&&(p.arts.taiji||0)>=4,apply:p=>{p.projectileBonus+=2;p.areaMul*=1.12}},
 spear:{name:"천룡파진",check:p=>(p.arts.sunpierce||0)>=8&&(p.arts.starfall||0)>=4,apply:p=>{p.pierceBonus+=2;p.eliteDamageMul*=1.15}},
 bow:{name:"천궁일월",check:p=>(p.arts.rapidbow||0)>=8&&(p.arts.arrowrain||0)>=4,apply:p=>{p.projectileBonus+=2;p.critChance+=.08}},
 poison:{name:"만독귀원",check:p=>(p.arts.needle||0)>=8&&(p.arts.miasma||0)>=4,apply:p=>{p.poisonMul*=1.35;p.areaMul*=1.1}},
 tao:{name:"태허오행진",check:p=>(p.arts.thunderseal||0)>=8&&(p.arts.firedragon||0)>=4,apply:p=>{p.cooldownRate*=1.18;p.areaMul*=1.12}},
 saber:{name:"천마벽력도",check:p=>(p.arts.thundersaber||0)>=8&&(p.arts.whirlwind||0)>=4,apply:p=>{p.damageMul*=1.18;p.areaMul*=1.15}},
 katana:{name:"무영월식",check:p=>(p.arts.iai||0)>=8&&(p.arts.moonchain||0)>=4,apply:p=>{p.critChance+=.12;p.attackSpeedMul*=.88}},
 fist:{name:"용호금강체",check:p=>(p.arts.ironmount||0)>=8&&(p.arts.taijifist||0)>=4,apply:p=>{p.damageReduction=Math.min(.55,p.damageReduction+.08);p.damageMul*=1.12}}
};
const extraHidden={
 sword:["무상검역","정밀 회피 10회 + 경지 24"],spear:["반룡회천","정밀 회피 10회 + 경지 24"],bow:["무영시","정밀 회피 10회 + 경지 24"],poison:["무형독계","정밀 회피 10회 + 경지 24"],tao:["축뢰신부","정밀 회피 10회 + 경지 24"],saber:["파군도혼","정밀 회피 10회 + 경지 24"],katana:["찰나무명","정밀 회피 10회 + 경지 24"],fist:["무극반탄","정밀 회피 10회 + 경지 24"]
};
for(const [wid,[name,condition]] of Object.entries(extraHidden))weaponDefs[wid].arts.push({id:"secret_"+wid,name,max:3,hidden:true,desc:"정밀 회피의 깨달음으로 절기 충전과 무공 피해가 증가한다.",condition,progress:p=>({v:Math.min(1,Math.min((p.metrics.perfectDodges||0)/10,p.level/24)),text:`정밀 회피 ${p.metrics.perfectDodges||0}/10 · 경지 ${p.level}/24`}),ready:p=>(p.metrics.perfectDodges||0)>=10&&p.level>=24,onLearn:p=>{p.ultimateGain*=1.12;p.damageMul*=1.04}});
universal.push(
 {id:"swiftcycle",name:"진기순환",max:5,tag:"재사용",desc:"부가 무공 재사용 속도 +9%",apply:p=>p.cooldownRate*=1.09},
 {id:"windedge",name:"장풍연성",max:4,tag:"투사체",desc:"투사체 속도 +12%",apply:p=>p.projectileSpeedMul*=1.12},
 {id:"guardian",name:"불괴호신",max:3,tag:"호신",desc:"일정 시간마다 피해를 1회 막는다. 캐릭터 주위 보호막과 구슬로 남은 횟수를 표시한다.",apply:p=>{p.shieldMax++;p.shield=p.shieldMax}},
 {id:"fortune",name:"천운심결",max:5,tag:"행운",desc:"금자와 광석 획득 확률 증가",apply:p=>p.luck+=.12},
 {id:"bossbane",name:"파군심법",max:4,tag:"파진",desc:"정예·보스 피해 +14%",apply:p=>p.eliteDamageMul*=1.14},
 {id:"lifeline",name:"연명공",max:4,tag:"회복",desc:"격파 시 체력 회복 +0.25",apply:p=>p.killHeal+=.25}
);
Object.assign(ui,{ultimateBtn:$("ultimateBtn"),ultimateFill:$("ultimateFill"),ultimateCd:$("ultimateCd"),characterPreview:$("characterPreview"),characterInfo:$("characterInfo"),cutscene:$("cutscene"),cutsceneCanvas:$("cutsceneCanvas"),cutsceneName:$("cutsceneName"),cutsceneLine:$("cutsceneLine"),achievements:$("achievements"),achievementList:$("achievementList"),skins:$("skins"),skinList:$("skinList"),settings:$("settings"),records:$("records"),recordContent:$("recordContent")});
let slowTimer=0,slowScale=1,cutsceneTimer=0,lastFrameDraw=0;

function ensureV6Account(){account.skinsUnlocked=account.skinsUnlocked||{default:true};account.selectedSkins=account.selectedSkins||{};account.achievements=account.achievements||{};account.stats=Object.assign({kills:0,clears:0,perfectDodges:0,paths:{},runs:0,bestDifficulty:0},account.stats||{});account.settings=Object.assign({quality:"normal",fps:60,shake:1,damageNumbers:true,masterVolume:.8,bgmVolume:.55,sfxVolume:.8,uiVolume:.85},account.settings||{});for(const w of account.weapons){w.level=w.level||0;w.rerolls=w.rerolls||0}}
const oldLoadAccountData=loadAccountData;loadAccountData=function(){oldLoadAccountData();ensureV6Account();applySettings();saveAccountData()};
const oldSaveAccountData=saveAccountData;saveAccountData=function(){ensureV6Account();oldSaveAccountData()};
function currentSkin(wid=selectedWeapon){return account.selectedSkins?.[wid]||"default"}
function currentUltimateName(wid=selectedWeapon){
  if(wid==="saber"&&(state==="playing"||state==="cutscene")&&(player.arts?.bloodsaber||0)>0)return "진천마합일";
  return characterDefs[wid]?.ultimate||"절기";
}
function saberHeavenDefenseBonus(){
  if(selectedWeapon!=="saber")return 0;
  const lv=Math.max(0,player.arts?.bloodsaber||0);if(!lv||!player.maxHp)return 0;
  const lost=Math.max(0,Math.min(1,1-player.hp/player.maxHp));
  const maxBonus=.06+lv*.03; // 1/2/3성 최대 9/12/15%
  return lost*maxBonus;
}
function charPalette(wid=selectedWeapon){const c=characterDefs[wid]||characterDefs.sword,skin=skinDefs[currentSkin(wid)]||skinDefs.default;return Object.assign({},c,skin.palette||{})}
function facingDir(){const a=facingAngle(),x=Math.cos(a),y=Math.sin(a);if(Math.abs(x)>Math.abs(y))return x>0?"right":"left";return y>0?"down":"up"}
function pixelRect(c,x,y,w,h,color,scale=3){c.fillStyle=color;c.fillRect(Math.round(x*scale),Math.round(y*scale),Math.round(w*scale),Math.round(h*scale))}
function drawPixelHero(c,cx,cy,wid,dir,frame,scale=3,portrait=false){const pal=charPalette(wid),x=cx/scale-8,y=cy/scale-(portrait?13:10),robe=pal.robe,accent=pal.accent,hair=pal.hair,skin="#efc8aa";c.save();c.imageSmoothingEnabled=false;c.translate(0,frame?0:0);const leg=frame?1:0;
 if(dir==="up"){pixelRect(c,x+4,y+1,8,5,hair,scale);pixelRect(c,x+3,y+5,10,8,robe,scale);pixelRect(c,x+6,y+7,4,4,accent,scale);pixelRect(c,x+3+leg,y+13,4,5,"#252a31",scale);pixelRect(c,x+9-leg,y+13,4,5,"#252a31",scale)}
 else if(dir==="down"){pixelRect(c,x+4,y,8,4,hair,scale);pixelRect(c,x+5,y+3,6,5,skin,scale);pixelRect(c,x+6,y+5,1,1,"#25252b",scale);pixelRect(c,x+9,y+5,1,1,"#25252b",scale);pixelRect(c,x+3,y+8,10,7,robe,scale);pixelRect(c,x+3,y+10,10,2,accent,scale);pixelRect(c,x+3+leg,y+15,4,4,"#252a31",scale);pixelRect(c,x+9-leg,y+15,4,4,"#252a31",scale)}
 else{const flip=dir==="left";-0;pixelRect(c,x+4,y,8,5,hair,scale);pixelRect(c,x+(flip?5:6),y+3,5,5,skin,scale);pixelRect(c,x+(flip?6:9),y+5,1,1,"#25252b",scale);pixelRect(c,x+3,y+8,10,7,robe,scale);pixelRect(c,x+3,y+10,10,2,accent,scale);pixelRect(c,x+3+leg,y+15,4,4,"#252a31",scale);pixelRect(c,x+9-leg,y+15,4,4,"#252a31",scale)}
 // weapon silhouette, never rotate the body
 c.fillStyle=accent;const sx=(cx/scale)+(dir==="left"?-10:dir==="right"?8:-9),sy=(cy/scale)-2;if(wid==="spear"){pixelRect(c,sx,sy-7,1,17,"#d5c49d",scale);pixelRect(c,sx-1,sy-9,3,3,accent,scale)}else if(wid==="bow"){c.strokeStyle=accent;c.lineWidth=scale;c.beginPath();c.arc(sx*scale,sy*scale,5*scale,-1.2,1.2);c.stroke()}else if(wid==="fist"){pixelRect(c,sx,sy,3,3,accent,scale)}else{pixelRect(c,sx,sy-5,2,wid==="saber"?13:10,"#d9dde3",scale);pixelRect(c,sx-1,sy+4,4,2,accent,scale)}c.restore()}
function drawPixelEnemy(c,e,sx,sy){const dir=Math.abs(player.x-e.x)>Math.abs(player.y-e.y)?(player.x>e.x?"right":"left"):(player.y>e.y?"down":"up"),frame=Math.floor(elapsed*(e.type==="assassin"?8:5))%2,sc=e.type==="boss"?4:e.type==="midboss"?3.2:e.type==="brute"?2.7:2.3,pal=e.hit>0?"#f5ead0":e.color,cx=sx/sc,cy=sy/sc,x=cx-7,y=cy-9;
 c.save();c.imageSmoothingEnabled=false;pixelRect(c,x+3,y,8,4,e.type==="boss"?"#1c1114":"#25262b",sc);pixelRect(c,x+4,y+3,6,4,e.type==="boss"?"#d7a19b":"#c8a78c",sc);if(dir!=="up"){pixelRect(c,x+(dir==="left"?5:dir==="right"?9:5),y+5,1,1,"#17191c",sc);if(dir==="down")pixelRect(c,x+9,y+5,1,1,"#17191c",sc)}pixelRect(c,x+2,y+7,10,e.type==="brute"||e.type==="midboss"||e.type==="boss"?9:7,pal,sc);if(e.elitePrefix)pixelRect(c,x+2,y+7,10,2,e.eliteColor||"#e8c25f",sc);pixelRect(c,x+2+frame,y+14,4,4,"#20242a",sc);pixelRect(c,x+8-frame,y+14,4,4,"#20242a",sc);if(e.type==="spear")pixelRect(c,x+13,y+1,1,16,"#d8c798",sc);if(e.type==="assassin")pixelRect(c,x-1,y+8,4,2,"#adb9ca",sc);if(e.type==="boss"){pixelRect(c,x+1,y-3,3,4,"#a83239",sc);pixelRect(c,x+10,y-3,3,4,"#a83239",sc)}c.restore()}
function renderCharacterPreview(){const c=ui.characterPreview.getContext("2d"),wid=selectedWeapon||"sword",ch=characterDefs[wid],pal=charPalette(wid);c.imageSmoothingEnabled=false;c.clearRect(0,0,560,150);c.fillStyle="#111812";c.fillRect(0,0,560,150);for(let i=0;i<22;i++){c.fillStyle=i%3?"#18231a":"#202b20";c.fillRect(i*28,118,22,8)}drawPixelHero(c,110,104,wid,"down",0,5,true);c.fillStyle="#eee8d7";c.font="bold 25px system-ui";c.fillText(ch.name,205,48);c.fillStyle=pal.accent;c.font="bold 15px system-ui";c.fillText(ch.title+" · "+weaponDefs[wid].name,205,75);c.fillStyle="#aaa48e";c.font="13px system-ui";c.fillText("절기: "+ch.ultimate,205,100);c.fillText(ch.quote,205,125);ui.characterInfo.innerHTML=`<div><b>${ch.name} · ${ch.title}</b><small>${ch.quote}<br>전용 절기: ${ch.ultimate}</small></div><span class="direction-chip">상·하·좌·우</span>`}
function drawPortrait(canvasEl,wid,skinId){const c=canvasEl.getContext("2d"),prev=account.selectedSkins[wid];if(skinId)account.selectedSkins[wid]=skinId;c.imageSmoothingEnabled=false;c.clearRect(0,0,canvasEl.width,canvasEl.height);c.fillStyle="#111812";c.fillRect(0,0,canvasEl.width,canvasEl.height);drawPixelHero(c,canvasEl.width/2,canvasEl.height*.65,wid,"down",0,6,true);if(skinId)account.selectedSkins[wid]=prev}

const baseBuildWeaponMenu=buildWeaponMenu;buildWeaponMenu=function(){ui.weaponGrid.innerHTML="";Object.entries(weaponDefs).forEach(([id,w])=>{const ch=characterDefs[id],b=document.createElement("button");b.type="button";b.className="weapon-card";b.dataset.id=id;const cp=window.CombatPowerSystem?CombatPowerSystem.equippedPower(id):0;b.innerHTML=`<em>${w.icon}</em><b>${ch.name}</b><small>${ch.title} · ${w.name}<br>기본: ${w.basic.name}${cp?`<br><span class="weapon-cp">전투력 ${CombatPowerSystem.format(cp)}</span>`:""}</small>`;b.addEventListener("click",()=>{selectedWeapon=id;document.querySelectorAll(".weapon-card").forEach(x=>x.classList.toggle("selected",x.dataset.id===id));renderCharacterPreview();buildDifficultyMenu();updateStartButton()});ui.weaponGrid.appendChild(b)});renderCharacterPreview()};
const baseUpdateStartButton=updateStartButton;updateStartButton=function(){baseUpdateStartButton();if(selectedWeapon){const cp=window.CombatPowerSystem?CombatPowerSystem.equippedPower(selectedWeapon):0;ui.startBtn.textContent=`${difficultyDefs[selectedDifficulty].name} · ${characterDefs[selectedWeapon].name}${cp?` · 전투력 ${CombatPowerSystem.format(cp)}`:""} 출전`}};

function applySettings(){ensureV6Account();const q=account.settings.quality;DPR=Math.min(q==="low"?1:q==="high"?2:1.5,devicePixelRatio||1);if(ui.soundBtn)ui.soundBtn.title=`${q} · ${account.settings.fps}FPS`}
const baseResize=resize;resize=function(){baseResize();applySettings();canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0);ctx.imageSmoothingEnabled=false};
const baseParticle=particle;particle=function(x,y,color=C[selectedWeapon],speed=80,n=1){const q=account.settings?.quality||"normal",mul=q==="low"?.35:q==="high"?1.35:1;baseParticle(x,y,color,speed,Math.max(1,Math.floor(n*mul)))};
function shakeValue(v){return v*(account.settings?.shake??1)}

const baseResetGame=resetGame;resetGame=function(){baseResetGame();Object.assign(player,{dir:"up",walkFrame:0,ultimate:0,ultimateMax:100,ultimateGain:1,shield:0,shieldMax:0,shieldTimer:18,luck:0,perfectWindow:0,evolutions:{},ultimateUses:0,precisionBuff:0});player.metrics.perfectDodges=0;player.metrics.ultimateUses=0;slowTimer=0;cutsceneTimer=0;account.stats.paths[selectedWeapon]=true;saveAccountData();ui.ultimateBtn.style.display="flex";updateUltimateHud()};
const baseStartGame=startGame;startGame=function(){baseStartGame();ui.ultimateBtn.style.display="flex"};
// 런 통계는 game-runtime-v14.js의 finalizeRunStats()가 정확히 한 번만 집계한다.
const baseEndGame=endGame;endGame=function(win,reason=""){return baseEndGame(win,reason)};

function updateUltimateHud(){if(!ui.ultimateBtn)return;const pct=Math.min(100,Math.floor(player.ultimate||0));ui.ultimateFill.style.height=pct+"%";ui.ultimateCd.textContent=pct+"%";const ratio=pct/100;ui.ultimateBtn.style.setProperty("--ult-progress",String(ratio));ui.ultimateBtn.style.setProperty("--ult-pct",pct+"%");ui.ultimateBtn.style.setProperty("--ult-scale",String(.94+ratio*.08));ui.ultimateBtn.style.setProperty("--ult-brightness",String(.7+ratio*.38));ui.ultimateBtn.style.setProperty("--ult-saturation",String(.72+ratio*.34));ui.ultimateBtn.style.setProperty("--ult-glow-size",(4+ratio*10)+"px");ui.ultimateBtn.style.setProperty("--ult-halo-opacity",String(.28+ratio*.55));ui.ultimateBtn.classList.toggle("ready",pct>=100)}
// v14.5.3 절기 충전: 후반 밀집전에서 킬 수가 폭증해도 절기 난사가 되지 않도록
// 일반 전투 충전은 런 진행도에 따라 완만하게 감쇠하고, 절기 자체 피해/처치는 재충전에 포함하지 않는다.
function ultimateChargeScale(){
 const progress=Math.max(0,Math.min(1,elapsed/Math.max(1,runDuration)));
 if(progress<=.2)return 1;
 const t=(progress-.2)/.8;
 return 1-.64*t; // 초반 100% → 종료 직전 36%
}
function gainUltimate(v,{ignoreScaling=false}={}){
 const scale=ignoreScaling?1:ultimateChargeScale();
 // 천마합일 지속 중에는 모든 절기 게이지 획득량을 절반으로 제한한다.
 // 보스 처치/정밀 회피처럼 ignoreScaling인 보상도 이 절기 자체 감쇠는 적용한다.
 const unityGain=((player.saberUnityTimer||0)>0&&selectedWeapon==="saber"&&player.saberUnityTrue)?.5:1;
 player.ultimate=Math.min(player.ultimateMax,(player.ultimate||0)+v*scale*(player.ultimateGain||1)*unityGain);
 updateUltimateHud();
}
function isUltimateSource(source){return source==="ultimate"||source==="ultimate-dot"}
const baseDamageEnemy=damageEnemy;damageEnemy=function(e,dmg,source,opt={}){
 const before=Math.max(0,e.hp),vi=visuals.length;
 // 천마합일 변신 자체의 전역 화력 상승. 기존 벽력도법/단악참 전용 강화와 곱연산된다.
 const unityDamage=(selectedWeapon==="saber"&&(player.saberUnityTimer||0)>0)?(player.saberUnityTrue?1.25:1.18):1;
 baseDamageEnemy(e,dmg*unityDamage,source,opt);
 if(account.settings&&!account.settings.damageNumbers&&visuals.length>vi)for(let i=visuals.length-1;i>=vi;i--)if(visuals[i].type==="text"&&visuals[i].text==="치명")visuals.splice(i,1);
 const dealt=Math.max(0,before-Math.max(0,e.hp));
 // 천마합일: 15초 동안 실제 가한 피해의 8%를 흡혈한다.
 // 다수 타격 스킬의 순간 완전회복을 막기 위해 1회 타격당 최대 4 HP로 제한한다.
 if(selectedWeapon==="saber"&&(player.saberUnityTimer||0)>0&&player.saberUnityTrue&&!isUltimateSource(source)&&dealt>0){
   const heal=Math.min(4,dealt*.08);
   if(heal>0)player.hp=Math.min(player.maxHp,player.hp+heal);
 }
 // 피해 기반 충전은 보조 수단만 남긴다. 절기 타격으로 절기를 다시 채우는 순환은 금지.
 if(!isUltimateSource(source)&&dealt>0)gainUltimate(Math.min(.12,dealt*.0012));
};
const baseKillEnemy=killEnemy;killEnemy=function(e,source="basic",opt={}){
 const wasDead=e.dead;
 baseKillEnemy(e,source,opt);
 if(!wasDead&&e.dead){
   if(!isUltimateSource(source)){
     if(e.type==="boss")gainUltimate(18,{ignoreScaling:true});
     else if(e.type==="midboss")gainUltimate(9,{ignoreScaling:true});
     else if(e.elitePrefix)gainUltimate(2.4);
     else gainUltimate(.70);
   }
   if(e.elitePrefix&&!e.type.includes("boss")){dropGold(e.x,e.y,4+Math.floor(5*player.luck));if(Math.random()<.24+player.luck*.1)dropOre(e.x+7,e.y,1)}
 }
};

// 정예 부여는 combat-progression-v14-3-1.js 한 곳에서만 처리한다. 이중 배율 적용을 방지한다.

function threatNear(){for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-player.x,e.y-player.y),closing=e.speed*(e.chargeTime>0?2.5:1);if(d<player.r+e.r+36+closing*.12)return true}for(const h of hazards){if(h.dead)continue;if(h.type==="blast"&&h.time<.42&&Math.hypot(h.x-player.x,h.y-player.y)<h.r+35)return true;if(h.type==="orb"&&Math.hypot(h.x-player.x,h.y-player.y)<65)return true;if(h.type==="puddle"&&Math.hypot(h.x-player.x,h.y-player.y)<h.r+18)return true;if(h.type==="cross"&&h.time<.38&&(Math.abs(player.x-h.x)<(h.w||38)+player.r||Math.abs(player.y-h.y)<(h.w||38)+player.r))return true}return false}
const basePerformDodge=performDodge;performDodge=function(){const can=state==="playing"&&player.dodgeCooldown<=0&&player.dodgeTimer<=0,perfect=can&&threatNear();basePerformDodge();if(perfect){player.metrics.perfectDodges++;player.perfectWindow=1.2;slowTimer=.42;slowScale=.33;gainUltimate(10,{ignoreScaling:true});showMessage("정밀 회피 · 찰나의 경지",1.1);addVisual({type:"text",x:player.x,y:player.y-30,text:"PERFECT",life:.55,max:.55,color:"#bdeeff"});GameAudio.playSFX("perfect-dodge")}};
const baseHurtPlayer=hurtPlayer;hurtPlayer=function(amount){if(player.shield>0&&player.invuln<=0&&state==="playing"){player.shield--;player.invuln=.45;showMessage("호신강기가 피해를 막았다",.8);addVisual({type:"ring",x:player.x,y:player.y,r:32,life:.3,max:.3,color:"#bdeeff",width:5});return}const heavenDR=saberHeavenDefenseBonus();baseHurtPlayer(amount*(1-heavenDR))};

function checkEvolution(){const evo=evolutionDefs[selectedWeapon];if(!evo||player.evolutions[selectedWeapon]||!evo.check(player))return;player.evolutions[selectedWeapon]=evo.name;evo.apply(player);showMessage(`무공 진화 · ${evo.name}`,3);screenShake=Math.max(screenShake,shakeValue(14));addVisual({type:"ring",x:player.x,y:player.y,r:180,life:.8,max:.8,color:"#fff0a0",width:10});GameAudio.playUI("evolution")}
const baseCheckHidden=checkHidden;checkHidden=function(){baseCheckHidden();checkEvolution()};

function ultimateAttack(){
 const a=facingAngle(),len=Math.max(W,H)*1.25,ch=characterDefs[selectedWeapon];
 // v14.5.3 역할별 절기 밸런스: 검=전방위, 창=직선 폭딜, 활=정밀 다중타격, 독=지속 장악,
 // 도술=연쇄 섬멸, 박도=광역 횡단, 왜도=연속 참격, 권=근중거리 정면 폭발.
 if(selectedWeapon==="sword"){
   for(let i=0;i<20;i++){const ang=i*Math.PI*2/20,x=player.x+Math.cos(ang)*470,y=player.y+Math.sin(ang)*470;projectile({x,y,vx:-Math.cos(ang)*720,vy:-Math.sin(ang)*720,damage:44,r:7,pierce:5,shape:"sword",color:"#f4fbff",source:"ultimate",ignorePassive:true})}
   aoe(player.x,player.y,235,88,"ultimate",{color:"#eaf7ff",shake:13});
 }else if(selectedWeapon==="spear"){
   const sx=player.x-Math.cos(a)*70,sy=player.y-Math.sin(a)*70,ex=player.x+Math.cos(a)*len,ey=player.y+Math.sin(a)*len;
   lineHit(sx,sy,ex,ey,180,330,"ultimate",{color:"#ffe3a0",knock:560,shake:20,life:.72});
   lineHit(player.x+Math.cos(a)*90,player.y+Math.sin(a)*90,ex,ey,80,145,"ultimate",{color:"#fff4c8",knock:220,shake:8,life:.55});
   addVisual({type:"text",x:player.x+Math.cos(a)*110,y:player.y+Math.sin(a)*110-26,text:"관일 · 일점 돌파",life:.75,max:.75,color:"#fff0b8"});
 }else if(selectedWeapon==="bow"){
   // v14.5.6: 단발 다중 폭격 대신 10초간 화면 경계를 반사하는 절기 화살장으로 변경.
   addVisual({type:"skillBowRicochetSeal",x:player.x+Math.cos(a)*34,y:player.y+Math.sin(a)*34,a,r:360,life:1.85,max:1.85,color:"#f6e77d",visibilityBoost:1.18,holdAlpha:true});
   delayed.push({time:1.30,type:"ricochetVolley",a,count:6,damage:38});
 }else if(selectedWeapon==="poison"){
   const targets=visibleEnemies(0).slice(0,28);
   if(!targets.length){for(let i=0;i<10;i++){const aa=a+(i-4.5)*.28;projectile({x:player.x,y:player.y,vx:Math.cos(aa)*420,vy:Math.sin(aa)*420,damage:42,r:13,life:2.4,pierce:0,shape:"poisonButterfly",color:"#8bdcff",source:"ultimate",homing:4.8,ignorePassive:true})}}
   else for(let i=0;i<targets.length;i++){const e=targets[i],aa=Math.atan2(e.y-player.y,e.x-player.x)+(i%3-1)*.08;projectile({x:player.x,y:player.y,vx:Math.cos(aa)*(390+(i%4)*18),vy:Math.sin(aa)*(390+(i%4)*18),damage:42,r:13,life:2.8,pierce:0,shape:"poisonButterfly",color:"#8bdcff",source:"ultimate",homing:7.2,targetEnemy:e,ignorePassive:true})}
   showMessage("추혼비접 · 산공",1.2);
 }else if(selectedWeapon==="tao"){
   const targets=visibleEnemies(0);
   for(let i=0;i<Math.min(24,targets.length);i++){const e=targets[i];delayed.push({time:i*.045,type:"strike",x:e.x,y:e.y,r:38,damage:96,source:"ultimate",color:"#9eeaff"})}
 }else if(selectedWeapon==="saber"){
   const trueUnity=(player.arts?.bloodsaber||0)>0;
   player.saberUnityTimer=15;
   player.saberUnityTrue=trueUnity;
   player.fireTimer=Math.min(player.fireTimer||.12,.12);
   if(trueUnity&&player.cooldowns)player.cooldowns.mountain=Math.min(player.cooldowns.mountain||.18,.18);
   addVisual({type:"text",x:player.x,y:player.y-48,text:trueUnity?"진천마합일 · 기존 완성형 강화 15초":"천마합일 · 피해 +18% / 공격속도 +20% · 15초",life:1.1,max:1.1,color:"#ffd1cf"});
 }else if(selectedWeapon==="katana"){
   for(let i=0;i<12;i++){const ang=(i%6)*Math.PI/3+.14*Math.floor(i/6),off=(i-5.5)*24,x1=player.x+Math.cos(ang+Math.PI/2)*off-Math.cos(ang)*650,y1=player.y+Math.sin(ang+Math.PI/2)*off-Math.sin(ang)*650;delayed.push({time:i*.045,type:"aoe",x:player.x+Math.cos(ang+Math.PI/2)*off,y:player.y+Math.sin(ang+Math.PI/2)*off,r:78,damage:62,color:"#f2efff",source:"ultimate",knock:0});addVisual({type:"line",x1,y1,x2:x1+Math.cos(ang)*1300,y2:y1+Math.sin(ang)*1300,width:8,life:.62,max:.62,color:"#f2efff"})}
 }else{
   addVisual({type:"dragon",x:player.x,y:player.y,a,r:len,life:1,max:1,color:"#ffd86f"});
   lineHit(player.x,player.y,player.x+Math.cos(a)*len,player.y+Math.sin(a)*len,78,300,"ultimate",{color:"#ffd86f",knock:620,shake:20,life:.85});
   coneHit(a,Math.min(len*.72,720),.36,150,"ultimate",{color:"#ffeaa8",knock:340,shake:10});
   aoe(player.x,player.y,150,88,"ultimate",{color:"#ffd86f",knock:220});
   addVisual({type:"text",x:player.x+Math.cos(a)*95,y:player.y+Math.sin(a)*95-24,text:"항룡 · 정면 붕괴",life:.75,max:.75,color:"#ffe9a0"});
 }
 showMessage(currentUltimateName(selectedWeapon),1.5);
}

const ultimatePalettes={sword:["#e9fbff","#78d7ff"],spear:["#ffe0a3","#c44c39"],bow:["#fff3a5","#5dbd95"],poison:["#d497ff","#69d06e"],tao:["#dff7ff","#64cfff"],saber:["#ff9b7b","#a71928"],katana:["#f6efff","#9f8dff"],fist:["#ffe69b","#d18a27"]};
function useUltimate(){if(state!=="playing"||player.ultimate<100)return;player.ultimate=0;player.ultimateUses++;player.metrics.ultimateUses++;updateUltimateHud();state="cutscene";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";const pal=ultimatePalettes[selectedWeapon]||["#fff0a0","#d9b95f"];ui.cutscene.style.setProperty("--ult",pal[0]);ui.cutscene.style.setProperty("--ult2",pal[1]);ui.cutsceneName.textContent=currentUltimateName(selectedWeapon);ui.cutsceneLine.textContent=characterDefs[selectedWeapon].name+" · "+characterDefs[selectedWeapon].quote;drawPortrait(ui.cutsceneCanvas,selectedWeapon,currentSkin());ui.cutscene.classList.remove("show");void ui.cutscene.offsetWidth;ui.cutscene.classList.add("show");GameAudio.playSFX("ultimate-rise");setTimeout(()=>GameAudio.playSFX("ultimate-mid"),360);setTimeout(()=>GameAudio.playSFX("ultimate-hit"),720);setTimeout(()=>{ui.cutscene.classList.remove("show");state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";ultimateAttack();last=performance.now()},1450)}

const baseUpdate=update;update=function(dt){if(state==="playing"){if(player.shieldMax){player.shieldTimer-=dt;if(player.shieldTimer<=0){player.shieldTimer=Math.max(12,24-player.shieldMax*3);player.shield=Math.min(player.shieldMax,player.shield+1)}}player.perfectWindow=Math.max(0,(player.perfectWindow||0)-dt)}baseUpdate(dt)};
const baseUpdateHud=updateHud;updateHud=function(){baseUpdateHud();updateUltimateHud()};
const baseLoop=loop;loop=function(now){const fps=Number(account.settings?.fps||60),min=1000/fps;if(now-lastFrameDraw<min){requestAnimationFrame(loop);return}lastFrameDraw=now;let raw=Math.min(.033,Math.max(0,(now-last)/1000));last=now;if(slowTimer>0){slowTimer-=raw;raw*=slowScale}else slowScale=1;update(raw);draw();requestAnimationFrame(loop)};
