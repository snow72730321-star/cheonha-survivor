"use strict";
/** v14.3.18 백소린 컨셉 시트 원본 추출 프로토타입 */
/* ===== v7 external sprite assets, hit feedback, boss warning ===== */
// v14.3.16: 적은 기존 32×40 시트를 유지하고 플레이어 프레임은 실제 PNG 크기에서 계산한다.
// 캐시된 구버전 32×40 시트와 신규 36×52 시트가 섞여도 잘못된 source rect로 몸이 잘리지 않는다.
const spriteSheetMeta={frameW:32,frameH:40,frames:4,dirs:{down:0,left:1,right:2,up:3}};
const playerSpriteSheetLayout={frames:4,directionRows:4,dirs:{down:0,left:1,right:2,up:3}};
const playerSheetMetaCache=new WeakMap();
function resolvePlayerSheetMeta(img){
  if(!img||!img.naturalWidth||!img.naturalHeight)return null;
  if(playerSheetMetaCache.has(img))return playerSheetMetaCache.get(img);
  const frameW=img.naturalWidth/playerSpriteSheetLayout.frames;
  const frameH=img.naturalHeight/playerSpriteSheetLayout.directionRows;
  if(!Number.isInteger(frameW)||!Number.isInteger(frameH)||frameW<24||frameH<32){
    console.error(`[스프라이트 규격 오류] ${img.dataset?.assetPath||"unknown"}: ${img.naturalWidth}x${img.naturalHeight}`);
    playerSheetMetaCache.set(img,null);return null;
  }
  const padBottom=frameW===36&&frameH>=48?3:0;
  const meta={frameW,frameH,padBottom,frames:playerSpriteSheetLayout.frames,dirs:playerSpriteSheetLayout.dirs};
  playerSheetMetaCache.set(img,meta);return meta;
}
const spriteImages={characters:{},enemies:{},portraits:{}};
const enemyAssetMap={bandit:"bandit",spear:"spear",brute:"brute",master:"master",assassin:"assassin",boss:"boss"};

/**
 * 통합 GameAssets 저장소의 Image 객체를 그대로 사용한다.
 * 부팅 검사와 전투 렌더러가 서로 다른 이미지 로딩 상태를 갖지 않도록 하는 핵심 수정이다.
 */
function loadSpriteAsset(group,key,path){
  const img=GameAssets.image(path);
  spriteImages[group][key]=img;
  img.addEventListener("load",()=>{
    if(group==="portraits"&&state==="menu"&&selectedWeapon===key)renderCharacterPreview();
  });
  img.addEventListener("error",()=>console.error(`[에셋 오류] ${path}`));
  GameAssets.load(path);
  return img;
}
Object.keys(characterDefs).forEach(k=>{loadSpriteAsset("characters",k,`assets/characters/${k}.png`);loadSpriteAsset("portraits",k,`assets/portraits/${k}.png`)});
["bandit","spear","brute","master","assassin","blackblade","poisonhand","ironmonk","boss"].forEach(k=>loadSpriteAsset("enemies",k,`assets/enemies/${k}.png`));
window.__CHEONHA_RENDERER_MODE__="external-png-assets-source-normalized-v14318";
function spriteFrame(img,dir,frame,cx,cy,scale=2.7,alpha=1,flashOn=false){if(!img||!img.complete||!img.naturalWidth)return false;const fw=spriteSheetMeta.frameW,fh=spriteSheetMeta.frameH,row=spriteSheetMeta.dirs[dir]??0,col=((frame%spriteSheetMeta.frames)+spriteSheetMeta.frames)%spriteSheetMeta.frames,z=(canvas&&ctx&&state!=="menu")?mobileCameraScale():1,sc=scale*z;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;if(flashOn){ctx.filter="brightness(3) saturate(0)"}ctx.drawImage(img,col*fw,row*fh,fw,fh,Math.round(cx-fw*sc/2),Math.round(cy-fh*sc*.72),Math.round(fw*sc),Math.round(fh*sc));ctx.restore();return true}
function enemySpriteKey(e){if(e.type==="midboss")return e.subtype||"blackblade";return enemyAssetMap[e.type]||"bandit"}
/** 행동별 고급 시트가 등록된 경우 해당 프레임을 그린다. */
function drawAdvancedPlayerFrame(wid,action,dir,cx,cy,scale=1){
  const resolved=AnimationController.frame(wid,action,elapsed,dir);
  if(!resolved)return false;
  const {img,meta,column,row}=resolved,z=mobileCameraScale(),sc=scale*z;
  ctx.save();ctx.imageSmoothingEnabled=false;
  if(action==="hit")ctx.filter="brightness(2.2) saturate(.4)";
  ctx.drawImage(img,column*meta.frameW,row*meta.frameH,meta.frameW,meta.frameH,
    Math.round(cx-meta.frameW*sc/2),Math.round(cy-meta.frameH*sc*.72+(player.spriteOffsetY||0)),
    Math.round(meta.frameW*sc),Math.round(meta.frameH*sc));
  ctx.restore();return true;
}

const oldDrawPlayerV7=drawPlayer;

/**
 * 플레이어의 이동 상태를 던전 액션 게임식 포즈 값으로 변환한다.
 *
 * 핵심 원칙:
 * 1. 발이 지면에 닿는 순간에는 하체가 고정되고 상체만 관성으로 움직인다.
 * 2. 상체와 하체는 서로 반대 방향으로 미세하게 흔들려 목석 같은 이동을 줄인다.
 * 3. 정지 직후에는 움직임이 즉시 0이 되지 않고 짧은 잔동작을 남긴다.
 * 4. 무적 상태에서도 캐릭터를 숨기지 않는다. 대신 밝기와 투명도만 변화시킨다.
 */
const playerMotionState={phase:0,weight:0,settle:0,lastMoving:false};
function playerMotionPose(){
  const input=Math.min(1,Math.hypot(move.x,move.y));
  const moving=player.moving&&input>.08;
  const dir=facingDir();
  const horizontal=dir==="left"||dir==="right";
  const dodge=player.dodgeTimer>0;

  // 이동이 멈춰도 0.22초 정도 관성이 남도록 감쇠한다.
  const target=moving?input:0;
  playerMotionState.weight+=(target-playerMotionState.weight)*(moving?.34:.16);
  if(playerMotionState.lastMoving&&!moving)playerMotionState.settle=1;
  playerMotionState.settle=Math.max(0,playerMotionState.settle-.065);
  playerMotionState.lastMoving=moving;

  // 실제 4프레임 시트와 정확히 맞춘 보행 주기.
  const cadence=7.1+playerMotionState.weight*2.8;
  if(moving)playerMotionState.phase=(playerMotionState.phase+cadence/60)%4;
  else playerMotionState.phase=(playerMotionState.phase+.035)%4;
  const frame=moving?Math.floor(playerMotionState.phase)%4:0;
  const t=(playerMotionState.phase%1);
  const cycle=(playerMotionState.phase/4)*Math.PI*2;
  const step=Math.sin(cycle);
  const contact=Math.max(0,Math.cos(cycle*2));
  const side=Math.sin(cycle+Math.PI/2);
  const settle=Math.sin((1-playerMotionState.settle)*Math.PI*2)*playerMotionState.settle;

  return {
    dir,moving,dodge,frame,t,
    // 발이 땅에 닿을 때 몸이 아주 조금 내려가며 무게가 실린다.
    bodyBob:moving?-Math.abs(step)*1.15-contact*.45:Math.sin(elapsed*2.1)*.18+settle*.55,
    // 골반과 상체를 서로 반대로 움직여 관절감을 만든다.
    hipShift:moving?side*(horizontal?1.45:.75)*playerMotionState.weight:settle*.5,
    torsoShift:moving?-side*(horizontal?.85:.45)*playerMotionState.weight:-settle*.35,
    torsoLean:moving?(horizontal?Math.sign(move.x||1)*-.024:Math.sign(move.y||1)*.011):settle*.006,
    lowerSquash:dodge?.9:1-contact*.018,
    upperStretch:dodge?1.12:1+contact*.012,
    // 무적시간에도 본체를 항상 완전한 불투명도로 유지한다.
    // 빠른 alpha/filter 반복은 모바일 LCD에서 캐릭터 전체가 깜빡이는 것처럼 보였다.
    alpha:1,
    hitFlash:false
  };
}

/**
 * 캐릭터 프레임 전체를 한 번에 그린다.
 * source rect를 실제 시트 크기에서 계산하여 머리·몸통·하단이 프레임 경계에서 잘리지 않게 한다.
 */
function drawArticulatedPlayerFrame(img,pose,cx,cy,scale){
  if(!img||!img.complete||!img.naturalWidth)return false;
  const meta=resolvePlayerSheetMeta(img);
  if(!meta)return false;
  const fw=meta.frameW,fh=meta.frameH;
  const row=meta.dirs[pose.dir]??0;
  const col=((pose.frame%meta.frames)+meta.frames)%meta.frames;
  // 고해상도 원본 추출 시트도 기존 52px 프레임과 같은 인게임 키로 표시한다.
  // 소스 해상도만 높이고 화면상 크기는 늘리지 않아 얼굴·의상 정보 손실을 줄인다.
  const z=mobileCameraScale(),sourceScale=52/meta.frameH,sc=scale*z*sourceScale;

  // v14.3.11: 한 프레임을 둘로 자르지 않는다.
  // 보행감은 프레임 전체에 아주 작은 이동·기울기만 적용하여 허리 절단선과 상하체 분리를 없앤다.
  const x=cx+(pose.hipShift||0)*.35+(pose.torsoShift||0)*.25;
  const y=cy+(pose.bodyBob||0);
  const lean=(pose.torsoLean||0)*.45;
  const stretch=1+((pose.upperStretch||1)-1)*.18;
  const squash=1+((pose.lowerSquash||1)-1)*.12;

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=Math.max(.38,pose.alpha??1);
  if(pose.hitFlash)ctx.filter="brightness(2.4) saturate(.25)";
  ctx.translate(x,y);
  ctx.rotate(lean);
  ctx.scale(squash,stretch);
  // 실제 불투명 발끝이 방향 링의 지면선에 닿도록 하단 기준으로 배치한다.
  // 프레임 중앙은 재패킹 단계에서 몸통 중심으로 정렬되어 무기/옷자락 때문에 좌우로 끌리지 않는다.
  const footAnchor=18*z;
  const opaqueBottom=fh-meta.padBottom;
  ctx.drawImage(
    img,col*fw,row*fh,fw,fh,
    Math.round(-fw*sc/2),Math.round(footAnchor-opaqueBottom*sc),
    Math.round(fw*sc),Math.round(fh*sc)
  );
  ctx.restore();
  return true;
}

/**
 * 캐릭터 발밑에 타원형 방향 링을 그린다.
 * 전체 원은 낮은 명도로 유지하고, 현재 시선 방향의 호와 화살촉만 밝게 표시한다.
 * 화면 위에 떠 있는 UI가 아니라 지면 표식처럼 보이도록 세로축을 압축한다.
 */
function drawPlayerDirectionRing(cx,cy,angle,z){
  const footY=cy+18*z;
  const radius=22*z;

  ctx.save();
  ctx.translate(cx,footY);
  ctx.scale(1,.42);
  ctx.strokeStyle="rgba(174,218,235,.20)";
  ctx.lineWidth=2*z;
  ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();

  ctx.strokeStyle="rgba(218,248,255,.92)";
  ctx.lineWidth=3*z;
  ctx.lineCap="round";
  ctx.beginPath();ctx.arc(0,0,radius,angle-.62,angle+.62);ctx.stroke();
  ctx.restore();

  const tipX=cx+Math.cos(angle)*radius;
  const tipY=footY+Math.sin(angle)*radius*.42;
  ctx.save();
  ctx.translate(tipX,tipY);
  ctx.rotate(angle);
  ctx.fillStyle="rgba(218,248,255,.94)";
  ctx.beginPath();
  ctx.moveTo(7*z,0);ctx.lineTo(-4*z,-3.4*z);ctx.lineTo(-2*z,0);ctx.lineTo(-4*z,3.4*z);ctx.closePath();ctx.fill();
  ctx.restore();
}

/** 외부 PNG가 실제로 누락됐을 때 구형 캐릭터를 몰래 생성하지 않고 오류를 명확히 표시한다. */
function drawMissingAsset(cx,cy,label){
  ctx.save();ctx.translate(cx,cy);ctx.fillStyle="rgba(80,8,18,.9)";ctx.fillRect(-24,-32,48,64);
  ctx.strokeStyle="#ff6b7a";ctx.lineWidth=3;ctx.strokeRect(-24,-32,48,64);
  ctx.fillStyle="#fff";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText("ASSET ERROR",0,-2);
  ctx.font="9px system-ui";ctx.fillText(label||"unknown",0,13);ctx.restore();
}

/**
 * 플레이어 렌더링.
 * 무적 상태에서 draw 호출 자체를 건너뛰지 않으므로 이동 중 깜빡임이 발생하지 않는다.
 */
drawPlayer=function(){
  const pose=playerMotionPose(),img=spriteImages.characters[selectedWeapon];
  const cx=W/2,cy=H/2,z=mobileCameraScale(),a=facingAngle();

  // 방향 표시는 캐릭터 발밑 지면에 먼저 그려 본체 뒤에 위치시킨다.
  drawPlayerDirectionRing(cx,cy,a,z);

  // 회피 잔상은 본체와 동일 프레임을 사용하되 더 넓게 펼쳐 속도를 강조한다.
  if(pose.dodge&&img&&img.complete&&img.naturalWidth){
    for(let i=4;i>=1;i--){
      const ghost={...pose,alpha:.035+i*.035,hitFlash:false,hipShift:0,torsoShift:0,bodyBob:0};
      drawArticulatedPlayerFrame(img,ghost,cx-Math.cos(a)*i*11,cy-Math.sin(a)*i*11,2.55);
    }
  }

  const action=player.animationState||((pose.dodge&&"dodge")||(pose.moving&&"walk")||"idle");
  if(!drawAdvancedPlayerFrame(selectedWeapon,action,pose.dir,cx,cy,1)){
    // 행동별 고급 시트가 없으면 원본 프레임 높이에 맞춰 자동 정규화되는 외부 PNG 시트를 사용한다.
    // 외부 PNG까지 실패하더라도 drawPixelHero 구형 생성 로직으로는 돌아가지 않는다.
    if(!drawArticulatedPlayerFrame(img,pose,cx,cy,2.55))drawMissingAsset(cx,cy,selectedWeapon);
  }

  // 발 접촉 그림자도 보행 주기에 따라 폭이 변한다.
  const shadowPulse=pose.moving?.88+Math.abs(Math.sin(playerMotionState.phase*Math.PI/2))*.12:1;
  ctx.save();
  ctx.globalCompositeOperation="destination-over";
  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath();
  ctx.ellipse(cx,cy+18*z,17*z*shadowPulse,5*z,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  if(player.shield>0){
    ctx.save();ctx.strokeStyle="rgba(180,235,255,.75)";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(cx,cy,31*z,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
};
const oldDrawEnemiesV7=drawEnemies;drawEnemies=function(){for(const e of enemies){if(e.dead)continue;const s=ws(e.x,e.y);if(s.x<-110||s.x>W+110||s.y<-110||s.y>H+110)continue;const dir=Math.abs(player.x-e.x)>Math.abs(player.y-e.y)?(player.x>e.x?"right":"left"):(player.y>e.y?"down":"up"),frame=Math.floor(elapsed*(e.type==="assassin"?11:7))%4,key=enemySpriteKey(e),img=spriteImages.enemies[key],scale=e.type==="boss"?3.55:e.type==="midboss"?3.05:e.type==="brute"?2.75:2.35;ctx.save();ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(s.x,s.y+e.r*.75,e.r*.72,e.r*.26,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!spriteFrame(img,dir,frame,s.x,s.y,scale,1,e.hit>0)){
  // 적도 코드 생성 도트로 대체하지 않는다. 해당 종류가 없으면 외부 bandit.png를 임시 사용한다.
  const fallback=spriteImages.enemies.bandit;
  if(!spriteFrame(fallback,dir,frame,s.x,s.y,scale,1,e.hit>0))drawMissingAsset(s.x,s.y,key);
}if(e.elitePrefix){ctx.strokeStyle=e.eliteColor||"#e8c25f";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(s.x-e.r-4,s.y-e.r-7,e.r*2+8,e.r*2+10);ctx.setLineDash([])}if(e.poisonTime>0){ctx.strokeStyle="rgba(174,110,194,.9)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,e.r+5,0,Math.PI*2);ctx.stroke()}if(e.type==="boss"||e.type==="midboss"||e.hp<e.maxHp){const bw=Math.max(30,e.r*2.45);ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(s.x-bw/2,s.y-e.r-22,bw,6);ctx.fillStyle=e.type==="boss"?"#d34845":e.type==="midboss"?"#e29b4f":"#dbc162";ctx.fillRect(s.x-bw/2+1,s.y-e.r-21,(bw-2)*Math.max(0,e.hp/e.maxHp),4);if(e.type==="midboss"){ctx.fillStyle="#f8dda0";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(e.bossName,s.x,s.y-e.r-27)}}}};
function paintPreviewCanvas(canvasEl,wid,wide=false){
  const c=canvasEl.getContext("2d"),img=spriteImages.portraits[wid];
  c.imageSmoothingEnabled=false;c.clearRect(0,0,canvasEl.width,canvasEl.height);c.fillStyle="#101711";c.fillRect(0,0,canvasEl.width,canvasEl.height);
  if(img&&img.complete&&img.naturalWidth){const h=wide?136:canvasEl.height,w=h;c.drawImage(img,wide?30:(canvasEl.width-w)/2,wide?7:(canvasEl.height-h)/2,w,h);return}
  // 메뉴에서도 구형 생성 초상화 대신 명시적인 로딩/오류 문구를 표시한다.
  c.fillStyle="#d7c7b0";c.font="bold 14px system-ui";c.textAlign="center";c.fillText("초상화 에셋 확인 중",wide?98:canvasEl.width/2,wide?78:canvasEl.height/2);
}
renderCharacterPreview=function(){const c=ui.characterPreview.getContext("2d"),wid=selectedWeapon||"sword",ch=characterDefs[wid],pal=charPalette(wid);c.imageSmoothingEnabled=false;c.clearRect(0,0,560,150);const grd=c.createLinearGradient(0,0,560,0);grd.addColorStop(0,"#101711");grd.addColorStop(1,"#1a1911");c.fillStyle=grd;c.fillRect(0,0,560,150);paintPreviewCanvas(ui.characterPreview,wid,true);c.fillStyle="#eee8d7";c.font="bold 25px system-ui";c.fillText(ch.name,205,46);c.fillStyle=pal.accent;c.font="bold 15px system-ui";c.fillText(ch.title+" · "+weaponDefs[wid].name,205,73);c.fillStyle="#aaa48e";c.font="13px system-ui";c.fillText("절기: "+ch.ultimate,205,99);c.fillText(ch.quote,205,124);ui.characterInfo.innerHTML=`<div><b>${ch.name} · ${ch.title}</b><small>${ch.quote}<br>전용 절기: ${ch.ultimate}</small></div><span class="direction-chip">4방향 · 4프레임 보간</span>`};
drawPortrait=function(canvasEl,wid,skinId){paintPreviewCanvas(canvasEl,wid,false)};
buildWeaponMenu=function(){ui.weaponGrid.innerHTML="";Object.entries(weaponDefs).forEach(([id,w])=>{const ch=characterDefs[id],b=document.createElement("button");b.type="button";b.className="weapon-card asset-card";b.dataset.id=id;b.innerHTML=`<img src="${GameAssets.url(`assets/portraits/${id}.png`)}" alt="${ch.name} 도트 초상화"><div><b>${ch.name}</b><small>${ch.title} · ${w.name}<br>기본: ${w.basic.name}</small></div>`;b.addEventListener("click",()=>{selectedWeapon=id;document.querySelectorAll(".weapon-card").forEach(x=>x.classList.toggle("selected",x.dataset.id===id));renderCharacterPreview();updateStartButton()});ui.weaponGrid.appendChild(b)});renderCharacterPreview()};
const damagePopups=[];let hitStopV7=0,lastHitSoundV7=0;
const baseDamageEnemyV7=damageEnemy;damageEnemy=function(e,dmg,source,opt={}){const before=e.hp;baseDamageEnemyV7(e,dmg,source,opt);const dealt=Math.max(0,before-Math.max(0,e.hp));if(dealt>0&&account.settings?.damageNumbers!==false){const crit=dealt>dmg*player.damageMul*1.28;if(damagePopups.length<GameBalance.limits.maxDamagePopups)damagePopups.push({x:e.x,y:e.y-8,vx:(Math.random()-.5)*18,vy:-38,life:.62,max:.62,text:Math.round(dealt),crit})}if(dealt>32||e.type==="boss"||e.type==="midboss")hitStopV7=Math.max(hitStopV7,e.type==="boss"?.034:.022);const now=performance.now();const heavyHit=e.type==="boss"||e.type==="midboss"||dealt>55;if(heavyHit&&now-lastHitSoundV7>120){lastHitSoundV7=now;GameAudio.playSFX(e.type==="boss"||e.type==="midboss"?"boss-hit":"enemy-hit")}};
const baseUpdateV7=update;update=function(dt){if(hitStopV7>0){hitStopV7-=dt;dt*=.08}baseUpdateV7(dt);for(const p of damagePopups){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=35*dt;p.life-=dt}for(let i=damagePopups.length-1;i>=0;i--)if(damagePopups[i].life<=0)damagePopups.splice(i,1)};
function drawDamagePopupsV7(){for(const p of damagePopups){const s=ws(p.x,p.y),a=Math.max(0,p.life/p.max);ctx.save();ctx.globalAlpha=a;ctx.textAlign="center";const size=(p.crit?17:13)*(account.settings?.damageNumberSize||1);ctx.font=`${p.crit?"bold ":""}${size}px ui-monospace,monospace`;ctx.lineWidth=3;ctx.strokeStyle="#11150f";ctx.strokeText(p.text,s.x,s.y);ctx.fillStyle=p.crit?"#ffe071":"#f4eee0";ctx.fillText(p.text,s.x,s.y);ctx.restore()}};
const baseDrawV7=draw;draw=function(){baseDrawV7();drawDamagePopupsV7()};
function showBossWarningV7(title,sub){const el=document.getElementById("bossWarning");if(!el)return;el.querySelector("strong").textContent=title;el.querySelector("span").textContent=sub;el.classList.remove("show");void el.offsetWidth;el.classList.add("show")}
const baseSpawnMiniBossV7=spawnMiniBoss;spawnMiniBoss=function(){baseSpawnMiniBossV7();const e=enemies[enemies.length-1];showBossWarningV7(e?.bossName||"중간 보스",`${miniBossCount}번째 강적이 출현했다`)};
const baseSpawnBossV7=spawnBoss;spawnBoss=function(){baseSpawnBossV7();showBossWarningV7("혈마 강림","남은 1분 · 혈겁을 끝내라")};
for(const img of Object.values(spriteImages.portraits)){img.addEventListener?.("load",()=>{if(state==="menu")renderCharacterPreview()})}
