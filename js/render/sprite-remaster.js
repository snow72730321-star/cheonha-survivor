"use strict";
/* ===== v7 external sprite assets, hit feedback, boss warning ===== */
const spriteSheetMeta={frameW:32,frameH:40,frames:4,dirs:{down:0,left:1,right:2,up:3}};
const spriteImages={characters:{},enemies:{},portraits:{}};
const enemyAssetMap={bandit:"bandit",spear:"spear",brute:"brute",master:"master",assassin:"assassin",boss:"boss"};
function loadSpriteAsset(group,key,path){const img=new Image();img.decoding="async";spriteImages[group][key]=img;img.onload=()=>{if(group==="portraits"&&state==="menu"&&selectedWeapon===key)renderCharacterPreview()};img.src=path;return img}
Object.keys(characterDefs).forEach(k=>{loadSpriteAsset("characters",k,`assets/characters/${k}.png`);loadSpriteAsset("portraits",k,`assets/portraits/${k}.png`)});
["bandit","spear","brute","master","assassin","blackblade","poisonhand","ironmonk","boss"].forEach(k=>loadSpriteAsset("enemies",k,`assets/enemies/${k}.png`));
function spriteFrame(img,dir,frame,cx,cy,scale=2.7,alpha=1,flashOn=false){if(!img||!img.complete||!img.naturalWidth)return false;const fw=spriteSheetMeta.frameW,fh=spriteSheetMeta.frameH,row=spriteSheetMeta.dirs[dir]??0,col=((frame%spriteSheetMeta.frames)+spriteSheetMeta.frames)%spriteSheetMeta.frames,z=(canvas&&ctx&&state!=="menu")?mobileCameraScale():1,sc=scale*z;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;if(flashOn){ctx.filter="brightness(3) saturate(0)"}ctx.drawImage(img,col*fw,row*fh,fw,fh,Math.round(cx-fw*sc/2),Math.round(cy-fh*sc*.72),Math.round(fw*sc),Math.round(fh*sc));ctx.restore();return true}
function enemySpriteKey(e){if(e.type==="midboss")return e.subtype||"blackblade";return enemyAssetMap[e.type]||"bandit"}
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
    alpha:player.invuln>0?.68+.22*Math.sin(elapsed*34):1,
    hitFlash:player.invuln>0&&Math.sin(elapsed*38)>.45
  };
}

/**
 * 한 캐릭터 프레임을 상체와 하체 두 구역으로 나눠 그린다.
 * 별도 본 애니메이션이 없는 도트 시트에서도 발 디딤과 상체 관성을 표현하기 위한 방식이다.
 */
function drawArticulatedPlayerFrame(img,pose,cx,cy,scale){
  if(!img||!img.complete||!img.naturalWidth)return false;
  const fw=spriteSheetMeta.frameW,fh=spriteSheetMeta.frameH;
  const row=spriteSheetMeta.dirs[pose.dir]??0;
  const col=((pose.frame%spriteSheetMeta.frames)+spriteSheetMeta.frames)%spriteSheetMeta.frames;
  const z=mobileCameraScale(),sc=scale*z;
  const dx=Math.round(cx-fw*sc/2),dy=Math.round(cy-fh*sc*.72);
  const split=Math.floor(fh*.59);

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.globalAlpha=Math.max(.38,pose.alpha);
  if(pose.hitFlash)ctx.filter="brightness(2.4) saturate(.25)";

  // 하체: 발이 지면을 딛는 느낌을 위해 좌우 무게 이동과 미세한 압축만 적용한다.
  ctx.save();
  ctx.translate(pose.hipShift,pose.bodyBob*.35);
  ctx.translate(cx,cy);ctx.scale(1,pose.lowerSquash);ctx.translate(-cx,-cy);
  ctx.drawImage(img,col*fw,row*fh+split,fw,fh-split,
    dx,dy+split*sc,Math.round(fw*sc),Math.round((fh-split)*sc));
  ctx.restore();

  // 상체: 하체 반대 방향의 관성과 기울기를 적용한다.
  ctx.save();
  ctx.translate(cx,cy);
  ctx.translate(pose.torsoShift,pose.bodyBob);
  ctx.rotate(pose.torsoLean);
  ctx.scale(1,pose.upperStretch);
  ctx.translate(-cx,-cy);
  ctx.drawImage(img,col*fw,row*fh,fw,split,
    dx,dy,Math.round(fw*sc),Math.round(split*sc));
  ctx.restore();

  ctx.restore();
  return true;
}

/**
 * 플레이어 렌더링.
 * 무적 상태에서 draw 호출 자체를 건너뛰지 않으므로 이동 중 깜빡임이 발생하지 않는다.
 */
drawPlayer=function(){
  const pose=playerMotionPose(),img=spriteImages.characters[selectedWeapon];
  const cx=W/2,cy=H/2;

  // 회피 잔상은 본체와 동일 프레임을 사용하되 더 넓게 펼쳐 속도를 강조한다.
  if(pose.dodge&&img&&img.complete&&img.naturalWidth){
    const a=facingAngle();
    for(let i=4;i>=1;i--){
      const ghost={...pose,alpha:.035+i*.035,hitFlash:false,hipShift:0,torsoShift:0,bodyBob:0};
      drawArticulatedPlayerFrame(img,ghost,cx-Math.cos(a)*i*11,cy-Math.sin(a)*i*11,2.78);
    }
  }

  if(!drawArticulatedPlayerFrame(img,pose,cx,cy,2.78)){
    oldDrawPlayerV7();
    return;
  }

  // 발 접촉 그림자도 보행 주기에 따라 폭이 변한다.
  const z=mobileCameraScale(),shadowPulse=pose.moving?.88+Math.abs(Math.sin(playerMotionState.phase*Math.PI/2))*.12:1;
  ctx.save();
  ctx.globalCompositeOperation="destination-over";
  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath();
  ctx.ellipse(cx,cy+18*z,17*z*shadowPulse,5*z,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 방향 표식은 캐릭터 앞쪽 지면에 작고 낮게 표시한다.
  const a=facingAngle();
  const markerX=cx+Math.cos(a)*20*z;
  const markerY=cy+17*z+Math.sin(a)*11*z;
  ctx.save();
  ctx.translate(markerX,markerY);ctx.rotate(a);
  ctx.fillStyle="rgba(205,241,255,.56)";
  ctx.beginPath();ctx.moveTo(5*z,0);ctx.lineTo(-3*z,-2.6*z);ctx.lineTo(-1.5*z,0);ctx.lineTo(-3*z,2.6*z);ctx.closePath();ctx.fill();
  ctx.restore();

  if(player.shield>0){
    ctx.save();ctx.strokeStyle="rgba(180,235,255,.75)";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(cx,cy,31*z,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
};
const oldDrawEnemiesV7=drawEnemies;drawEnemies=function(){for(const e of enemies){if(e.dead)continue;const s=ws(e.x,e.y);if(s.x<-110||s.x>W+110||s.y<-110||s.y>H+110)continue;const dir=Math.abs(player.x-e.x)>Math.abs(player.y-e.y)?(player.x>e.x?"right":"left"):(player.y>e.y?"down":"up"),frame=Math.floor(elapsed*(e.type==="assassin"?11:7))%4,key=enemySpriteKey(e),img=spriteImages.enemies[key],scale=e.type==="boss"?3.55:e.type==="midboss"?3.05:e.type==="brute"?2.75:2.35;ctx.save();ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(s.x,s.y+e.r*.75,e.r*.72,e.r*.26,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!spriteFrame(img,dir,frame,s.x,s.y,scale,1,e.hit>0)){drawPixelEnemy(ctx,e,s.x,s.y)}if(e.elitePrefix){ctx.strokeStyle=e.eliteColor||"#e8c25f";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(s.x-e.r-4,s.y-e.r-7,e.r*2+8,e.r*2+10);ctx.setLineDash([])}if(e.poisonTime>0){ctx.strokeStyle="rgba(174,110,194,.9)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,e.r+5,0,Math.PI*2);ctx.stroke()}if(e.type==="boss"||e.type==="midboss"||e.hp<e.maxHp){const bw=Math.max(30,e.r*2.45);ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(s.x-bw/2,s.y-e.r-22,bw,6);ctx.fillStyle=e.type==="boss"?"#d34845":e.type==="midboss"?"#e29b4f":"#dbc162";ctx.fillRect(s.x-bw/2+1,s.y-e.r-21,(bw-2)*Math.max(0,e.hp/e.maxHp),4);if(e.type==="midboss"){ctx.fillStyle="#f8dda0";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(e.bossName,s.x,s.y-e.r-27)}}}};
function paintPreviewCanvas(canvasEl,wid,wide=false){const c=canvasEl.getContext("2d"),img=spriteImages.portraits[wid];c.imageSmoothingEnabled=false;c.clearRect(0,0,canvasEl.width,canvasEl.height);c.fillStyle="#101711";c.fillRect(0,0,canvasEl.width,canvasEl.height);if(img&&img.complete&&img.naturalWidth){const h=wide?136:canvasEl.height,w=h;c.drawImage(img,wide?30:(canvasEl.width-w)/2,wide?7:(canvasEl.height-h)/2,w,h)}else drawPixelHero(c,wide?105:canvasEl.width/2,wide?104:canvasEl.height*.65,wid,"down",0,wide?5:6,true)}
renderCharacterPreview=function(){const c=ui.characterPreview.getContext("2d"),wid=selectedWeapon||"sword",ch=characterDefs[wid],pal=charPalette(wid);c.imageSmoothingEnabled=false;c.clearRect(0,0,560,150);const grd=c.createLinearGradient(0,0,560,0);grd.addColorStop(0,"#101711");grd.addColorStop(1,"#1a1911");c.fillStyle=grd;c.fillRect(0,0,560,150);paintPreviewCanvas(ui.characterPreview,wid,true);c.fillStyle="#eee8d7";c.font="bold 25px system-ui";c.fillText(ch.name,205,46);c.fillStyle=pal.accent;c.font="bold 15px system-ui";c.fillText(ch.title+" · "+weaponDefs[wid].name,205,73);c.fillStyle="#aaa48e";c.font="13px system-ui";c.fillText("절기: "+ch.ultimate,205,99);c.fillText(ch.quote,205,124);ui.characterInfo.innerHTML=`<div><b>${ch.name} · ${ch.title}</b><small>${ch.quote}<br>전용 절기: ${ch.ultimate}</small></div><span class="direction-chip">4방향 · 4프레임 보간</span>`};
drawPortrait=function(canvasEl,wid,skinId){paintPreviewCanvas(canvasEl,wid,false)};
buildWeaponMenu=function(){ui.weaponGrid.innerHTML="";Object.entries(weaponDefs).forEach(([id,w])=>{const ch=characterDefs[id],b=document.createElement("button");b.type="button";b.className="weapon-card asset-card";b.dataset.id=id;b.innerHTML=`<img src="assets/portraits/${id}.png" alt="${ch.name} 도트 초상화"><div><b>${ch.name}</b><small>${ch.title} · ${w.name}<br>기본: ${w.basic.name}</small></div>`;b.addEventListener("click",()=>{selectedWeapon=id;document.querySelectorAll(".weapon-card").forEach(x=>x.classList.toggle("selected",x.dataset.id===id));renderCharacterPreview();updateStartButton()});ui.weaponGrid.appendChild(b)});renderCharacterPreview()};
const damagePopups=[];let hitStopV7=0,lastHitSoundV7=0;
const baseDamageEnemyV7=damageEnemy;damageEnemy=function(e,dmg,source,opt={}){const before=e.hp;baseDamageEnemyV7(e,dmg,source,opt);const dealt=Math.max(0,before-Math.max(0,e.hp));if(dealt>0&&account.settings?.damageNumbers!==false){const crit=dealt>dmg*player.damageMul*1.28;damagePopups.push({x:e.x,y:e.y-8,vx:(Math.random()-.5)*18,vy:-38,life:.62,max:.62,text:Math.round(dealt),crit})}if(dealt>32||e.type==="boss"||e.type==="midboss")hitStopV7=Math.max(hitStopV7,e.type==="boss"?.034:.022);const now=performance.now();if(now-lastHitSoundV7>45&&(dealt>20||e.type==="boss")){lastHitSoundV7=now;beep(e.type==="boss"?105:180,.022,.012,"square")}};
const baseUpdateV7=update;update=function(dt){if(hitStopV7>0){hitStopV7-=dt;dt*=.08}baseUpdateV7(dt);for(const p of damagePopups){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=35*dt;p.life-=dt}for(let i=damagePopups.length-1;i>=0;i--)if(damagePopups[i].life<=0)damagePopups.splice(i,1)};
function drawDamagePopupsV7(){for(const p of damagePopups){const s=ws(p.x,p.y),a=Math.max(0,p.life/p.max);ctx.save();ctx.globalAlpha=a;ctx.textAlign="center";ctx.font=`${p.crit?"bold ":""}${p.crit?17:13}px ui-monospace,monospace`;ctx.lineWidth=3;ctx.strokeStyle="#11150f";ctx.strokeText(p.text,s.x,s.y);ctx.fillStyle=p.crit?"#ffe071":"#f4eee0";ctx.fillText(p.text,s.x,s.y);ctx.restore()}};
const baseDrawV7=draw;draw=function(){baseDrawV7();drawDamagePopupsV7()};
function showBossWarningV7(title,sub){const el=document.getElementById("bossWarning");if(!el)return;el.querySelector("strong").textContent=title;el.querySelector("span").textContent=sub;el.classList.remove("show");void el.offsetWidth;el.classList.add("show")}
const baseSpawnMiniBossV7=spawnMiniBoss;spawnMiniBoss=function(){baseSpawnMiniBossV7();const e=enemies[enemies.length-1];showBossWarningV7(e?.bossName||"중간 보스",`${miniBossCount}번째 강적이 출현했다`)};
const baseSpawnBossV7=spawnBoss;spawnBoss=function(){baseSpawnBossV7();showBossWarningV7("혈마 강림","남은 1분 · 혈겁을 끝내라")};
for(const img of Object.values(spriteImages.portraits)){img.addEventListener?.("load",()=>{if(state==="menu")renderCharacterPreview()})}
