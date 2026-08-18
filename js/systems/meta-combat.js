"use strict";
// Pixel render replacements. Character bodies never rotate.
/**
 * 외부 스프라이트가 아직 로드되지 않았을 때만 쓰는 안전한 플레이어 대체 렌더러.
 * 캐릭터를 숨기는 무적 점멸과 머리 위 문자 화살표를 사용하지 않는다.
 */
drawPlayer=function(){
  const dir=facingDir();
  const frame=player.moving?Math.floor(elapsed*8)%2:0;
  const x=W/2,y=H/2,z=mobileCameraScale(),a=facingAngle();
  player.dir=dir;

  // 발밑 방향 링을 본체보다 먼저 그린다.
  ctx.save();
  ctx.translate(x,y+17*z);
  ctx.scale(1,.42);
  ctx.strokeStyle="rgba(185,226,240,.22)";
  ctx.lineWidth=2*z;
  ctx.beginPath();ctx.arc(0,0,21*z,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle="rgba(215,247,255,.9)";
  ctx.lineWidth=3*z;
  ctx.beginPath();ctx.arc(0,0,21*z,a-.58,a+.58);ctx.stroke();
  ctx.restore();

  const tipX=x+Math.cos(a)*21*z;
  const tipY=y+17*z+Math.sin(a)*21*z*.42;
  ctx.save();ctx.translate(tipX,tipY);ctx.rotate(a);
  ctx.fillStyle="rgba(215,247,255,.92)";
  ctx.beginPath();ctx.moveTo(6*z,0);ctx.lineTo(-3.5*z,-3*z);ctx.lineTo(-2*z,0);ctx.lineTo(-3.5*z,3*z);ctx.closePath();ctx.fill();ctx.restore();

  ctx.save();
  ctx.imageSmoothingEnabled=false;
  drawPixelHero(ctx,x,y,selectedWeapon,dir,frame,3*z);
  if(player.shield>0){ctx.strokeStyle="rgba(180,235,255,.7)";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,27*z,0,Math.PI*2);ctx.stroke()}
  ctx.restore();
};
drawEnemies=function(){for(const e of enemies){if(e.dead)continue;const s=ws(e.x,e.y);if(s.x<-100||s.x>W+100||s.y<-100||s.y>H+100)continue;drawPixelEnemy(ctx,e,s.x,s.y);if(e.poisonTime>0){ctx.strokeStyle="rgba(174,110,194,.8)";ctx.lineWidth=2;ctx.strokeRect(s.x-e.r,s.y-e.r,e.r*2,e.r*2)}if(e.type==="boss"||e.type==="midboss"||e.hp<e.maxHp){const bw=Math.max(28,e.r*2.2);ctx.fillStyle="rgba(0,0,0,.55)";ctx.fillRect(s.x-bw/2,s.y-e.r-17,bw,5);ctx.fillStyle=e.type==="boss"?"#b8473e":e.type==="midboss"?"#d98f4b":"#d9b95f";ctx.fillRect(s.x-bw/2,s.y-e.r-17,bw*Math.max(0,e.hp/e.maxHp),5);if(e.type==="midboss"){ctx.fillStyle="#f2d895";ctx.font="10px system-ui";ctx.textAlign="center";ctx.fillText(e.bossName,s.x,s.y-e.r-22)}}}}
function drawBossArrows(){for(const e of enemies.filter(x=>!x.dead&&(x.type==="boss"||x.type==="midboss"))){const s=ws(e.x,e.y),margin=55;if(s.x>margin&&s.x<W-margin&&s.y>margin&&s.y<H-margin)continue;const dx=s.x-W/2,dy=s.y-H/2,a=Math.atan2(dy,dx),rx=W/2-margin,ry=H/2-margin,t=Math.min(rx/Math.max(1,Math.abs(Math.cos(a))),ry/Math.max(1,Math.abs(Math.sin(a)))),x=W/2+Math.cos(a)*t,y=H/2+Math.sin(a)*t,scale=account.settings?.bossArrowSize||1;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.scale(scale,scale);ctx.fillStyle=e.type==="boss"?"#ff6e66":"#f0c466";ctx.beginPath();ctx.moveTo(16,0);ctx.lineTo(-9,-10);ctx.lineTo(-5,0);ctx.lineTo(-9,10);ctx.closePath();ctx.fill();ctx.strokeStyle="#1b120e";ctx.stroke();ctx.rotate(-a);ctx.fillStyle="#fff3c9";ctx.font="bold 10px system-ui";ctx.textAlign="center";ctx.fillText(e.bossName||(e.type==="boss"?"혈마":"보스"),0,24);ctx.restore()}}
const baseDraw=draw;draw=function(){const ss=screenShake;screenShake=ss*(account.settings?.shake??1);baseDraw();screenShake=ss;if(state==="playing"||state==="paused")drawBossArrows()};

function checkAchievements(){ensureV6Account();let changed=false;for(const a of achievementDefs){if(account.achievements[a.id])continue;if(a.value()>=a.goal){account.achievements[a.id]=true;account.gold+=a.reward;changed=true;showMessage(`업적 달성 · ${a.name} (+${a.reward} 금자)`,2.5)}}if(changed)saveAccountData()}
function renderAchievements(){ensureV6Account();checkAchievements();ui.achievementList.innerHTML=achievementDefs.map(a=>{const v=Math.min(a.goal,a.value()),done=!!account.achievements[a.id];return`<div class="collection-card ${done?"unlocked":""}"><b>${done?"✓ ":""}${a.name}</b><p>${a.desc}<br>보상 ${a.reward} 금자</p><div class="achievement-progress"><span style="width:${v/a.goal*100}%"></span></div><p>${v}/${a.goal}</p></div>`}).join("")}
