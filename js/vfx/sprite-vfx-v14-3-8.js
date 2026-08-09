"use strict";

/**
 * 천하생존록 v14.3.8 호환 진입점. 검증된 v14.3.7 무공별 전용 하이브리드 VFX 렌더러.
 *
 * 시각 효과의 핵심 형상은 assets/vfx 아래의 투명 PNG 스프라이트 시트가 담당한다.
 * JavaScript는 위치·회전·크기·수명·히트박스만 계산한다. 즉, 런타임에 원과 선을
 * 즉석 생성해 스킬 외형을 만드는 구형 렌더링과 전투 판정을 분리한다.
 */
globalThis.VFXSprites=(()=>{
  const definitions=Object.freeze({
    hitBlue:{src:"assets/vfx/common/hit_spark_blue.png",frameW:96,frameH:96,frames:8,fps:32,blend:"lighter"},
    hitGold:{src:"assets/vfx/common/hit_spark_gold.png",frameW:96,frameH:96,frames:8,fps:32,blend:"lighter"},
    hitRed:{src:"assets/vfx/common/hit_spark_red.png",frameW:96,frameH:96,frames:8,fps:32,blend:"lighter"},
    explosionFire:{src:"assets/vfx/common/explosion_fire.png",frameW:128,frameH:128,frames:10,fps:28,blend:"lighter"},
    explosionBlood:{src:"assets/vfx/common/explosion_blood.png",frameW:128,frameH:128,frames:10,fps:28,blend:"lighter"},
    shockBlue:{src:"assets/vfx/common/shockwave_blue.png",frameW:160,frameH:160,frames:8,fps:26,blend:"lighter"},
    shockRed:{src:"assets/vfx/common/shockwave_red.png",frameW:160,frameH:160,frames:8,fps:26,blend:"lighter"},
    smoke:{src:"assets/vfx/common/smoke.png",frameW:96,frameH:96,frames:8,fps:18,blend:"source-over"},
    spark:{src:"assets/vfx/common/spark.png",frameW:48,frameH:48,frames:8,fps:32,blend:"lighter"},
    beamBlue:{src:"assets/vfx/common/beam_blue.png",frameW:128,frameH:32,frames:1,fps:1,blend:"lighter"},
    beamRed:{src:"assets/vfx/common/beam_red.png",frameW:128,frameH:32,frames:1,fps:1,blend:"lighter"},
    trailBlue:{src:"assets/vfx/common/trail_blue.png",frameW:128,frameH:32,frames:1,fps:1,blend:"lighter"},
    trailGold:{src:"assets/vfx/common/trail_gold.png",frameW:128,frameH:32,frames:1,fps:1,blend:"lighter"},
    blade:{src:"assets/vfx/common/blade.png",frameW:96,frameH:48,frames:1,fps:1,blend:"lighter"},
    slashCyan:{src:"assets/vfx/weapons/slash_cyan.png",frameW:160,frameH:160,frames:8,fps:27,blend:"lighter"},
    slashRed:{src:"assets/vfx/weapons/slash_red.png",frameW:160,frameH:160,frames:8,fps:27,blend:"lighter"},
    spearGold:{src:"assets/vfx/weapons/spear_gold.png",frameW:192,frameH:64,frames:6,fps:20,blend:"lighter"},
    arrowGreen:{src:"assets/vfx/weapons/arrow_green.png",frameW:96,frameH:48,frames:4,fps:16,blend:"lighter"},
    needlePurple:{src:"assets/vfx/weapons/needle_purple.png",frameW:96,frameH:48,frames:4,fps:18,blend:"lighter"},
    swordCyan:{src:"assets/vfx/weapons/sword_cyan.png",frameW:96,frameH:48,frames:4,fps:18,blend:"lighter"},
    fistGold:{src:"assets/vfx/weapons/fist_gold.png",frameW:128,frameH:128,frames:8,fps:27,blend:"lighter"},
    poisonCloud:{src:"assets/vfx/magic/poison_cloud.png",frameW:160,frameH:160,frames:12,fps:12,blend:"source-over"},
    circleBlue:{src:"assets/vfx/magic/magic_circle_blue.png",frameW:192,frameH:192,frames:12,fps:18,blend:"lighter"},
    circleRed:{src:"assets/vfx/magic/magic_circle_red.png",frameW:192,frameH:192,frames:12,fps:18,blend:"lighter"},
    lightning:{src:"assets/vfx/magic/lightning_blue.png",frameW:128,frameH:128,frames:8,fps:30,blend:"lighter"},
    dragon:{src:"assets/vfx/magic/dragon_wave.png",frameW:256,frameH:128,frames:10,fps:20,blend:"lighter"},
    bloodOrb:{src:"assets/vfx/magic/blood_orb.png",frameW:64,frameH:64,frames:8,fps:18,blend:"lighter"},
    fireOrb:{src:"assets/vfx/magic/fire_orb.png",frameW:64,frameH:64,frames:8,fps:18,blend:"lighter"},
    moonOrb:{src:"assets/vfx/magic/moon_orb.png",frameW:64,frameH:64,frames:8,fps:18,blend:"lighter"},
    skillSaberThunderFan:{src:"assets/vfx/skills/saber/thunder_fan.png",frameW:192,frameH:160,frames:8,fps:28,blend:"lighter"},
    skillSaberMountain:{src:"assets/vfx/skills/saber/mountain_split.png",frameW:192,frameH:192,frames:8,fps:25,blend:"lighter"},
    skillSaberUnityThunder:{src:"assets/vfx/skills/saber/unity_thunder.png",frameW:592,frameH:283,frames:7,cols:7,fps:16.67,blend:"lighter"},
    skillSaberWhirlwindUser:{src:"assets/vfx/skills/saber/whirlwind.png",frameW:500,frameH:500,frames:32,cols:8,fps:20,blend:"lighter"},
    skillSaberUnityMountain:{src:"assets/vfx/skills/saber/unity_mountain.png",frameW:741,frameH:200,frames:6,cols:6,fps:11.11,blend:"lighter"},
    skillSwordMeteor:{src:"assets/vfx/skills/sword/meteor_rain.png",frameW:183,frameH:284,frames:10,cols:5,fps:11.11,blend:"lighter"},
    skillSwordTaiji:{src:"assets/vfx/skills/sword/taiji_array.png",frameW:192,frameH:192,frames:8,fps:20,blend:"lighter"},
    skillSwordTenk:{src:"assets/vfx/skills/sword/ten_thousand.png",frameW:192,frameH:192,frames:8,fps:12,blend:"lighter"},
    skillSpearSpin:{src:"assets/vfx/skills/spear/dragon_spin.png",frameW:192,frameH:192,frames:8,fps:24,blend:"lighter"},
    skillSpearStarfall:{src:"assets/vfx/skills/spear/starfall.png",frameW:160,frameH:192,frames:8,fps:24,blend:"lighter"},
    skillSpearOverlord:{src:"assets/vfx/skills/spear/overlord.png",frameW:386,frameH:277,frames:16,fps:16.67,blend:"lighter"},
    skillBowArrowRain:{src:"assets/vfx/skills/bow/arrow_rain.png",frameW:192,frameH:192,frames:8,fps:22,blend:"lighter"},
    skillBowSunMoon:{src:"assets/vfx/skills/bow/sunmoon_burst.png",frameW:192,frameH:192,frames:8,fps:22,blend:"lighter"},
    skillBowRicochetSeal:{src:"assets/vfx/skills/bow/ricochet_seal.png",frameW:400,frameH:300,frames:37,fps:20,blend:"lighter"},
    skillPoisonExplosion:{src:"assets/vfx/skills/poison/latent_explosion.png",frameW:222,frameH:224,frames:5,cols:5,fps:10,blend:"lighter"},
    skillPoisonDemon:{src:"assets/vfx/skills/poison/demon_mist.png",frameW:400,frameH:500,frames:25,cols:5,fps:16.67,blend:"source-over"},
    skillStingrainExplosion:{src:"assets/vfx/skills/poison/stingrain_explosion.png",frameW:334,frameH:292,frames:7,cols:4,fps:11.11,blend:"lighter"},
    skillPoisonButterfly:{src:"assets/vfx/skills/poison/butterfly.png",frameW:360,frameH:360,frames:1,cols:1,fps:1,blend:"lighter"},
    skillExplodedButterfly:{src:"assets/vfx/skills/poison/butterfly_explosion.png",frameW:512,frameH:512,frames:21,cols:7,fps:20,blend:"source-over"},
    skillTaoFireDragon:{src:"assets/vfx/skills/tao/fire_dragon.png",frameW:257,frameH:258,frames:6,fps:11.11,blend:"lighter"},
    skillTaoIceArray:{src:"assets/vfx/skills/tao/ice_array.png",frameW:192,frameH:192,frames:8,fps:18,blend:"lighter"},
    skillTaoFiveThunder:{src:"assets/vfx/skills/tao/five_thunder.png",frameW:420,frameH:288,frames:12,fps:9.76,blend:"source-over"},
    skillKatanaMoonChain:{src:"assets/vfx/skills/katana/moon_chain.png",frameW:192,frameH:128,frames:8,fps:28,blend:"lighter"},
    skillKatanaZanshin:{src:"assets/vfx/skills/katana/zanshin.png",frameW:192,frameH:160,frames:8,fps:22,blend:"lighter"},
    skillKatanaNameless:{src:"assets/vfx/skills/katana/nameless_cuts.png",frameW:256,frameH:192,frames:8,fps:27,blend:"lighter"},
    skillFistIronMountain:{src:"assets/vfx/skills/fist/iron_mountain.png",frameW:192,frameH:160,frames:8,fps:26,blend:"lighter"},
    skillFistHundredStep:{src:"assets/vfx/skills/fist/hundred_step.png",frameW:256,frameH:128,frames:8,fps:25,blend:"lighter"},
    skillFistTaiji:{src:"assets/vfx/skills/fist/taiji_vortex.png",frameW:192,frameH:192,frames:8,fps:20,blend:"lighter"},
    skillFistDragonReturn:{src:"assets/vfx/skills/fist/dragon_return.png",frameW:256,frameH:128,frames:8,fps:24,blend:"lighter"},
  });

  const effects=[];
  const files=[...new Set(Object.values(definitions).map(def=>def.src))];

  /** 모든 VFX는 GameAssets의 공유 Image 객체를 사용한다. */
  function load(src){
    return GameAssets.load(src).then(()=>GameAssets.image(src));
  }

  async function preload(onProgress=()=>{}){
    let done=0;
    await Promise.all(files.map(async src=>{await load(src);done++;onProgress(done,files.length,src)}));
    return files.filter(src=>!GameAssets.isReady(src));
  }

  function imageFor(id){
    const def=definitions[id];
    if(!def)return null;
    const image=GameAssets.image(def.src);
    return image?.complete&&image.naturalWidth?image:null;
  }

  /** CSS 색상을 대략적인 RGB로 바꿔 속성별 VFX 팔레트를 선택한다. */
  function colorChannels(color=""){
    const value=String(color).trim().toLowerCase();
    if(value.startsWith("#")){
      const hex=value.slice(1);
      if(hex.length===3)return hex.split("").map(ch=>parseInt(ch+ch,16));
      if(hex.length>=6)return [parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];
    }
    const match=value.match(/rgba?\(([^)]+)\)/);
    if(match)return match[1].split(",").slice(0,3).map(part=>Math.max(0,Math.min(255,Number.parseFloat(part)||0)));
    return [150,205,230];
  }
  function isRed(color=""){
    const [r,g,b]=colorChannels(color);
    return r>175&&r>g*1.18&&r>b*1.12;
  }
  function isPoison(color=""){
    const [r,g,b]=colorChannels(color);
    return b>145&&r>g*1.12&&b>g*1.18;
  }
  function isGold(color=""){
    const [r,g,b]=colorChannels(color);
    return r>185&&g>145&&g>b*1.28&&r>b*1.45;
  }

  /**
   * 한 프레임을 그린다. age를 넘기면 효과마다 독립적인 프레임 진행을 사용한다.
   * screen=true이면 이미 화면 좌표인 UI/VFX에 사용하고, 기본값은 월드 좌표다.
   */
  function draw(id,x,y,{age=elapsed,angle=0,scale=1,scaleX=1,scaleY=1,alpha=1,screen=false,frame=null,blend=null,flipX=false,flipY=false,loop=true,fpsOverride=null}={}){
    const def=definitions[id],image=imageFor(id);
    if(!def||!image)return false;
    const fps=Number.isFinite(fpsOverride)&&fpsOverride>0?fpsOverride:def.fps;
    const safeAge=Math.max(0,age);
    const cycle=def.frames/Math.max(.001,fps);
    if(!loop&&frame===null&&safeAge>=cycle)return false;
    const position=screen?{x,y}:ws(x,y);
    const rawIndex=Math.floor(safeAge*fps);
    const index=frame===null?(loop?rawIndex%def.frames:Math.min(def.frames-1,rawIndex)):Math.max(0,Math.min(def.frames-1,frame));
    const z=screen?1:mobileCameraScale();
    const width=def.frameW*scale*scaleX*z;
    const height=def.frameH*scale*scaleY*z;
    ctx.save();
    ctx.translate(position.x,position.y);
    ctx.rotate(angle);
    ctx.scale(flipX?-1:1,flipY?-1:1);
    ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
    ctx.globalCompositeOperation=blend||def.blend||"source-over";
    ctx.imageSmoothingEnabled=true;
    const cols=Math.max(1,def.cols||def.frames),sx=(index%cols)*def.frameW,sy=Math.floor(index/cols)*def.frameH;
    ctx.drawImage(image,sx,sy,def.frameW,def.frameH,-width/2,-height/2,width,height);
    ctx.restore();
    return true;
  }

  /**
   * 스킬용 Flipbook 기본 규칙: 첫 프레임부터 마지막 프레임까지 정확히 한 번만 재생한다.
   * 연출 시간을 늘릴 때는 fpsOverride(또는 definitions의 fps)를 낮춰 프레임 간격을 늘린다.
   */
  function drawOneShot(id,x,y,options={}){
    return draw(id,x,y,{...options,loop:false});
  }

  /** 길이 방향으로 한 장의 텍스처를 늘여 검로·번개 경로·경고선을 표현한다. */
  function beam(id,x1,y1,x2,y2,width,alpha=1){
    const def=definitions[id],image=imageFor(id);
    if(!def||!image)return false;
    const a=ws(x1,y1),b=ws(x2,y2),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(dy,dx));ctx.globalAlpha=alpha;
    ctx.globalCompositeOperation=def.blend;ctx.drawImage(image,0,0,def.frameW,def.frameH,0,-width/2,length,width);ctx.restore();
    return true;
  }

  function spawn(id,x,y,options={}){
    const def=definitions[id];
    if(!def)return;
    const duration=options.life||def.frames/def.fps;
    effects.push({id,x,y,age:0,life:duration,max:duration,angle:options.angle||0,scale:options.scale||1,alpha:options.alpha??1,screen:!!options.screen,follow:options.follow||null});
    const speed=Math.max(1,Number(account.settings?.gameSpeed||1)),quality=account.settings?.quality||"normal";
    const qualityCap=quality==="low"?105:quality==="high"?180:145;
    const cap=Math.max(80,Math.floor(qualityCap*(speed>=3?.62:speed>=2?.76:speed>=1.5?.9:1)));
    if(effects.length>cap)effects.splice(0,effects.length-cap);
  }

  function update(dt){
    for(const effect of effects){
      effect.age+=dt;effect.life-=dt;
      if(effect.follow&&!effect.follow.dead){effect.x=effect.follow.x;effect.y=effect.follow.y}
    }
    for(let i=effects.length-1;i>=0;i--)if(effects[i].life<=0||effects[i].follow?.dead)effects.splice(i,1);
  }

  function drawEffects(){
    for(const effect of effects){
      const fade=Math.min(1,effect.life/Math.max(.08,effect.max*.3));
      draw(effect.id,effect.x,effect.y,{age:effect.age,angle:effect.angle,scale:effect.scale,alpha:effect.alpha*fade,screen:effect.screen});
    }
  }

  return Object.freeze({definitions,files,load,preload,draw,drawOneShot,beam,spawn,update,drawEffects,isRed,isPoison,isGold,imageFor});
})();

/* -------------------------------------------------------------------------- */
/* 기존 Canvas 도형 렌더러를 외부 PNG 스프라이트 기반으로 교체한다.             */
/* -------------------------------------------------------------------------- */

/** 투사체 종류를 전용 PNG에 연결한다. 실제 충돌 반경과 피해량은 기존 코드가 유지한다. */
drawProjectiles=function(){
  for(const p of projectiles){
    const angle=Math.atan2(p.vy,p.vx),speed=Math.hypot(p.vx,p.vy),trailLength=Math.min(90,24+speed*.12);
    const red=VFXSprites.isRed(p.color),gold=VFXSprites.isGold(p.color);
    if(p.shape==="ultimateArrow"){
      const pos=ws(p.x,p.y),z=mobileCameraScale(),pulse=.86+Math.sin(elapsed*10)*.12;ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(angle);ctx.globalCompositeOperation="lighter";ctx.shadowColor="#ffd75f";ctx.shadowBlur=18*z;
      ctx.globalAlpha=.34;ctx.strokeStyle="#ff6d52";ctx.lineWidth=10*z;ctx.beginPath();ctx.moveTo(-58*z,0);ctx.lineTo(7*z,0);ctx.stroke();
      ctx.globalAlpha=.92;ctx.strokeStyle="#ffe998";ctx.lineWidth=5.2*z*pulse;ctx.beginPath();ctx.moveTo(-45*z,0);ctx.lineTo(11*z,0);ctx.stroke();
      ctx.globalAlpha=1;ctx.fillStyle="#fff7cf";ctx.beginPath();ctx.moveTo(24*z,0);ctx.lineTo(7*z,-10*z);ctx.lineTo(11*z,0);ctx.lineTo(7*z,10*z);ctx.closePath();ctx.fill();
      ctx.fillStyle="#ff7b55";ctx.beginPath();ctx.moveTo(-38*z,0);ctx.lineTo(-54*z,-9*z);ctx.lineTo(-48*z,0);ctx.lineTo(-54*z,9*z);ctx.closePath();ctx.fill();
      ctx.strokeStyle="#fff5bd";ctx.lineWidth=1.8*z;ctx.globalAlpha=.9;ctx.beginPath();ctx.moveTo(-22*z,-5*z);ctx.lineTo(7*z,-2*z);ctx.moveTo(-22*z,5*z);ctx.lineTo(7*z,2*z);ctx.stroke();ctx.restore();
      const tx=p.x-Math.cos(angle)*48,ty=p.y-Math.sin(angle)*48;VFXSprites.draw("trailGold",tx,ty,{angle,scaleX:1.05,scaleY:.72,alpha:.72});
      continue;
    }
    if(p.source!=="tenk"&&(p.trail||["crescent","spear","arrow","sword","fire","sun","moon","fist"].includes(p.shape))){
      const tx=p.x-Math.cos(angle)*trailLength*.45,ty=p.y-Math.sin(angle)*trailLength*.45;
      VFXSprites.draw(gold?"trailGold":"trailBlue",tx,ty,{angle,scaleX:Math.max(.32,trailLength/128),scaleY:.48,alpha:.5});
    }
    if(p.shape==="poisonButterfly")VFXSprites.draw("skillPoisonButterfly",p.x,p.y,{angle,scale:.22+Math.min(.12,p.r/80),alpha:.96});
    else if(p.shape==="arrow")VFXSprites.draw("arrowGreen",p.x,p.y,{angle,scale:.72+Math.min(.35,p.r/20)});
    else if(p.shape==="spear")VFXSprites.draw("spearGold",p.x,p.y,{angle,scale:.58+Math.min(.55,p.r/22)});
    else if(p.shape==="crescent")VFXSprites.draw(red?"slashRed":"slashCyan",p.x,p.y,{angle,scale:.45+Math.min(1.25,p.r/18),age:elapsed*.72});
    else if(p.shape==="needle")VFXSprites.draw("needlePurple",p.x,p.y,{angle,scale:.72+Math.min(.35,p.r/18)});
    else if(p.shape==="sword")VFXSprites.draw("swordCyan",p.x,p.y,{angle,scale:.72+Math.min(.65,p.r/13)});
    else if(p.shape==="fire"||p.shape==="sun")VFXSprites.draw("fireOrb",p.x,p.y,{angle,scale:.72+Math.min(.75,p.r/14)});
    else if(p.shape==="moon")VFXSprites.draw("moonOrb",p.x,p.y,{angle,scale:.72+Math.min(.75,p.r/14)});
    else if(p.shape==="fist")VFXSprites.draw("fistGold",p.x,p.y,{angle,scale:.45+Math.min(.65,p.r/20),age:elapsed*.65});
    else VFXSprites.draw("swordCyan",p.x,p.y,{angle,scale:.62});
  }
};

/** 작은 사각형 파티클 대신 불꽃·연기 텍스처를 사용한다. */
drawParticles=function(){
  for(const p of particles){
    const ratio=Math.max(0,p.life/p.max),speed=Math.hypot(p.vx,p.vy),angle=Math.atan2(p.vy,p.vx);
    if(VFXSprites.isPoison(p.color)||speed<8){
      VFXSprites.draw("smoke",p.x,p.y,{age:(1-ratio)*.42,angle,scale:.20+.28*(1-ratio),alpha:ratio*.55,blend:"source-over"});
    }else{
      VFXSprites.draw("spark",p.x,p.y,{age:(1-ratio)*.25,angle,scale:.22+Math.min(.45,speed/150),alpha:ratio});
    }
  }
};

/** 지속 장판은 독구름 텍스처와 회전 마법진을 겹쳐 범위와 속성을 동시에 보여준다. */
drawFields=function(){
  for(const f of fields){
    const alpha=Math.min(.72,.2+f.life*.04),scale=Math.max(.45,f.r/76);
    VFXSprites.draw("poisonCloud",f.x,f.y,{age:elapsed*.55,scale,alpha,blend:"source-over"});
    VFXSprites.draw("circleBlue",f.x,f.y,{age:elapsed*.32,scale:Math.max(.35,f.r/96),alpha:.24});
  }
};

/** 보스 위험 지역도 텍스처로 렌더링한다. 히트박스 계산은 updateHazards가 그대로 담당한다. */
drawHazards=function(){
  for(const h of hazards){
    if(h.dead)continue;
    if(h.type==="blast"){
      const progress=Math.max(0,Math.min(1,1-h.time/.82));
      VFXSprites.draw("circleRed",h.x,h.y,{age:elapsed*.6,scale:h.r/92,alpha:.38+progress*.38});
      if(progress>.68)VFXSprites.draw("shockRed",h.x,h.y,{age:(progress-.68)*.35,scale:h.r/80,alpha:.72});
    }else if(h.type==="orb"){
      VFXSprites.draw("bloodOrb",h.x,h.y,{age:elapsed*.8,scale:.55+Math.min(.9,h.r/13)});
    }else if(h.type==="puddle"){
      VFXSprites.draw("poisonCloud",h.x,h.y,{age:elapsed*.45,scale:h.r/72,alpha:.55,blend:"source-over"});
      VFXSprites.draw("circleRed",h.x,h.y,{age:elapsed*.2,scale:h.r/96,alpha:.20});
    }else if(h.type==="cross"){
      const half=550,w=(h.w||38)*mobileCameraScale();
      VFXSprites.beam("beamRed",h.x-half,h.y,h.x+half,h.y,w,.38);
      VFXSprites.beam("beamRed",h.x,h.y-half,h.x,h.y+half,w,.38);
    }
  }
};

function drawBladeRing(v,alpha){
  const count=v.count||12;
  for(let i=0;i<count;i++){
    const angle=i*Math.PI*2/count+elapsed*1.45;
    const x=v.x+Math.cos(angle)*v.r,y=v.y+Math.sin(angle)*v.r;
    VFXSprites.draw("blade",x,y,{angle:angle+Math.PI/2,scale:.48+Math.min(.6,(v.width||4)/10),alpha});
  }
}

/**
 * 기존 visuals 배열의 타입을 외부 에셋에 매핑한다.
 * 텍스트 알림만 Canvas 글자를 유지하며, 공격 본체·장판·검기·폭발은 PNG를 사용한다.
 */
drawVisuals=function(){
  const slashTypes=new Set(["slashArc","ribbon","arcEcho","moonTrail","afterimageBlade","petalBurst"]);
  const circleTypes=new Set(["ring","marker","glyph","ornateRing","rune","heavenSeal","yin","yinBloom","demonHalo","sparkCrown","spiral","helix","skyGate","cloudSplit"]);
  const spearTypes=new Set(["spearAura","windTunnel","dragonSpear","pressure"]);
  const bladeTypes=new Set(["fallingSword","swordHalo","bladeStorm","iceShardRing"]);
  const customCentered={
    skillSwordTaiji:"skillSwordTaiji",skillSwordTenk:"skillSwordTenk",skillSpearSpin:"skillSpearSpin",
    skillBowArrowRain:"skillBowArrowRain",skillBowSunMoon:"skillBowSunMoon",skillBowRicochetSeal:"skillBowRicochetSeal",
    skillPoisonExplosion:"skillPoisonExplosion",skillPoisonDemon:"skillPoisonDemon",skillStingrainExplosion:"skillStingrainExplosion",skillExplodedButterfly:"skillExplodedButterfly",skillTaoIceArray:"skillTaoIceArray",skillTaoFiveThunder:"skillTaoFiveThunder",
    skillKatanaZanshin:"skillKatanaZanshin",
    skillKatanaNameless:"skillKatanaNameless",skillFistTaiji:"skillFistTaiji"
  };
  for(const v of visuals){
    const alpha=Math.max(0,Math.min(1,v.life/Math.max(.001,v.max||v.life||.2))),red=VFXSprites.isRed(v.color),poison=VFXSprites.isPoison(v.color),gold=VFXSprites.isGold(v.color);
    const progress=(1-alpha)*Math.max(.18,v.max||.3);
    if(customCentered[v.type]){
      const id=customCentered[v.type],divisor=id==="skillKatanaNameless"?150:id==="skillBowRicochetSeal"?220:id==="skillPoisonDemon"?210:id==="skillExplodedButterfly"?190:id==="skillStingrainExplosion"?145:id==="skillPoisonExplosion"?82:id==="skillTaoFiveThunder"?190:96,scale=Math.max(.34,(v.r||105)/divisor);
      const vis=v.holdAlpha?Math.min(1,Math.pow(alpha,.32)*(v.visibilityBoost||1)):Math.min(1,alpha*(v.visibilityBoost||1));
      VFXSprites.drawOneShot(id,v.x,v.y,{age:progress,angle:v.a||0,scale,alpha:vis,blend:id==="skillPoisonMiasma"?"source-over":null});
    }else if(v.type==="skillTaoFireDragon"&&v.burst){
      const vis=v.holdAlpha?Math.min(1,Math.pow(alpha,.35)*(v.visibilityBoost||1)):alpha;
      VFXSprites.drawOneShot("skillTaoFireDragon",v.x,v.y,{age:progress,scale:Math.max(.72,(v.r||90)/105),alpha:vis});
    }else if(v.type==="skillSaberUnityThunder"){
      const a=v.a||0,r=v.r||130,x=v.x+Math.cos(a)*r*.34,y=v.y+Math.sin(a)*r*.34;
      const vis=Math.min(1,alpha*(v.visibilityBoost||1));
      VFXSprites.drawOneShot("skillSaberUnityThunder",x,y,{age:progress,angle:a,scaleX:Math.max(.58,r/165),scaleY:Math.max(.68,(v.half||.75)/.72),alpha:vis});
    }else if(v.type==="skillSaberWhirlwindUser"){
      VFXSprites.drawOneShot("skillSaberWhirlwindUser",v.x,v.y,{age:progress,scale:Math.max(.5,(v.r||110)/170),alpha});
    }else if(v.type==="skillSaberUnityMountain"){
      // vfx_04 원본은 프레임 진행이 오른쪽→왼쪽이다.
      // 좌우 반전해 플레이어→공격방향으로 진행시키고, 첫 사출 시작점이 플레이어에 닿도록
      // 원본 프레임의 실사용 폭(약 739px)을 기준으로 중심을 판정 길이의 절반 앞에 둔다.
      const a=v.a||0,r=v.r||270,scaleX=Math.max(.32,r/741),originOffset=368.5*scaleX;
      const x=v.x+Math.cos(a)*originOffset,y=v.y+Math.sin(a)*originOffset;
      const vis=Math.min(1,alpha*(v.visibilityBoost||1));
      VFXSprites.drawOneShot("skillSaberUnityMountain",x,y,{age:progress,angle:a,scaleX,scaleY:Math.max(.68,(v.width||36)/46),alpha:vis,flipX:true});
    }else if(v.type==="skillSaberThunderFan"){
      const a=v.a||0,r=v.r||100,x=v.x+Math.cos(a)*r*.42,y=v.y+Math.sin(a)*r*.42;
      VFXSprites.drawOneShot("skillSaberThunderFan",x,y,{age:progress,angle:a,scale:Math.max(.48,r/108),alpha});
    }else if(v.type==="skillSwordMeteor"){
      const scale=Math.max(.58,Math.min(1.08,(v.r||80)/92));
      VFXSprites.drawOneShot("skillSwordMeteor",v.x,v.y-284*scale*.48,{age:progress,angle:v.a||0,scale,alpha});
    }else if(v.type==="skillSpearStarfall"){
      VFXSprites.drawOneShot("skillSpearStarfall",v.x,v.y,{age:progress,scale:Math.max(.5,(v.r||75)/95),alpha});
    }else if(["skillSpearOverlord","skillTaoFireDragon","skillKatanaMoonChain","skillFistHundredStep","skillFistDragonReturn"].includes(v.type)){
      const map={skillSpearOverlord:"skillSpearOverlord",skillTaoFireDragon:"skillTaoFireDragon",skillKatanaMoonChain:"skillKatanaMoonChain",skillFistHundredStep:"skillFistHundredStep",skillFistDragonReturn:"skillFistDragonReturn"};
      const id=map[v.type],a=v.a||0,r=v.r||190,x=v.x+Math.cos(a)*r*.4,y=v.y+Math.sin(a)*r*.4;
      VFXSprites.drawOneShot(id,x,y,{age:progress,angle:a,scaleX:Math.max(.62,r/240),scaleY:Math.max(.65,(v.width||28)/42),alpha,flipX:v.type==="skillSpearOverlord"});
    }else if(v.type==="skillSaberMountain"){
      const a=v.a||0,r=v.r||250,x=v.x+Math.cos(a)*r*.42,y=v.y+Math.sin(a)*r*.42;
      VFXSprites.drawOneShot("skillSaberMountain",x,y,{age:progress,angle:a-Math.PI/2,scaleX:Math.max(.52,(v.width||32)/54),scaleY:Math.max(.72,r/260),alpha});
    }else if(v.type==="skillFistIronMountain"){
      const a=v.a||0,r=v.r||95,x=v.x+Math.cos(a)*r*.42,y=v.y+Math.sin(a)*r*.42;
      VFXSprites.drawOneShot("skillFistIronMountain",x,y,{age:progress,angle:a,scale:Math.max(.5,r/115),alpha});
    }else if(v.type==="namelessCutV1454"){
      // v14.5.4: 구형 무명신풍류 스프라이트 대신 얇고 빠른 발도 참격을 직접 그린다.
      const a=Math.atan2(v.y2-v.y1,v.x2-v.x1),len=Math.hypot(v.x2-v.x1,v.y2-v.y1),mid=ws((v.x1+v.x2)/2,(v.y1+v.y2)/2);
      const flare=Math.sin(Math.min(1,progress)*Math.PI),w=Math.max(2,(v.width||5)*(1.35-progress*.65));
      ctx.save();ctx.translate(mid.x,mid.y);ctx.rotate(a);ctx.globalCompositeOperation="lighter";ctx.lineCap="round";
      ctx.globalAlpha=alpha*.22;ctx.strokeStyle=v.color||"#e8e2ff";ctx.lineWidth=w*4.2;ctx.shadowColor=v.color||"#e8e2ff";ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(-len*.5,0);ctx.lineTo(len*.5,0);ctx.stroke();
      ctx.globalAlpha=Math.min(1,alpha*(1.15+flare*.35));ctx.strokeStyle="#ffffff";ctx.lineWidth=Math.max(1.2,w*.38);ctx.shadowBlur=7;ctx.beginPath();ctx.moveTo(-len*.52,0);ctx.lineTo(len*.52,0);ctx.stroke();
      ctx.globalAlpha=alpha*.7;ctx.strokeStyle="#b6a8ff";ctx.lineWidth=Math.max(1,w*.22);ctx.beginPath();ctx.moveTo(-len*.42,-w*1.8);ctx.lineTo(len*.46,w*.9);ctx.stroke();
      ctx.restore();
    }else if(v.type==="line"){
      if(v.source==="mountain"){
        const a=Math.atan2(v.y2-v.y1,v.x2-v.x1),len=Math.hypot(v.x2-v.x1,v.y2-v.y1),x=(v.x1+v.x2)/2,y=(v.y1+v.y2)/2;
        VFXSprites.drawOneShot("skillSaberMountain",x,y,{age:progress,angle:a-Math.PI/2,scaleX:Math.max(.5,(v.width||28)/55),scaleY:Math.max(.7,len/250),alpha});
      }else if(v.source==="moonchain"){
        const a=Math.atan2(v.y2-v.y1,v.x2-v.x1),len=Math.hypot(v.x2-v.x1,v.y2-v.y1),x=(v.x1+v.x2)/2,y=(v.y1+v.y2)/2;
        VFXSprites.drawOneShot("skillKatanaMoonChain",x,y,{age:progress,angle:a,scaleX:Math.max(.45,len/190),scaleY:.72,alpha});
      }else if(v.source==="nameless"){
        const x=(v.x1+v.x2)/2,y=(v.y1+v.y2)/2,a=Math.atan2(v.y2-v.y1,v.x2-v.x1);
        VFXSprites.drawOneShot("skillKatanaNameless",x,y,{age:progress,angle:a,scale:Math.max(.7,Math.hypot(v.x2-v.x1,v.y2-v.y1)/620),alpha});
      }else if(v.source==="overlord"||v.source==="dragonreturn"){
        const a=Math.atan2(v.y2-v.y1,v.x2-v.x1),len=Math.hypot(v.x2-v.x1,v.y2-v.y1),x=(v.x1+v.x2)/2,y=(v.y1+v.y2)/2,id=v.source==="overlord"?"skillSpearOverlord":"skillFistDragonReturn";
        VFXSprites.drawOneShot(id,x,y,{age:progress,angle:a,scaleX:Math.max(.65,len/300),scaleY:Math.max(.7,(v.width||30)/44),alpha,flipX:id==="skillSpearOverlord"});
      }else VFXSprites.beam(red?"beamRed":"beamBlue",v.x1,v.y1,v.x2,v.y2,Math.max(3,v.width||4),alpha);
    }else if(v.type==="lightning"){
      VFXSprites.beam("beamBlue",v.x1,v.y1,v.x2,v.y2,Math.max(3,(v.width||2)*2.2),alpha);
      VFXSprites.drawOneShot("lightning",v.x2,v.y2,{age:progress,scale:.52+Math.min(.55,(v.width||2)/5),alpha});
    }else if(v.type==="cone"){
      // 벽력도법의 실제 부채꼴 판정 VFX. 창기 PNG를 사용하지 않아 화살 모양이 다시 나타나지 않는다.
      const a=v.a||0,r=v.r||100,x=v.x+Math.cos(a)*r*.42,y=v.y+Math.sin(a)*r*.42;
      VFXSprites.drawOneShot("skillSaberThunderFan",x,y,{age:progress,angle:a,scale:Math.max(.48,r/108),scaleY:Math.max(.72,(v.half||.72)/.72),alpha});
    }else if(v.type==="marker"&&v.source==="starfall"){
      VFXSprites.drawOneShot("skillSpearStarfall",v.x,v.y,{age:progress,scale:Math.max(.48,(v.r||35)/42),alpha});
    }else if(v.type==="ring"&&v.source){
      const sourceMap={dragonspin:"skillSpearSpin",sunmoon:"skillBowSunMoon",zanshin:"skillKatanaZanshin",taijifist:"skillFistTaiji",icearray:"skillTaoIceArray"};
      const id=sourceMap[v.source];
      if(id){const divisor=id==="skillTaoIceArray"?118:96;VFXSprites.drawOneShot(id,v.x,v.y,{age:progress,scale:Math.max(.38,(v.r||80)/divisor),alpha});}
      else VFXSprites.drawOneShot(red?"shockRed":"shockBlue",v.x,v.y,{age:progress,scale:Math.max(.25,(v.r||42)/80),alpha:alpha*.72});
    }else if(circleTypes.has(v.type)){
      const id=red?"circleRed":"circleBlue";
      VFXSprites.drawOneShot(id,v.x,v.y,{age:elapsed*(v.type==="spiral"||v.type==="helix"?.75:.4),angle:v.a||0,scale:Math.max(.25,(v.r||42)/96),alpha:alpha*(v.type==="marker"?.48:.78)});
      if(v.type==="ring"||v.type==="marker")VFXSprites.drawOneShot(red?"shockRed":"shockBlue",v.x,v.y,{age:progress,scale:Math.max(.25,(v.r||42)/80),alpha:alpha*.62});
    }else if(v.type==="heavyArc"){
      VFXSprites.drawOneShot("skillSaberThunderFan",v.x+Math.cos(v.a||0)*(v.r||72)*.35,v.y+Math.sin(v.a||0)*(v.r||72)*.35,{age:progress,angle:v.a||0,scale:Math.max(.42,(v.r||72)/86),alpha});
    }else if(slashTypes.has(v.type)){
      VFXSprites.drawOneShot(red?"slashRed":"slashCyan",v.x,v.y,{age:progress,angle:v.a||0,scale:Math.max(.3,(v.r||45)/82),alpha});
    }else if(spearTypes.has(v.type)){
      VFXSprites.drawOneShot("spearGold",v.x+Math.cos(v.a||0)*(v.r||70)*.42,v.y+Math.sin(v.a||0)*(v.r||70)*.42,{age:elapsed*.5,angle:v.a||0,scaleX:Math.max(.55,(v.r||70)/120),scaleY:Math.max(.6,(v.width||18)/30),alpha});
    }else if(v.type==="cross"||v.type==="screenCut"){
      const n=v.count||2;
      for(let i=0;i<n;i++){const offset=(i-(n-1)/2)*18,angle=(v.a||0)+(i%2?Math.PI/2:0),x=v.x+Math.cos(angle+Math.PI/2)*offset,y=v.y+Math.sin(angle+Math.PI/2)*offset;VFXSprites.drawOneShot(red?"slashRed":"slashCyan",x,y,{age:progress,angle,scale:Math.max(.45,(v.r||85)/100),alpha})}
    }else if(v.type==="dragon"||v.type==="dragonBreath"){
      VFXSprites.drawOneShot("dragon",v.x,v.y,{age:elapsed*.45,angle:v.a||0,scaleX:Math.max(.55,(v.r||180)/230),scaleY:.85,alpha});
    }else if(v.type==="cloud"||v.type==="poisonVein"){
      VFXSprites.drawOneShot("skillPoisonMiasma",v.x,v.y,{age:elapsed*.34,scale:Math.max(.28,(v.r||50)/88),alpha:alpha*.74,blend:"source-over"});
    }else if(v.type==="bowstring"){
      const a=v.a||0,length=v.r||70;VFXSprites.beam("trailGold",v.x-Math.cos(a)*length*.35,v.y-Math.sin(a)*length*.35,v.x+Math.cos(a)*length*.35,v.y+Math.sin(a)*length*.35,5,alpha*.8);VFXSprites.drawOneShot("arrowGreen",v.x+Math.cos(a)*length*.28,v.y+Math.sin(a)*length*.28,{angle:a,scale:.62,alpha});
    }else if(v.type==="feather"){
      VFXSprites.drawOneShot("arrowGreen",v.x,v.y,{angle:v.a||0,scale:Math.max(.25,(v.r||20)/48),alpha});VFXSprites.drawOneShot("spark",v.x,v.y,{age:progress,scale:.3,alpha:alpha*.7});
    }else if(bladeTypes.has(v.type)){
      if(v.type==="fallingSword"&&v.source==="meteor"){const scale=Math.max(.66,Math.min(1.06,(v.r||30)/43));VFXSprites.drawOneShot("skillSwordMeteor",v.x,v.y-284*scale*.48,{age:progress,angle:v.a||0,scale,alpha});}
      else if(v.type==="fallingSword"&&v.source==="starfall")VFXSprites.drawOneShot("skillSpearStarfall",v.x,v.y,{age:progress,scale:Math.max(.48,(v.r||38)/48),alpha});
      else if(v.type==="fallingSword")VFXSprites.drawOneShot("blade",v.x,v.y-(alpha*80),{angle:Math.PI/2,scale:Math.max(.6,(v.width||5)/6),alpha});
      else drawBladeRing(v,alpha);
    }else if(v.type==="impact"||v.type==="crack"||v.type==="earthSplit"||v.type==="fanBurst"){
      VFXSprites.drawOneShot(red?"explosionBlood":gold?"explosionFire":"hitBlue",v.x,v.y,{age:progress,angle:v.a||0,scale:Math.max(.35,(v.r||35)/70),alpha});
    }else if(v.type==="focusLine"||v.type==="streak"){
      const length=v.r||100,a=v.a||0;VFXSprites.beam(red?"beamRed":"beamBlue",v.x,v.y,v.x+Math.cos(a)*length,v.y+Math.sin(a)*length,Math.max(3,v.width||3),alpha);
    }else if(v.type==="poisonMote")VFXSprites.drawOneShot("poisonCloud",v.x,v.y,{age:progress,scale:.18+Math.min(.25,(v.r||4)/14),alpha:alpha*.7,blend:"source-over"});
    else if(v.type==="ember"||v.type==="pressureDot")VFXSprites.drawOneShot("spark",v.x,v.y,{age:progress,scale:.22+Math.min(.4,(v.r||4)/12),alpha});
    else if(v.type==="afterimage")VFXSprites.drawOneShot(poison?"poisonCloud":"smoke",v.x,v.y,{age:progress,scale:Math.max(.18,(v.r||16)/48),alpha:alpha*.4,blend:"source-over"});
    else if(v.type==="text"){const pos=ws(v.x,v.y);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=v.color||"#fff";ctx.font="bold 13px system-ui";ctx.textAlign="center";ctx.fillText(v.text||"!",pos.x,pos.y-(1-alpha)*22);ctx.restore()}
  }
  VFXSprites.drawEffects();
};
/** 태극검진은 원형 도형 대신 회전 마법진과 실제 검 텍스처를 조합한다. */
drawOrbit=function(){
  const level=player.arts.taiji||0;
  if(!level)return;
  const count=taijiCount(level),radius=taijiRadius(level),size=taijiBladeSize(level);
  VFXSprites.draw("skillSwordTaiji",W/2,H/2,{screen:true,age:elapsed*.28,scale:radius/88,alpha:.32+.03*level});
  for(let i=0;i<count;i++){
    const angle=elapsed*(2.15+level*.11)+i*Math.PI*2/count;
    const x=W/2+Math.cos(angle)*radius,y=H/2+Math.sin(angle)*radius;
    VFXSprites.draw("blade",x,y,{screen:true,angle:angle+Math.PI/2,scale:.34+size/34,alpha:.95});
  }
};

/* -------------------------------------------------------------------------- */
/* 타격 시 별도의 Flipbook을 생성해 타격감과 공격 본체를 분리한다.             */
/* -------------------------------------------------------------------------- */
const damageEnemyBeforeSpriteVFX=damageEnemy;
damageEnemy=function(enemy,damage,source,options={}){
  const hpBefore=enemy.hp;
  const result=damageEnemyBeforeSpriteVFX(enemy,damage,source,options);
  const dealt=Math.max(0,hpBefore-Math.max(0,enemy.hp));
  // Dedicated skill sprites use skipVisual:true so their art remains visually exclusive.
  // Generic hit feedback is kept only for attacks that did not explicitly suppress visuals.
  if(dealt>0&&!options.skipVisual&&!options.skipImpactVfx){
    const color=options.color||C[selectedWeapon]||"#8fe8ff";
    const id=VFXSprites.isRed(color)?"hitRed":VFXSprites.isGold(color)?"hitGold":"hitBlue";
    VFXSprites.spawn(id,enemy.x,enemy.y,{scale:.40+Math.min(1.1,dealt/85),angle:Math.random()*Math.PI*2});
  }
  return result;
};

const hurtPlayerBeforeSpriteVFX=hurtPlayer;
hurtPlayer=function(amount){
  const hpBefore=player.hp;
  const result=hurtPlayerBeforeSpriteVFX(amount);
  if(player.hp<hpBefore)VFXSprites.spawn("hitRed",player.x,player.y,{scale:.75,angle:Math.random()*Math.PI*2});
  return result;
};

// v14.7.9: aoe() is gameplay-only. It must never infer or inject attack art.
// The base aoe() may create its own legacy ring when skipVisual is false; reworked skills
// create their dedicated sprite explicitly at the skill call site.

const updateBeforeSpriteVFX=update;
update=function(dt){
  updateBeforeSpriteVFX(dt);
  VFXSprites.update(dt);
};
