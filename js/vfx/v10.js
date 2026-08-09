"use strict";
/* ===== v14.6.9 sprite-first VFX compatibility =====
 * The old v10 layer used to wrap fireBasic()/tickArts() and inject decorative
 * Canvas geometry (glyph/rune/sparkCrown/ribbons/etc.) by guessing which skill
 * had fired. That behavior caused duplicate/ghost VFX after sprite-based VFX
 * were introduced. The automatic procedural layer is intentionally disabled.
 *
 * Kept here only:
 *  - projectile metadata used by the renderer
 *  - the polished projectile renderer itself
 *
 * Gameplay telegraphs, hazards, fields, shields and directly requested skill
 * VFX are owned by their actual gameplay/render modules and are unaffected.
 */
const VFX10={
 quality(){const q=account?.settings?.quality||"normal";return q==="high"?1.25:q==="low"?.62:1},
 palette:{sword:["#e9fbff","#8fd8ed","#ffffff"],spear:["#ffe5a3","#e8a949","#fff6d2"],bow:["#c9f5c8","#76c78c","#fff5a8"],poison:["#e39cff","#7acb72","#d7ff89"],tao:["#a8e7ff","#ffd56d","#fff"],saber:["#ff977b","#c54739","#ffd0a4"],katana:["#f2efff","#a7a5ef","#ffffff"],fist:["#ffd778","#ef984d","#fff1bb"]}
};
function vfxPalette(w=selectedWeapon){return VFX10.palette[w]||VFX10.palette.sword}

// Manual sprite-only compatibility helper. It never runs automatically and never creates Canvas geometry.
// New/reworked skills should call their registered sprite VFX directly from gameplay code; this dispatcher exists only for unmigrated legacy skills.
function emitSkillVfx(id,lv=1){const [c1,c2,c3]=vfxPalette(),x=player.x,y=player.y,a=facingAngle();
 switch(id){
  case "meteor": addVisual({type:"skillSwordMeteor",x,y,r:82+lv*7,life:.9,max:.9,color:c1}); break;
  case "tenk": addVisual({type:"skillSwordTenk",x,y,r:120+lv*15,life:.85,max:.85,color:c1}); break;
  case "dragonspin": addVisual({type:"skillSpearSpin",x,y,r:112+lv*11,life:.52,max:.52,color:c1}); break;
  case "starfall": addVisual({type:"skillSpearStarfall",x,y,r:80+lv*9,life:.6,max:.6,color:c2}); break;
  case "arrowrain": addVisual({type:"skillBowArrowRain",x,y,r:Math.max(W,H)*.48,life:.8,max:.8,color:c1}); break;
  case "sunmoon": addVisual({type:"skillBowSunMoon",x,y,r:84+lv*9,life:.68,max:.68,color:c1}); break;
  case "thousand": addVisual({type:"skillPoisonThousand",x,y,a,r:135+lv*11,life:.5,max:.5,color:c1}); break;
  case "miasma": addVisual({type:"skillPoisonMiasma",x,y,r:88+lv*12,life:.82,max:.82,color:c2}); break;
  case "icepulse": addVisual({type:"skillTaoIceArray",x,y,r:118+lv*13,life:.48,max:.48,color:"#9eeaff"}); break;
  case "mountain": if(!((player.saberUnityTimer||0)>0&&player.saberUnityTrue))addVisual({type:"skillSaberMountain",x,y,a,r:260+lv*20,life:.68,max:.68,color:c2,width:30+lv*3}); break;
  case "moonchain": addVisual({type:"skillKatanaMoonChain",x,y,a,r:180+lv*17,life:.56,max:.56,color:c1,width:28}); break;
  case "zanshinDrop": addVisual({type:"skillKatanaZanshin",x,y,a,r:75+lv*8,life:.58,max:.58,color:c2}); break;
  case "nameless": {const len=Math.max(W,H)*1.3;addVisual({type:"namelessCutV1454",x1:x-Math.cos(a)*len*.5,y1:y-Math.sin(a)*len*.5,x2:x+Math.cos(a)*len*.5,y2:y+Math.sin(a)*len*.5,width:7+lv*.7,life:.24,max:.24,color:c3,phase:0});break;}
  case "hundredstep": addVisual({type:"skillFistHundredStep",x,y,a,r:190+lv*17,life:.48,max:.48,color:c1,width:28}); break;
  case "taijifist": addVisual({type:"skillFistTaiji",x,y,r:125+lv*13,life:.68,max:.68,color:c1}); break;
  case "dragonreturn": addVisual({type:"skillFistDragonReturn",x,y,a,r:Math.max(W,H),life:.78,max:.78,color:c1,width:36}); break;
 }
}

// Preserve projectile metadata only. No automatic cast/skill/trail VFX are injected.
const projectileV10=projectile;
projectile=function(o){
 const p=Object.assign({},o);
 p.vfxWeapon=p.vfxWeapon||selectedWeapon;
 p.vfxSeed=Math.random()*99;
 p.vfxAge=0;
 projectileV10(p);
};
const updateProjectilesV10=updateProjectiles;
updateProjectiles=function(dt){
 updateProjectilesV10(dt);
 for(const p of projectiles)p.vfxAge=(p.vfxAge||0)+dt;
};

function glowStroke(col,blur,width){ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur;ctx.lineWidth=width}
function glowFill(col,blur){ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur}

// Projectile appearance is not a legacy overlay: it replaces the base projectile drawing.
drawProjectiles=function(){for(const p of projectiles){const s=ws(p.x,p.y),a=Math.atan2(p.vy,p.vx),age=p.vfxAge||0,col=p.color||"#fff";ctx.save();ctx.translate(s.x,s.y);ctx.rotate(a);ctx.lineCap="round";ctx.lineJoin="round";
 if(p.shape==="ultimateArrow"){
   const z=Math.max(1.25,p.r/7);ctx.globalCompositeOperation="lighter";
   glowStroke(p.accentColor||"#ff6d52",18,8*z);ctx.globalAlpha=.34;ctx.beginPath();ctx.moveTo(-42*z,0);ctx.lineTo(8*z,0);ctx.stroke();
   ctx.globalAlpha=.95;glowStroke("#ffe998",10,4.8*z);ctx.beginPath();ctx.moveTo(-36*z,0);ctx.lineTo(13*z,0);ctx.stroke();
   ctx.globalAlpha=1;ctx.shadowBlur=5;ctx.fillStyle="#fff7cf";ctx.beginPath();ctx.moveTo(25*z,0);ctx.lineTo(8*z,-10*z);ctx.lineTo(12*z,0);ctx.lineTo(8*z,10*z);ctx.closePath();ctx.fill();
   ctx.fillStyle=p.accentColor||"#ff6d52";ctx.beginPath();ctx.moveTo(-34*z,0);ctx.lineTo(-51*z,-9*z);ctx.lineTo(-45*z,0);ctx.lineTo(-51*z,9*z);ctx.closePath();ctx.fill();
   ctx.globalAlpha=.9;ctx.strokeStyle="#fff5bd";ctx.lineWidth=1.7*z;ctx.beginPath();ctx.moveTo(-22*z,-5*z);ctx.lineTo(7*z,-2*z);ctx.moveTo(-22*z,5*z);ctx.lineTo(7*z,2*z);ctx.stroke();
 }else if(p.shape==="arrow"){glowStroke(col,8,2.2);ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(10,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#f6f2d6";ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(5,-4.5);ctx.lineTo(7,0);ctx.lineTo(5,4.5);ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(-20,-4);ctx.moveTo(-15,0);ctx.lineTo(-20,4);ctx.stroke()}
 else if(p.shape==="spear"){const len=30+p.r;glowStroke(col,11,4.5);ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(10,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff1c4";ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(7,-7);ctx.lineTo(10,0);ctx.lineTo(7,7);ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke()}
 else if(p.shape==="crescent"){const rr=Math.max(15,p.r*2.4);ctx.globalCompositeOperation="lighter";glowStroke(col,14,Math.max(5,p.r*.72));ctx.beginPath();ctx.arc(0,0,rr,-1.18,1.18);ctx.stroke();ctx.globalAlpha=.7;ctx.strokeStyle="#fff";ctx.shadowBlur=5;ctx.lineWidth=Math.max(1.6,p.r*.2);ctx.beginPath();ctx.arc(1,0,rr*.95,-1.12,1.12);ctx.stroke();ctx.globalAlpha=.22;ctx.lineWidth=Math.max(2,p.r*.55);ctx.beginPath();ctx.arc(-5,0,rr*.63,-1.05,1.05);ctx.stroke()}
 else if(p.shape==="needle"){glowStroke(col,6,1.5);for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-11,i*2.2);ctx.lineTo(11,i*.6);ctx.stroke()}ctx.fillStyle="#e8ffc8";ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(6,-2.5);ctx.lineTo(6,2.5);ctx.fill()}
 else if(p.shape==="sword"){const z=Math.max(1,p.r/5);ctx.globalCompositeOperation="lighter";glowStroke(col,12+z*2,3.2*z);ctx.beginPath();ctx.moveTo(-17*z,0);ctx.lineTo(10*z,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(17*z,0);ctx.lineTo(7*z,-5*z);ctx.lineTo(9*z,0);ctx.lineTo(7*z,5*z);ctx.closePath();ctx.fill();ctx.fillStyle=col;ctx.fillRect(-13*z,-.65*z,20*z,1.3*z)}
 else if(p.shape==="fire"){ctx.rotate(age*8);for(let i=0;i<3;i++){ctx.globalAlpha=.55-i*.14;glowFill(i?"#ff7c42":"#fff1a6",12-i*3);ctx.beginPath();ctx.arc(-i*4,0,p.r*(1-i*.18),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
 else if(p.shape==="sun"){glowFill(col,16);ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff6c5";ctx.lineWidth=2;for(let i=0;i<8;i++){const aa=i*Math.PI/4+age*2;ctx.beginPath();ctx.moveTo(Math.cos(aa)*p.r*1.25,Math.sin(aa)*p.r*1.25);ctx.lineTo(Math.cos(aa)*p.r*1.75,Math.sin(aa)*p.r*1.75);ctx.stroke()}}
 else if(p.shape==="moon"){glowStroke(col,14,5);ctx.beginPath();ctx.arc(0,0,p.r,-1.25,1.25);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(2,0,p.r*.82,-1.18,1.18);ctx.stroke()}
 else if(p.shape==="fist"){ctx.globalCompositeOperation="lighter";glowFill(col,12);ctx.beginPath();ctx.ellipse(0,0,p.r*1.4,p.r*.72,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff0b0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.r*.35,0,p.r*.38,-1.2,1.2);ctx.stroke()}
 else{glowStroke(col,8,3);ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke()}ctx.restore()}};
