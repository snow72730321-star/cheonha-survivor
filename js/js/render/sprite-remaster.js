"use strict";
/* ===== v7 external sprite assets, hit feedback, boss warning ===== */
const spriteSheetMeta={frameW:32,frameH:40,frames:6,dirs:{down:0,left:1,right:2,up:3}};
const spriteImages={characters:{},enemies:{},portraits:{}};
const enemyAssetMap={bandit:"bandit",spear:"spear",brute:"brute",master:"master",assassin:"assassin",boss:"boss"};
function loadSpriteAsset(group,key,path){const img=new Image();img.decoding="async";spriteImages[group][key]=img;img.onload=()=>{if(group==="portraits"&&state==="menu"&&selectedWeapon===key)renderCharacterPreview()};img.src=path;return img}
Object.keys(characterDefs).forEach(k=>{loadSpriteAsset("characters",k,`assets/characters/${k}.png`);loadSpriteAsset("portraits",k,`assets/portraits/${k}.png`)});
["bandit","spear","brute","master","assassin","blackblade","poisonhand","ironmonk","boss"].forEach(k=>loadSpriteAsset("enemies",k,`assets/enemies/${k}.png`));
function spriteFrame(img,dir,frame,cx,cy,scale=2.7,alpha=1,flashOn=false){if(!img||!img.complete||!img.naturalWidth)return false;const fw=spriteSheetMeta.frameW,fh=spriteSheetMeta.frameH,row=spriteSheetMeta.dirs[dir]??0,col=((frame%spriteSheetMeta.frames)+spriteSheetMeta.frames)%spriteSheetMeta.frames,z=(canvas&&ctx&&state!=="menu")?mobileCameraScale():1,sc=scale*z;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=alpha;if(flashOn){ctx.filter="brightness(3) saturate(0)"}ctx.drawImage(img,col*fw,row*fh,fw,fh,Math.round(cx-fw*sc/2),Math.round(cy-fh*sc*.72),Math.round(fw*sc),Math.round(fh*sc));ctx.restore();return true}
function enemySpriteKey(e){if(e.type==="midboss")return e.subtype||"blackblade";return enemyAssetMap[e.type]||"bandit"}
/**
 * 캐릭터가 바라보는 방향을 캐릭터 앞쪽 발밑의 쐐기 표식으로 표시한다.
 * 캐릭터 스프라이트는 회전하지 않고 표식만 방향에 맞춰 회전한다.
 * @param {"up"|"down"|"left"|"right"} dir 현재 방향
 */
function drawFacingMarker(dir){
 const zoom=mobileCameraScale();
 const angle={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[dir]||0;
 const distance=25*zoom;
 const x=W/2+Math.cos(angle)*distance;
 const y=H/2+Math.sin(angle)*distance+8*zoom;
 ctx.save();
 ctx.translate(x,y);
 ctx.rotate(angle);
 ctx.globalAlpha=.9;
 ctx.shadowColor="rgba(125,220,255,.72)";
 ctx.shadowBlur=6;
 ctx.fillStyle="rgba(207,244,255,.9)";
 ctx.beginPath();
 ctx.moveTo(8*zoom,0);
 ctx.lineTo(-5*zoom,-4*zoom);
 ctx.lineTo(-2*zoom,0);
 ctx.lineTo(-5*zoom,4*zoom);
 ctx.closePath();
 ctx.fill();
 ctx.shadowBlur=0;
 ctx.strokeStyle="rgba(18,43,55,.95)";
 ctx.lineWidth=Math.max(1,zoom);
 ctx.stroke();
 ctx.restore();
}

const oldDrawPlayerV7=drawPlayer;
drawPlayer=function(){
 if(player.invuln>0&&Math.floor(player.invuln*14)%2===0)return;
 const dir=facingDir(),movePower=Math.min(1,Math.hypot(move.x,move.y));
 const frame=player.moving?Math.floor(elapsed*(8.5+movePower*5))%6:0;
 const img=spriteImages.characters[selectedWeapon];
 const stride=player.moving?Math.sin(elapsed*16)*1.6:0;
 const dodgeStretch=player.dodgeTimer>0?1.18:1;
 ctx.save();
 ctx.translate(0,stride);
 ctx.scale(dir==="left"||dir==="right"?dodgeStretch:1,dir==="up"||dir==="down"?dodgeStretch:1);
 if(!spriteFrame(img,dir,frame,W/2,H/2,2.78,1,false)){
  ctx.restore();
  oldDrawPlayerV7();
  return;
 }
 ctx.restore();
 drawFacingMarker(dir);
 if(player.shield>0){
  ctx.save();
  ctx.strokeStyle="rgba(180,235,255,.75)";
  ctx.lineWidth=2;
  ctx.setLineDash([4,3]);
  ctx.beginPath();
  ctx.arc(W/2,H/2,31*mobileCameraScale(),0,Math.PI*2);
  ctx.stroke();
  ctx.restore();
 }
};
const oldDrawEnemiesV7=drawEnemies;drawEnemies=function(){for(const e of enemies){if(e.dead)continue;const s=ws(e.x,e.y);if(s.x<-110||s.x>W+110||s.y<-110||s.y>H+110)continue;const dir=Math.abs(player.x-e.x)>Math.abs(player.y-e.y)?(player.x>e.x?"right":"left"):(player.y>e.y?"down":"up"),frame=Math.floor(elapsed*(e.type==="assassin"?11:7))%4,key=enemySpriteKey(e),img=spriteImages.enemies[key],scale=e.type==="boss"?3.55:e.type==="midboss"?3.05:e.type==="brute"?2.75:2.35;ctx.save();ctx.fillStyle="rgba(0,0,0,.25)";ctx.beginPath();ctx.ellipse(s.x,s.y+e.r*.75,e.r*.72,e.r*.26,0,0,Math.PI*2);ctx.fill();ctx.restore();if(!spriteFrame(img,dir,frame,s.x,s.y,scale,1,e.hit>0)){drawPixelEnemy(ctx,e,s.x,s.y)}if(e.elitePrefix){ctx.strokeStyle=e.eliteColor||"#e8c25f";ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.strokeRect(s.x-e.r-4,s.y-e.r-7,e.r*2+8,e.r*2+10);ctx.setLineDash([])}if(e.poisonTime>0){ctx.strokeStyle="rgba(174,110,194,.9)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,e.r+5,0,Math.PI*2);ctx.stroke()}if(e.type==="boss"||e.type==="midboss"||e.hp<e.maxHp){const bw=Math.max(30,e.r*2.45);ctx.fillStyle="rgba(0,0,0,.72)";ctx.fillRect(s.x-bw/2,s.y-e.r-22,bw,6);ctx.fillStyle=e.type==="boss"?"#d34845":e.type==="midboss"?"#e29b4f":"#dbc162";ctx.fillRect(s.x-bw/2+1,s.y-e.r-21,(bw-2)*Math.max(0,e.hp/e.maxHp),4);if(e.type==="midboss"){ctx.fillStyle="#f8dda0";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(e.bossName,s.x,s.y-e.r-27)}}}};
function paintPreviewCanvas(canvasEl,wid,wide=false){const c=canvasEl.getContext("2d"),img=spriteImages.portraits[wid];c.imageSmoothingEnabled=false;c.clearRect(0,0,canvasEl.width,canvasEl.height);c.fillStyle="#101711";c.fillRect(0,0,canvasEl.width,canvasEl.height);if(img&&img.complete&&img.naturalWidth){const h=wide?136:canvasEl.height,w=h;c.drawImage(img,wide?30:(canvasEl.width-w)/2,wide?7:(canvasEl.height-h)/2,w,h)}else drawPixelHero(c,wide?105:canvasEl.width/2,wide?104:canvasEl.height*.65,wid,"down",0,wide?5:6,true)}
renderCharacterPreview=function(){const c=ui.characterPreview.getContext("2d"),wid=selectedWeapon||"sword",ch=characterDefs[wid],pal=charPalette(wid);c.imageSmoothingEnabled=false;c.clearRect(0,0,560,150);const grd=c.createLinearGradient(0,0,560,0);grd.addColorStop(0,"#101711");grd.addColorStop(1,"#1a1911");c.fillStyle=grd;c.fillRect(0,0,560,150);paintPreviewCanvas(ui.characterPreview,wid,true);c.fillStyle="#eee8d7";c.font="bold 25px system-ui";c.fillText(ch.name,205,46);c.fillStyle=pal.accent;c.font="bold 15px system-ui";c.fillText(ch.title+" · "+weaponDefs[wid].name,205,73);c.fillStyle="#aaa48e";c.font="13px system-ui";c.fillText("절기: "+ch.ultimate,205,99);c.fillText(ch.quote,205,124);ui.characterInfo.innerHTML=`<div><b>${ch.name} · ${ch.title}</b><small>${ch.quote}<br>전용 절기: ${ch.ultimate}</small></div><span class="direction-chip">4방향 · 6프레임</span>`};
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
