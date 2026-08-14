"use strict";
/* 왜도 리메이크 1차: 경화수월 제외. 월은신도/월흔/월은화/만월화/극월/발월/월영참/월하유성보/참월·절월/극·시공절. */
(()=>{
const KPATH="assets/vfx/skills/katana/";
const UI_PATH="assets/ui/katana/";
const uiAsset=n=>["full_moon_stack.png","moonflower.png","star_sheet.png","star_ring.png","moon_scar_stack.png"].includes(n);
const assetPath=n=>(uiAsset(n)?UI_PATH:KPATH)+n;
const assetStore=(typeof GameAssets!=="undefined"?GameAssets:window.GameAssets);
const img=n=>assetStore?.image(assetPath(n));
const KATANA_ASSETS=["full_moon_stack.png","full_moon.gif","moonflower.png","star_sheet.png","star_ring.png","moon_scar_stack.png","moon_scar_burst.gif","moon_execute.gif","silver_moon_hit.gif","balwol.gif","balwol_echo.gif","moon_sword_1.gif","moon_sword_2.gif","moon_sword_3.gif","chamwol.gif","jeolwol.gif","moon_buff.gif","time_space_cut.gif","gyeonghwa_suwol.gif"];
Promise.all(KATANA_ASSETS.map(n=>assetStore?.load(assetPath(n)))).catch(()=>{});
const katanaSource=s=>["balwol","balwolEcho","moonForm1","moonForm2","moonForm3","moonMeteor"].includes(s);
const noSilverSource=s=>["silverMoon","moonScarBurst","moonExecute","chamwol","jeolwol","timeSpaceCut"].includes(s);
function initKatanaState(){Object.assign(player,{moonFlowerStacks:0,moonFlowerLock:0,moonPhase:0,extremeMoonStacks:0,katanaScarTriggers:0,katanaMoonFormCycles:0,katanaMoonFormActive:false,katanaMoonFormStep:0,katanaMoonFormTimer:0,katanaEchoQueue:[],katanaHiddenQueue:[],katanaDodgeCharge:0,moonMeteorBuff:0,timeSpaceBuff:0,katanaDamageBonus:0,katanaLifeSteal:0,katanaJeolwolUses:0,gyeonghwaTimer:0});}
const _reset=resetGame;resetGame=function(){_reset();initKatanaState()};
function flowerGain(){if(selectedWeapon!=="katana"||(player.moonFlowerLock||0)>0)return;player.moonFlowerStacks=Math.min(3,(player.moonFlowerStacks||0)+1);if(player.moonFlowerStacks>=3&&(player.arts?.moonchain||0)>0&&!player.katanaMoonFormActive)startMoonForms();}
function scarTrigger(){player.katanaScarTriggers=(player.katanaScarTriggers||0)+1;flowerGain()}
function vfx(type,x,y,life=.7,o={}){addVisual(Object.assign({type,x,y,life,max:life,color:"#eaf6ff"},o))}
function addScar(e,n=1){if(!e||e.dead)return;e.moonScar=Math.min(3,(e.moonScar||0)+n)}
function executeThreshold(stacks){return stacks>=3?.10:stacks===2?.06:stacks===1?.03:0}
const _damage=damageEnemy;
damageEnemy=function(e,dmg,source,opt={}){
 if(e.dead)return 0;
 const eligible=selectedWeapon==="katana"&&katanaSource(source)&&!opt.katanaNoSilver&&!noSilverSource(source);
 // 3월흔은 다음 일반 왜도 타격에서 먼저 폭발한다. 경화수월 미적용이므로 0으로 초기화.
 if(eligible&&(e.moonScar||0)>=3){e.moonScar=(player.gyeonghwaTimer||0)>0?1:0;vfx("katanaScarBurst",e.x,e.y,.99,{r:78});_damage(e,Math.max(1,dmg*1.8),"moonScarBurst",{katanaNoSilver:true,skipImpactVfx:true,color:"#dff7ff"});scarTrigger();}
 if(e.dead)return 0;
 const silver=eligible&&Math.random()<Math.min(.70,Math.max(0,player.critChance+(player.moonMeteorBuff>0?.20:0)));
 let scaled=dmg*(1+(player.katanaDamageBonus||0))*(player.timeSpaceBuff>0?1.35:1)*(silver?1.60:1);
 const dealt=_damage(e,scaled,source,Object.assign({},opt,{katanaNoSilver:!silver}));
 if(selectedWeapon==="katana"&&dealt>0&&(player.katanaLifeSteal||0)>0){const cap=player.maxHp*.08/60;player.hp=Math.min(player.maxHp,player.hp+Math.min(cap,dealt*player.katanaLifeSteal));}
 if(silver&&dealt>0){vfx("katanaSilverHit",e.x,e.y,.36,{r:46});addVisual({type:"katanaSilverDamage",x:e.x,y:e.y-24,text:Math.round(dealt).toLocaleString(),life:.62,max:.62,color:"#f8fdff"});if(!e.dead)addScar(e,1);}
 if(!e.dead&&(e.moonScar||0)>0&&e.hp/e.maxHp<=executeThreshold(e.moonScar)){
   const boss=e.type==="boss"||e.type==="midboss";
   vfx("katanaExecute",e.x,e.y,.63,{r:92});
   if(boss)_damage(e,Math.max(e.maxHp*.035,scaled*2.2),"moonExecute",{katanaNoSilver:true,skipImpactVfx:true,color:"#f3fbff"});
   else {e.hp=0;killEnemy(e,"moonExecute",{katanaNoSilver:true});}
   e.moonScar=0;scarTrigger();
 }
 return dealt;
};
// 발월: 본참격 + 같은 월드 궤적에 지연참격. 공격속도는 이 기본기에만 직접 반영.
const _fire=fireBasic;fireBasic=function(){if(selectedWeapon!=="katana")return _fire();const t=nearest();if(!t)return;const lv=player.arts.iai||1,a=Math.atan2(t.y-player.y,t.x-player.x),len=(260+lv*22)*player.areaMul,width=(13+lv*1.7)*Math.sqrt(player.areaMul),dmg=26+lv*8,x=player.x,y=player.y;player.facing=a;lineHit(x,y,x+Math.cos(a)*len,y+Math.sin(a)*len,width,dmg,"balwol",{skipVisual:true,shake:4,color:C.katana});vfx("katanaBalwol",x+Math.cos(a)*len*.46,y+Math.sin(a)*len*.46,.72,{a,r:len,width});const echoes=Math.min(4,1+Math.floor((lv-1)/2));for(let i=0;i<echoes;i++)player.katanaEchoQueue.push({t:.16+i*Math.max(.08,.14-lv*.006),x,y,a,len,width,dmg:dmg*(.62+.04*lv)});if((player.gyeonghwaTimer||0)>0){const glv=player.arts?.voidslash||1,gm=[0,.45,.55,.65][glv]||.45;player.katanaEchoQueue.push({t:.11,x,y,a,len,width,dmg:dmg*gm,gyeonghwa:true});}player.fireTimer=Math.max(.38,.88-lv*.045)*(player.timeSpaceBuff>0?.8:1)};
function startMoonForms(){player.katanaMoonFormActive=true;player.katanaMoonFormStep=1;player.katanaMoonFormTimer=.03;}
function castMoonForm(step){const lv=player.arts.moonchain||1,a=facingAngle(),len=(310+lv*24)*player.areaMul,width=(22+lv*3)*Math.sqrt(player.areaMul),mul=[0,1.4,1.8,2.6][step],dmg=(25+lv*9)*mul;lineHit(player.x-Math.cos(a)*len*.35,player.y-Math.sin(a)*len*.35,player.x+Math.cos(a)*len*.65,player.y+Math.sin(a)*len*.65,width,dmg,"moonForm"+step,{skipVisual:true,shake:4+step,color:"#edf8ff"});vfx("katanaMoonForm"+step,player.x+Math.cos(a)*len*.18,player.y+Math.sin(a)*len*.18,[.9,.48,.72,.72][step],{a,r:len,width});player.moonFlowerStacks=Math.max(0,(player.moonFlowerStacks||0)-1);}
function gainMoonPhase(){if(!(player.arts?.nameless>0))return;player.moonPhase=Math.min(5,(player.moonPhase||0)+1);castChamwol(player.moonPhase);if(player.moonPhase>=5)player.katanaHiddenQueue.push({t:.62,type:"jeolwol"});}
function castChamwol(count){const target=visibleEnemies(0).sort((a,b)=>b.hp-a.hp)[0];if(!target)return;for(let i=0;i<count;i++){const a=(i%2?-.72:.72)+(i-count/2)*.13,len=Math.max(W,H)*1.5,x1=target.x-Math.cos(a)*len*.5,y1=target.y-Math.sin(a)*len*.5,x2=target.x+Math.cos(a)*len*.5,y2=target.y+Math.sin(a)*len*.5;player.katanaHiddenQueue.push({t:i*.09,type:"chamwol",x1,y1,x2,y2,a,damage:54+(player.arts.nameless||1)*18});}}
function startGyeonghwa(){const lv=player.arts?.voidslash||0;if(lv<=0)return;player.gyeonghwaTimer=5+lv;vfx("katanaGyeonghwaStart",player.x,player.y,1.35,{followPlayer:true,r:105});showMessage("경화수월",.9)}
function castJeolwol(){vfx("katanaJeolwol",player.x,player.y,2.6,{screen:true,r:Math.max(W,H)});for(const e of visibleEnemies(-120))if(!e.dead)_damage(e,150+(player.arts.nameless||1)*55,"jeolwol",{katanaNoSilver:true,skipImpactVfx:true,color:"#f7fbff",shake:10});player.moonPhase=0;player.katanaJeolwolUses=(player.katanaJeolwolUses||0)+1;if((player.arts?.voidslash||0)>0){gainExtremeMoon();startGyeonghwa()}showMessage("절월 · 만월절단",1.2)}
function gainExtremeMoon(){if((player.extremeMoonStacks||0)>=24)return;player.extremeMoonStacks++;player.critChance+=.0075;player.katanaDamageBonus=(player.katanaDamageBonus||0)+.0125;player.katanaLifeSteal=(player.katanaLifeSteal||0)+.0015;player.dodgeCooldownMul*=.995;}
// 월하유성보: 회피 3점, 정밀회피는 2점.
const _dodge=performDodge;performDodge=function(){const before=player.metrics?.dodges||0,pb=player.metrics?.perfectDodges||0,ox=player.x,oy=player.y;_dodge();if(selectedWeapon!=="katana"||(player.metrics?.dodges||0)<=before)return;const perfect=(player.metrics?.perfectDodges||0)>pb;player.katanaDodgeCharge=(player.katanaDodgeCharge||0)+(perfect?2:1);if(perfect&&(player.gyeonghwaTimer||0)>0){const glv=player.arts?.voidslash||1,gm=[0,.45,.55,.65][glv]||.45;aoe(ox,oy,82,34*gm,"gyeonghwaEcho",{skipVisual:true,katanaNoSilver:true,color:"#edfaff",shake:2});vfx("katanaGyeonghwaEcho",ox,oy,.72,{a:player.facing||0,r:190})}if((player.arts?.zanshin||0)>0&&player.katanaDodgeCharge>=3){player.katanaDodgeCharge-=3;player.moonMeteorBuff=4.5+.35*player.arts.zanshin;player.dodgeCooldown=Math.max(.55,player.dodgeCooldown*(1-Math.min(.22,.08+player.arts.zanshin*.025)));vfx("katanaMoonBuff",player.x,player.y,1.44,{followPlayer:true,r:105});aoe(player.x,player.y,72+player.arts.zanshin*7,18+player.arts.zanshin*8,"moonMeteor",{skipVisual:true,color:"#e9f7ff",shake:4});showMessage("월하유성보",.75)}};
// 기존 왜도 자동 arts를 억제하고 새 자원 루프를 진행한다.
const _tick=tickArts;tickArts=function(dt){if(selectedWeapon!=="katana")return _tick(dt);const a=player.arts,save=[a.moonchain,a.zanshin,a.nameless];a.moonchain=0;a.zanshin=0;a.nameless=0;_tick(dt);[a.moonchain,a.zanshin,a.nameless]=save;player.moonFlowerLock=Math.max(0,(player.moonFlowerLock||0)-dt);player.moonMeteorBuff=Math.max(0,(player.moonMeteorBuff||0)-dt);player.timeSpaceBuff=Math.max(0,(player.timeSpaceBuff||0)-dt);player.gyeonghwaTimer=Math.max(0,(player.gyeonghwaTimer||0)-dt);
 for(const q of player.katanaEchoQueue||[])q.t-=dt;while(player.katanaEchoQueue?.length&&player.katanaEchoQueue[0].t<=0){const q=player.katanaEchoQueue.shift();const src=q.gyeonghwa?"gyeonghwaEcho":"balwolEcho";lineHit(q.x,q.y,q.x+Math.cos(q.a)*q.len,q.y+Math.sin(q.a)*q.len,q.width,q.dmg,src,{skipVisual:true,katanaNoSilver:!!q.gyeonghwa,shake:q.gyeonghwa?1:2,color:C.katana});vfx(q.gyeonghwa?"katanaGyeonghwaEcho":"katanaBalwolEcho",q.x+Math.cos(q.a)*q.len*.48,q.y+Math.sin(q.a)*q.len*.48,.72,{a:q.a,r:q.len,width:q.width});}
 if(player.katanaMoonFormActive){player.katanaMoonFormTimer-=dt;if(player.katanaMoonFormTimer<=0){castMoonForm(player.katanaMoonFormStep);player.katanaMoonFormStep++;if(player.katanaMoonFormStep>3){player.katanaMoonFormActive=false;player.katanaMoonFormCycles=(player.katanaMoonFormCycles||0)+1;player.moonFlowerLock=Math.max(2.75,4.85-(player.arts.moonchain||1)*.35);gainMoonPhase()}else player.katanaMoonFormTimer=.22;}}
 for(const q of player.katanaHiddenQueue||[])q.t-=dt;while(player.katanaHiddenQueue?.length&&player.katanaHiddenQueue[0].t<=0){const q=player.katanaHiddenQueue.shift();if(q.type==="chamwol"){lineHit(q.x1,q.y1,q.x2,q.y2,16,q.damage,"chamwol",{skipVisual:true,katanaNoSilver:true,shake:5,color:"#f4fbff"});vfx("katanaChamwol",(q.x1+q.x2)/2,(q.y1+q.y2)/2,.48,{a:q.a,r:Math.hypot(q.x2-q.x1,q.y2-q.y1)})}else if(q.type==="jeolwol")castJeolwol();}
};
// 극·시공절: 화면 전체 1타 + 월흔 확정 +1 + 만월화 강제 다음 단계 + 10초 강화.
const _ultimate=ultimateAttack;ultimateAttack=function(){if(selectedWeapon!=="katana")return _ultimate();vfx("katanaTimeSpaceCut",player.x,player.y,1.4,{screen:true,r:Math.max(W,H)});for(const e of visibleEnemies(-140)){if(e.dead)continue;_damage(e,112,"timeSpaceCut",{katanaNoSilver:true,skipImpactVfx:true,color:"#f1f8ff",shake:8});if(!e.dead)addScar(e,1)}player.timeSpaceBuff=10;if((player.arts?.nameless||0)>0){if((player.moonPhase||0)>=5){castJeolwol();player.moonPhase=1}else gainMoonPhase()}showMessage("극·시공절 · 시공단월",1.4)};
// 인게임 자원/표식/VFX 렌더. GIF는 브라우저의 현재 프레임을 그대로 drawImage한다.
function drawImg(im,x,y,w,h,a=1,rot=0){if(!im?.complete||!im.naturalWidth)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(rot);ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore()}
function drawKatanaVisuals(){for(const v of visuals){if(!String(v.type).startsWith("katana"))continue;const alpha=Math.max(0,Math.min(1,v.life/(v.max||v.life||1))),s=v.screen?{x:W/2,y:H/2}:v.followPlayer?{x:W/2,y:H/2}:ws(v.x,v.y);let f=null,w=90,h=70,rot=v.a||0;if(v.type==="katanaSilverHit"){f="silver_moon_hit.gif";w=80;h=66}else if(v.type==="katanaScarBurst"){f="moon_scar_burst.gif";w=112;h=98}else if(v.type==="katanaExecute"){f="moon_execute.gif";w=126;h=110}else if(v.type==="katanaBalwol"){f="balwol.gif";w=Math.min(520,(v.r||300)*1.12);h=w*221/517}else if(v.type==="katanaBalwolEcho"){f="balwol_echo.gif";w=Math.min(280,(v.r||260)*.82);h=w*129/198}else if(v.type.startsWith("katanaMoonForm")){const n=v.type.slice(-1);f=`moon_sword_${n}.gif`;const dims={1:[626,300],2:[494,276],3:[588,345]}[n];w=Math.min(520,(v.r||330)*1.18);h=w*dims[1]/dims[0]}else if(v.type==="katanaMoonBuff"){f="moon_buff.gif";w=145;h=143;rot=0}else if(v.type==="katanaChamwol"){f="chamwol.gif";w=Math.min(Math.max(W,H)*1.15,760);h=w*148/414}else if(v.type==="katanaJeolwol"){f="jeolwol.gif";w=W*1.12;h=H*1.12;rot=0}else if(v.type==="katanaTimeSpaceCut"){f="time_space_cut.gif";w=W*1.08;h=w*281/500;rot=0}else if(v.type==="katanaGyeonghwaStart"){f="gyeonghwa_suwol.gif";w=150;h=139;rot=0}else if(v.type==="katanaGyeonghwaEcho"){f="balwol.gif";w=Math.min(390,(v.r||260)*1.05);h=w*221/517}else if(v.type==="katanaSilverDamage"){ctx.save();ctx.globalAlpha=alpha;ctx.textAlign="center";ctx.font="bold 17px system-ui";ctx.lineWidth=4;ctx.strokeStyle="rgba(20,28,38,.9)";ctx.shadowColor="#dff8ff";ctx.shadowBlur=14;ctx.strokeText(v.text,s.x,s.y-(1-alpha)*24);ctx.fillStyle="#f8fdff";ctx.fillText(v.text,s.x,s.y-(1-alpha)*24);ctx.restore();continue}if(f)drawImg(img(f),s.x,s.y,w,h,v.type==="katanaGyeonghwaEcho"?Math.min(.46,.16+alpha*.34):Math.min(1,.35+alpha*.8),rot)} }
function drawKatanaHUD(){if(selectedWeapon!=="katana")return;const cx=W/2,cy=H/2;
 // 월은화: 플레이어 좌측 호에 3개, 빈 슬롯은 동일 꽃 실루엣.
 const flower=img("moonflower.png");for(let i=0;i<3;i++){const ang=-1.02+i*.52,x=cx-50-Math.cos(ang)*12,y=cy+Math.sin(ang)*42;ctx.save();if(i>=(player.moonFlowerStacks||0)){ctx.globalAlpha=player.moonFlowerLock>0?.12:.22;ctx.filter="grayscale(1) brightness(.28)"}else{ctx.globalAlpha=.95;ctx.shadowColor="#e7fbff";ctx.shadowBlur=9}if(flower?.complete)ctx.drawImage(flower,x-13,y-13,26,26);ctx.restore()}
 // 만월화 1~4는 4칸 sheet, 5는 full_moon GIF.
 if((player.arts?.nameless||0)>0&&(player.moonPhase||0)>0){const phase=player.moonPhase;if(phase<5){const m=img("full_moon_stack.png");if(m?.complete)ctx.drawImage(m,(phase-1)*128,0,128,128,cx-25,cy-92,50,50)}else drawImg(img("full_moon.gif"),cx,cy-68,58,56,.96)}
 // 극월: star sheet 첫 셀을 24개 원형 배치. 빈 별은 실루엣, 24스택 완성 시 ring도 약하게 겹친다.
 const stars=img("star_sheet.png"),n=player.extremeMoonStacks||0;if(n>0||((player.arts?.nameless||0)>0&&player.moonPhase>0)){for(let i=0;i<24;i++){const a=-Math.PI/2+i*Math.PI*2/24,x=cx+Math.cos(a)*67,y=cy-68+Math.sin(a)*67;ctx.save();ctx.globalAlpha=i<n?.95:.10;if(i>=n)ctx.filter="grayscale(1) brightness(.35)";if(stars?.complete)ctx.drawImage(stars,0,0,128,150,x-6,y-7,12,14);ctx.restore()}if(n>=24)drawImg(img("star_ring.png"),cx,cy-68,145,145,.42)}
 // 적 월흔 1~3 sheet.
 const scar=img("moon_scar_stack.png");if(scar?.complete)for(const e of enemies){if(e.dead||!(e.moonScar>0))continue;const s=ws(e.x,e.y),st=Math.min(3,e.moonScar|0);ctx.drawImage(scar,(st-1)*128,0,128,128,s.x-16,s.y-e.r-36,32,32)}
}
const _draw=draw;draw=function(){_draw();drawKatanaVisuals();drawKatanaHUD()};
window.KatanaRework={version:"1.0",flowerGain,addScar,gainMoonPhase,gainExtremeMoon};
})();
