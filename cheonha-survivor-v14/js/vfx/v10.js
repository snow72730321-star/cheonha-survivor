"use strict";
/* ===== v10 art-directed VFX overhaul ===== */
const VFX10={
 quality(){const q=account?.settings?.quality||"normal";return q==="high"?1.25:q==="low"?.62:1},
 cap(){return Math.floor(320*this.quality())},
 push(v){if(visuals.length>this.cap())return;addVisual(v)},
 palette:{sword:["#e9fbff","#8fd8ed","#ffffff"],spear:["#ffe5a3","#e8a949","#fff6d2"],bow:["#c9f5c8","#76c78c","#fff5a8"],poison:["#e39cff","#7acb72","#d7ff89"],tao:["#a8e7ff","#ffd56d","#fff"],saber:["#ff977b","#c54739","#ffd0a4"],katana:["#f2efff","#a7a5ef","#ffffff"],fist:["#ffd778","#ef984d","#fff1bb"]}
};
function vfxPalette(w=selectedWeapon){return VFX10.palette[w]||VFX10.palette.sword}
function emitCastVfx(w,a,lv=1){const [c1,c2,c3]=vfxPalette(w),x=player.x,y=player.y,q=VFX10.quality();
 if(w==="sword"){VFX10.push({type:"glyph",x,y,r:25+lv*2,life:.26,max:.26,color:c2,spokes:6});VFX10.push({type:"ribbon",x,y,a,r:44+lv*3,life:.2,max:.2,color:c1,width:5})}
 else if(w==="spear"){VFX10.push({type:"windTunnel",x,y,a,r:76+lv*4,life:.24,max:.24,color:c2,width:12});VFX10.push({type:"impact",x:x+Math.cos(a)*18,y:y+Math.sin(a)*18,r:18,life:.16,max:.16,color:c3})}
 else if(w==="bow"){VFX10.push({type:"bowstring",x,y,a,r:40,life:.18,max:.18,color:c3});for(let i=0;i<Math.ceil(2*q);i++)VFX10.push({type:"feather",x:x-Math.cos(a)*12,y:y-Math.sin(a)*12,a:a+Math.PI+(i-.5)*.4,r:22,life:.32,max:.32,color:c2})}
 else if(w==="poison"){VFX10.push({type:"poisonVein",x,y,r:31+lv*2,life:.35,max:.35,color:c2});VFX10.push({type:"glyph",x,y,r:21,life:.3,max:.3,color:c1,spokes:8})}
 else if(w==="tao"){VFX10.push({type:"rune",x,y,r:35+lv*2,life:.34,max:.34,color:c1,spin:1});VFX10.push({type:"sparkCrown",x,y,r:28,life:.22,max:.22,color:c3})}
 else if(w==="saber"){VFX10.push({type:"heavyArc",x,y,a,r:72+lv*4,life:.25,max:.25,color:c1,width:12});VFX10.push({type:"crack",x:x+Math.cos(a)*45,y:y+Math.sin(a)*45,a,r:42,life:.38,max:.38,color:c2})}
 else if(w==="katana"){VFX10.push({type:"focusLine",x,y,a,r:190,life:.16,max:.16,color:c3,width:2});VFX10.push({type:"petalBurst",x,y,a,r:42,life:.42,max:.42,color:c2})}
 else {VFX10.push({type:"pressure",x,y,a,r:62+lv*3,life:.24,max:.24,color:c1});VFX10.push({type:"impact",x:x+Math.cos(a)*28,y:y+Math.sin(a)*28,r:30,life:.22,max:.22,color:c3})}
}
function emitSkillVfx(id,lv=1){const [c1,c2,c3]=vfxPalette(),x=player.x,y=player.y,a=facingAngle();
 const ring=(r,col=c1,life=.45)=>VFX10.push({type:"ornateRing",x,y,r,life,max:life,color:col,spokes:6+Math.min(8,lv)});
 switch(id){
  case "meteor": ring(68+lv*7,c1,.65); VFX10.push({type:"skyGate",x,y,r:110+lv*8,life:.7,max:.7,color:c2}); break;
  case "tenk": ring(120+lv*14,c3,.8); VFX10.push({type:"swordHalo",x,y,r:145+lv*16,life:.9,max:.9,color:c1,count:14+lv*4}); break;
  case "dragonspin": VFX10.push({type:"helix",x,y,r:115+lv*10,life:.55,max:.55,color:c1}); break;
  case "starfall": VFX10.push({type:"skyGate",x,y,r:90+lv*9,life:.55,max:.55,color:c2}); break;
  case "overlord": VFX10.push({type:"dragonSpear",x,y,a,r:Math.max(W,H)*1.1,life:.6,max:.6,color:c1,width:22+lv*4}); break;
  case "arrowrain": VFX10.push({type:"cloudSplit",x,y,r:Math.max(W,H)*.55,life:.8,max:.8,color:c1}); break;
  case "sunmoon": ring(70+lv*8,Math.floor(elapsed)%2?"#b9d8ec":"#ffd465",.65); break;
  case "thousand": VFX10.push({type:"fanBurst",x,y,a,r:125+lv*10,life:.48,max:.48,color:c1,count:14+lv*3}); break;
  case "miasma": VFX10.push({type:"poisonVein",x,y,r:85+lv*12,life:.8,max:.8,color:c2}); break;
  case "lifedeath": ring(150+lv*16,c1,.8); VFX10.push({type:"yinBloom",x,y,r:130+lv*12,life:.8,max:.8,color:c2}); break;
  case "firedragon": VFX10.push({type:"dragonBreath",x,y,a,r:160+lv*12,life:.52,max:.52,color:"#ff8c52"}); break;
  case "icepulse": ring(115+lv*12,"#9eeaff",.42); VFX10.push({type:"iceShardRing",x,y,r:120+lv*12,life:.46,max:.46,color:"#d7f7ff",count:8+lv}); break;
  case "fivethunder": VFX10.push({type:"heavenSeal",x,y,r:140+lv*12,life:.8,max:.8,color:"#c6eaff"}); break;
  case "whirlwind": VFX10.push({type:"bladeStorm",x,y,r:88+lv*10,life:.45,max:.45,color:c1,count:6+lv}); break;
  case "mountain": VFX10.push({type:"earthSplit",x,y,a,r:260+lv*20,life:.65,max:.65,color:c2}); break;
  case "demon": VFX10.push({type:"demonHalo",x,y,r:175+lv*14,life:.85,max:.85,color:"#ff534d"}); break;
  case "moonchain": VFX10.push({type:"moonTrail",x,y,a,r:170+lv*16,life:.55,max:.55,color:c1}); break;
  case "zanshinDrop": VFX10.push({type:"afterimageBlade",x,y,a,r:72+lv*8,life:.55,max:.55,color:c2}); break;
  case "nameless": VFX10.push({type:"screenCut",x,y,a,r:Math.max(W,H)*1.2,life:.7,max:.7,color:c3,count:7+lv}); break;
  case "hundredstep": VFX10.push({type:"pressure",x,y,a,r:180+lv*16,life:.45,max:.45,color:c1}); break;
  case "taijifist": VFX10.push({type:"yinBloom",x,y,r:120+lv*12,life:.65,max:.65,color:c1}); break;
  case "dragonreturn": VFX10.push({type:"dragonBreath",x,y,a,r:Math.max(W,H),life:.75,max:.75,color:c1}); break;
 }
}
const projectileV10=projectile;projectile=function(o){const p=Object.assign({},o);p.vfxWeapon=p.vfxWeapon||selectedWeapon;p.vfxSeed=Math.random()*99;p.vfxAge=0;projectileV10(p)};
const fireBasicV10=fireBasic;fireBasic=function(){const t=nearest();if(t)emitCastVfx(selectedWeapon,Math.atan2(t.y-player.y,t.x-player.x),player.arts[weaponDefs[selectedWeapon].basic.id]||1);fireBasicV10()};
const tickArtsV10=tickArts;tickArts=function(dt){const before={...player.cooldowns};tickArtsV10(dt);for(const [id,now] of Object.entries(player.cooldowns)){if((before[id]??0)<=0&&now>0)emitSkillVfx(id,player.arts[id]||1)}};
const updateProjectilesV10=updateProjectiles;updateProjectiles=function(dt){updateProjectilesV10(dt);const q=VFX10.quality();for(const p of projectiles){p.vfxAge=(p.vfxAge||0)+dt;if(!p.trail||Math.random()>.25*q)continue;const col=p.color||vfxPalette(p.vfxWeapon)[0];if(p.shape==="arrow")VFX10.push({type:"streak",x:p.x,y:p.y,a:Math.atan2(p.vy,p.vx)+Math.PI,r:24,life:.16,max:.16,color:col,width:2});
 else if(p.shape==="spear")VFX10.push({type:"streak",x:p.x,y:p.y,a:Math.atan2(p.vy,p.vx)+Math.PI,r:36,life:.14,max:.14,color:col,width:4});
 else if(p.shape==="crescent")VFX10.push({type:"arcEcho",x:p.x,y:p.y,a:Math.atan2(p.vy,p.vx),r:18+p.r,life:.18,max:.18,color:col,width:3});
 else if(p.shape==="needle")VFX10.push({type:"poisonMote",x:p.x,y:p.y,r:5,life:.22,max:.22,color:col});
 else if(["fire","sun","moon"].includes(p.shape))VFX10.push({type:"ember",x:p.x,y:p.y,r:p.r*.7,life:.25,max:.25,color:col});
 else if(p.shape==="fist")VFX10.push({type:"pressureDot",x:p.x,y:p.y,r:p.r,life:.2,max:.2,color:col});
 else if(p.shape==="sword")VFX10.push({type:"streak",x:p.x,y:p.y,a:Math.atan2(p.vy,p.vx)+Math.PI,r:32,life:.16,max:.16,color:col,width:3})}}
function glowStroke(col,blur,width){ctx.strokeStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur;ctx.lineWidth=width}
function glowFill(col,blur){ctx.fillStyle=col;ctx.shadowColor=col;ctx.shadowBlur=blur}
drawProjectiles=function(){for(const p of projectiles){const s=ws(p.x,p.y),a=Math.atan2(p.vy,p.vx),age=p.vfxAge||0,col=p.color||"#fff";ctx.save();ctx.translate(s.x,s.y);ctx.rotate(a);ctx.lineCap="round";ctx.lineJoin="round";
 if(p.shape==="arrow"){glowStroke(col,8,2.2);ctx.beginPath();ctx.moveTo(-18,0);ctx.lineTo(10,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#f6f2d6";ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(5,-4.5);ctx.lineTo(7,0);ctx.lineTo(5,4.5);ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(-20,-4);ctx.moveTo(-15,0);ctx.lineTo(-20,4);ctx.stroke()}
 else if(p.shape==="spear"){const len=30+p.r;glowStroke(col,11,4.5);ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(10,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff1c4";ctx.beginPath();ctx.moveTo(20,0);ctx.lineTo(7,-7);ctx.lineTo(10,0);ctx.lineTo(7,7);ctx.closePath();ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=1.5;ctx.stroke()}
 else if(p.shape==="crescent"){const rr=Math.max(15,p.r*2.4);ctx.globalCompositeOperation="lighter";glowStroke(col,14,Math.max(5,p.r*.72));ctx.beginPath();ctx.arc(0,0,rr,-1.18,1.18);ctx.stroke();ctx.globalAlpha=.7;ctx.strokeStyle="#fff";ctx.shadowBlur=5;ctx.lineWidth=Math.max(1.6,p.r*.2);ctx.beginPath();ctx.arc(1,0,rr*.95,-1.12,1.12);ctx.stroke();ctx.globalAlpha=.22;ctx.lineWidth=Math.max(2,p.r*.55);ctx.beginPath();ctx.arc(-5,0,rr*.63,-1.05,1.05);ctx.stroke()}
 else if(p.shape==="needle"){glowStroke(col,6,1.5);for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-11,i*2.2);ctx.lineTo(11,i*.6);ctx.stroke()}ctx.fillStyle="#e8ffc8";ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(6,-2.5);ctx.lineTo(6,2.5);ctx.fill()}
 else if(p.shape==="sword"){const z=Math.max(1,p.r/5);ctx.globalCompositeOperation="lighter";glowStroke(col,12+z*2,3.2*z);ctx.beginPath();ctx.moveTo(-17*z,0);ctx.lineTo(10*z,0);ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle="#fff";ctx.beginPath();ctx.moveTo(17*z,0);ctx.lineTo(7*z,-5*z);ctx.lineTo(9*z,0);ctx.lineTo(7*z,5*z);ctx.closePath();ctx.fill();ctx.fillStyle=col;ctx.fillRect(-13*z,-.65*z,20*z,1.3*z)}
 else if(p.shape==="fire"){ctx.rotate(age*8);for(let i=0;i<3;i++){ctx.globalAlpha=.55-i*.14;glowFill(i?"#ff7c42":"#fff1a6",12-i*3);ctx.beginPath();ctx.arc(-i*4,0,p.r*(1-i*.18),0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1}
 else if(p.shape==="sun"){glowFill(col,16);ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff6c5";ctx.lineWidth=2;for(let i=0;i<8;i++){const aa=i*Math.PI/4+age*2;ctx.beginPath();ctx.moveTo(Math.cos(aa)*p.r*1.25,Math.sin(aa)*p.r*1.25);ctx.lineTo(Math.cos(aa)*p.r*1.75,Math.sin(aa)*p.r*1.75);ctx.stroke()}}
 else if(p.shape==="moon"){glowStroke(col,14,5);ctx.beginPath();ctx.arc(0,0,p.r,-1.25,1.25);ctx.stroke();ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(2,0,p.r*.82,-1.18,1.18);ctx.stroke()}
 else if(p.shape==="fist"){ctx.globalCompositeOperation="lighter";glowFill(col,12);ctx.beginPath();ctx.ellipse(0,0,p.r*1.4,p.r*.72,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff0b0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.r*.35,0,p.r*.38,-1.2,1.2);ctx.stroke()}
 else{glowStroke(col,8,3);ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke()}ctx.restore()}}
const drawVisualsBaseV10=drawVisuals;drawVisuals=function(){drawVisualsBaseV10();for(const v of visuals){if(!["glyph","ribbon","windTunnel","impact","bowstring","feather","poisonVein","rune","sparkCrown","heavyArc","crack","focusLine","petalBurst","ornateRing","skyGate","swordHalo","helix","dragonSpear","cloudSplit","fanBurst","yinBloom","dragonBreath","iceShardRing","heavenSeal","bladeStorm","earthSplit","demonHalo","moonTrail","afterimageBlade","screenCut","pressure","streak","arcEcho","poisonMote","ember","pressureDot"].includes(v.type))continue;const alpha=Math.max(0,v.life/v.max),s=ws(v.x,v.y),col=v.color||"#fff";ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=alpha;ctx.lineCap="round";ctx.lineJoin="round";ctx.globalCompositeOperation="lighter";glowStroke(col,10,v.width||3);
 if(v.type==="glyph"||v.type==="ornateRing"){ctx.rotate(elapsed*(v.type==="glyph"?2:-1));ctx.beginPath();ctx.arc(0,0,v.r*(1.08-alpha*.08),0,Math.PI*2);ctx.stroke();const n=v.spokes||8;for(let i=0;i<n;i++){const a=i*Math.PI*2/n;ctx.beginPath();ctx.moveTo(Math.cos(a)*v.r*.7,Math.sin(a)*v.r*.7);ctx.lineTo(Math.cos(a)*v.r,Math.sin(a)*v.r);ctx.stroke()}}
 else if(v.type==="ribbon"||v.type==="heavyArc"||v.type==="arcEcho"){ctx.rotate(v.a||0);ctx.lineWidth=v.width||6;ctx.beginPath();ctx.arc(0,0,v.r,-1.15,1.15);ctx.stroke();ctx.globalAlpha*=.35;ctx.lineWidth*=.42;ctx.beginPath();ctx.arc(-5,0,v.r*.72,-1.1,1.1);ctx.stroke()}
 else if(v.type==="windTunnel"||v.type==="dragonSpear"||v.type==="pressure"){ctx.rotate(v.a||0);ctx.globalAlpha*=.28;ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(0,-(v.width||16));ctx.quadraticCurveTo(v.r*.55,-(v.width||16)*1.5,v.r,0);ctx.quadraticCurveTo(v.r*.55,(v.width||16)*1.5,0,(v.width||16));ctx.closePath();ctx.fill();ctx.globalAlpha=alpha;ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(4,0);ctx.lineTo(v.r,0);ctx.stroke()}
 else if(v.type==="impact"){for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.beginPath();ctx.moveTo(Math.cos(a)*v.r*.3,Math.sin(a)*v.r*.3);ctx.lineTo(Math.cos(a)*v.r*(1.2-alpha*.2),Math.sin(a)*v.r*(1.2-alpha*.2));ctx.stroke()}}
 else if(v.type==="bowstring"){ctx.rotate(v.a||0);ctx.beginPath();ctx.arc(0,0,v.r,-1.1,1.1);ctx.stroke();ctx.beginPath();ctx.moveTo(Math.cos(-1.1)*v.r,Math.sin(-1.1)*v.r);ctx.lineTo(-v.r*.2,0);ctx.lineTo(Math.cos(1.1)*v.r,Math.sin(1.1)*v.r);ctx.stroke()}
 else if(v.type==="feather"){ctx.rotate(v.a||0);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(v.r*.45,-v.r*.25,v.r,0);ctx.quadraticCurveTo(v.r*.45,v.r*.25,0,0);ctx.stroke()}
 else if(v.type==="poisonVein"){for(let i=0;i<7;i++){const a=i*Math.PI*2/7+elapsed*.5,r=v.r*(.25+(i%3)*.18);ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.35,Math.sin(a)*r*.35);ctx.bezierCurveTo(Math.cos(a+.5)*r*.7,Math.sin(a+.5)*r*.7,Math.cos(a-.4)*r,Math.sin(a-.4)*r,Math.cos(a)*r*1.25,Math.sin(a)*r*1.25);ctx.stroke()}}
 else if(v.type==="rune"||v.type==="heavenSeal"){ctx.rotate(elapsed*(v.spin||.8));ctx.beginPath();ctx.arc(0,0,v.r,0,Math.PI*2);ctx.stroke();ctx.rotate(-elapsed*1.7);ctx.strokeRect(-v.r*.5,-v.r*.5,v.r,v.r);for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(v.r*.55,0);ctx.lineTo(v.r,0);ctx.stroke()}}
 else if(v.type==="sparkCrown"){for(let i=0;i<8;i++){const a=i*Math.PI/4+elapsed*4;ctx.beginPath();ctx.moveTo(Math.cos(a)*v.r*.5,Math.sin(a)*v.r*.5);ctx.lineTo(Math.cos(a)*v.r,Math.sin(a)*v.r);ctx.stroke()}}
 else if(v.type==="crack"||v.type==="earthSplit"){ctx.rotate(v.a||0);for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(0,i*5);for(let k=1;k<7;k++)ctx.lineTo(k*v.r/7,(i*5)+(Math.random()-.5)*12);ctx.stroke()}}
 else if(v.type==="focusLine"||v.type==="streak"){ctx.rotate(v.a||0);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(v.r,0);ctx.stroke()}
 else if(v.type==="petalBurst"){for(let i=0;i<9;i++){const a=i*Math.PI*2/9+(v.a||0),r=v.r*(1-alpha*.5);ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(r,0,7,2,0,0,Math.PI*2);ctx.stroke();ctx.restore()}}
 else if(v.type==="skyGate"||v.type==="cloudSplit"){ctx.beginPath();ctx.arc(0,0,v.r,Math.PI,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.3;ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,v.r,Math.PI,Math.PI*2);ctx.fill()}
 else if(v.type==="swordHalo"||v.type==="bladeStorm"){const n=v.count||12;for(let i=0;i<n;i++){const a=i*Math.PI*2/n+elapsed*1.5,r=v.r;ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(10,0);ctx.stroke();ctx.restore()}}
 else if(v.type==="helix"){for(let j=0;j<2;j++){ctx.beginPath();for(let i=0;i<28;i++){const t=i/27*Math.PI*2.2,r=v.r*i/27,x=Math.cos(t+j*Math.PI+elapsed*5)*r,y=Math.sin(t+j*Math.PI+elapsed*5)*r*.45;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}}
 else if(v.type==="fanBurst"){ctx.rotate(v.a||0);const n=v.count||16;for(let i=0;i<n;i++){const aa=(i-(n-1)/2)*.055;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(aa)*v.r,Math.sin(aa)*v.r);ctx.stroke()}}
 else if(v.type==="yinBloom"){ctx.beginPath();ctx.arc(0,0,v.r,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(-v.r*.25,0,v.r*.25,0,Math.PI*2);ctx.arc(v.r*.25,0,v.r*.25,0,Math.PI*2);ctx.stroke()}
 else if(v.type==="dragonBreath"){ctx.rotate(v.a||0);ctx.beginPath();for(let i=0;i<18;i++){const x=i*v.r/18,y=Math.sin(i*.9+elapsed*8)*12*(1-i/22);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.lineWidth=10*alpha+2;ctx.stroke()}
 else if(v.type==="iceShardRing"){const n=v.count||10;for(let i=0;i<n;i++){const a=i*Math.PI*2/n,r=v.r;ctx.save();ctx.rotate(a);ctx.translate(r,0);ctx.beginPath();ctx.moveTo(-9,-3);ctx.lineTo(12,0);ctx.lineTo(-9,3);ctx.closePath();ctx.stroke();ctx.restore()}}
 else if(v.type==="demonHalo"){ctx.beginPath();ctx.arc(0,0,v.r,0,Math.PI*2);ctx.stroke();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(Math.cos(a)*v.r*.65,Math.sin(a)*v.r*.65);ctx.lineTo(Math.cos(a)*v.r*1.12,Math.sin(a)*v.r*1.12);ctx.stroke()}}
 else if(v.type==="moonTrail"){ctx.rotate(v.a||0);for(let i=0;i<4;i++){ctx.globalAlpha=alpha*(1-i*.18);ctx.beginPath();ctx.arc(i*18,0,v.r-i*12,-.9,.9);ctx.stroke()}}
 else if(v.type==="afterimageBlade"){ctx.rotate(v.a||0);ctx.globalAlpha*=.4;for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-i*10,0,v.r-i*8,-1,1);ctx.stroke()}}
 else if(v.type==="screenCut"){ctx.rotate(v.a||0);const n=v.count||8;for(let i=0;i<n;i++){const off=(i-(n-1)/2)*22;ctx.beginPath();ctx.moveTo(-v.r*.5,off);ctx.lineTo(v.r*.5,off+(i%2?18:-18));ctx.stroke()}}
 else if(v.type==="poisonMote"||v.type==="ember"||v.type==="pressureDot"){glowFill(col,8);ctx.beginPath();ctx.arc(0,0,v.r*(.6+alpha*.4),0,Math.PI*2);ctx.fill()}ctx.restore()}}
