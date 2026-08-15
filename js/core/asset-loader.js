"use strict";

/**
 * v14.2 통합 이미지 에셋 저장소.
 *
 * 이전 버전은 부팅 검사기와 실제 렌더러가 서로 다른 Image 객체를 만들었다.
 * Safari/PWA 캐시 상태에 따라 검사에서는 성공했지만 렌더러 객체는 아직 로드되지 않아
 * 코드 생성 캐릭터로 되돌아가는 상황을 막기 위해 모든 시스템이 같은 Image 객체를 공유한다.
 */
const GameAssets=(()=>{
  const BUILD="v14.11.2-forge-economy-katana";
  const characterIds=["sword","spear","bow","poison","tao","saber","katana","fist"];
  const enemyIds=["bandit","spear","brute","master","assassin","blackblade","ironmonk","poisonhand","boss"];
  const weaponVisualIds=["sword","spear","bow","poison","tao","saber","katana","fist"];
  const vfxFiles=[
    "assets/vfx/common/beam_blue.png",
    "assets/vfx/common/beam_red.png",
    "assets/vfx/common/blade.png",
    "assets/vfx/common/explosion_blood.png",
    "assets/vfx/common/explosion_fire.png",
    "assets/vfx/common/hit_spark_blue.png",
    "assets/vfx/common/hit_spark_gold.png",
    "assets/vfx/common/hit_spark_red.png",
    "assets/vfx/common/shockwave_blue.png",
    "assets/vfx/common/shockwave_red.png",
    "assets/vfx/common/smoke.png",
    "assets/vfx/common/spark.png",
    "assets/vfx/common/trail_blue.png",
    "assets/vfx/common/trail_gold.png",
    "assets/vfx/magic/blood_orb.png",
    "assets/vfx/magic/dragon_wave.png",
    "assets/vfx/magic/fire_orb.png",
    "assets/vfx/magic/lightning_blue.png",
    "assets/vfx/magic/magic_circle_blue.png",
    "assets/vfx/magic/magic_circle_red.png",
    "assets/vfx/magic/moon_orb.png",
    "assets/vfx/magic/poison_cloud.png",
    "assets/vfx/weapons/arrow_green.png",
    "assets/vfx/weapons/fist_gold.png",
    "assets/vfx/weapons/needle_purple.png",
    "assets/vfx/weapons/slash_cyan.png",
    "assets/vfx/weapons/slash_red.png",
    "assets/vfx/weapons/spear_gold.png",
    "assets/vfx/weapons/sword_cyan.png",
    "assets/vfx/skills/sword/meteor_rain.png",
    "assets/vfx/skills/sword/taiji_array.png",
    "assets/vfx/skills/sword/ten_thousand.png",
    "assets/vfx/skills/spear/dragon_spin.png",
    "assets/vfx/skills/spear/overlord.png",
    "assets/vfx/skills/spear/starfall.png",
    "assets/vfx/skills/bow/arrow_rain.png",
    "assets/vfx/skills/bow/ricochet_seal.png",
    "assets/vfx/skills/bow/sunmoon_burst.png",
    "assets/vfx/skills/poison/butterfly.png",
    "assets/vfx/skills/poison/butterfly_explosion.png",
    "assets/vfx/skills/poison/demon_mist.png",
    "assets/vfx/skills/poison/latent_explosion.png",
    "assets/vfx/skills/poison/stingrain_explosion.png",
    "assets/vfx/skills/tao/fire_dragon.png",
    "assets/vfx/skills/tao/five_thunder.png",
    "assets/vfx/skills/tao/ice_array.png",
    "assets/vfx/skills/saber/heavenly_demon_descent.png",
    "assets/vfx/skills/saber/mountain_split.png",
    "assets/vfx/skills/saber/thunder_fan.png",
    "assets/vfx/skills/saber/unity_mountain.png",
    "assets/vfx/skills/saber/unity_thunder.png",
    "assets/vfx/skills/saber/whirlwind.png",
    "assets/vfx/skills/katana/moon_chain.png",
    "assets/vfx/skills/katana/nameless_cuts.png",
    "assets/vfx/skills/katana/zanshin.png",
    "assets/ui/katana/full_moon_stack.png",
    "assets/ui/katana/moonflower.png",
    "assets/ui/katana/star_sheet.png",
    "assets/ui/katana/star_ring.png",
    "assets/ui/katana/moon_scar_stack.png",
    "assets/vfx/skills/katana/full_moon.sheet.png",
    "assets/vfx/skills/katana/moon_scar_burst.sheet.png",
    "assets/vfx/skills/katana/moon_execute.sheet.png",
    "assets/vfx/skills/katana/silver_moon_hit.sheet.png",
    "assets/vfx/skills/katana/balwol.sheet.png",
    "assets/vfx/skills/katana/balwol_echo.sheet.png",
    "assets/vfx/skills/katana/moon_sword_1.sheet.png",
    "assets/vfx/skills/katana/moon_sword_2.sheet.png",
    "assets/vfx/skills/katana/moon_sword_3.sheet.png",
    "assets/vfx/skills/katana/chamwol.sheet.png",
    "assets/vfx/skills/katana/jeolwol.sheet.png",
    "assets/vfx/skills/katana/moon_buff.sheet.png",
    "assets/vfx/skills/katana/time_space_cut.sheet.png",
    "assets/vfx/skills/katana/gyeonghwa_suwol.sheet.png",
    "assets/vfx/skills/fist/dragon_return.png",
    "assets/vfx/skills/fist/hundred_step.png",
    "assets/vfx/skills/fist/iron_mountain.png",
    "assets/vfx/skills/fist/taiji_vortex.png",
    "assets/vfx/skills/fist/tiger_fist.png",
    "assets/vfx/skills/fist/hundred_fist_shoot.png",
    "assets/vfx/skills/fist/hundred_fist_combo.png",
    "assets/vfx/skills/fist/dragon_kick.png",
    "assets/vfx/skills/fist/dragon_kick_combo.png",
    "assets/vfx/skills/fist/golden_dragon_fist.png",
    "assets/vfx/skills/fist/fist_to_one_defense.png",
    "assets/vfx/skills/fist/fist_to_one.png",
    "assets/vfx/skills/fist/golden_dragon_charge.png",
    "assets/vfx/skills/fist/golden_dragon_beam.png",
    "assets/vfx/crests/bow_crest.png",
    "assets/vfx/crests/fist_crest.png",
    "assets/vfx/crests/katana_crest.png",
    "assets/vfx/crests/poison_crest.png",
    "assets/vfx/crests/saber_crest.png",
    "assets/vfx/crests/spear_crest.png",
    "assets/vfx/crests/sword_crest.png",
    "assets/vfx/crests/tao_crest.png",
  ];
  const files=[
    ...characterIds.map(id=>`assets/characters/${id}.png`),
    ...characterIds.map(id=>`assets/portraits/${id}.png`),
    ...enemyIds.map(id=>`assets/enemies/${id}.png`),
    ...weaponVisualIds.map(id=>`assets/weapons/master/${id}.png`),
    ...weaponVisualIds.map(id=>`assets/weapons/hud/${id}.png`),
    // 발동형 무공과 보스 패턴도 캐릭터와 동일한 공유 Image 저장소를 사용한다.
    ...vfxFiles
  ];

  const images=new Map();
  const status=new Map();
  const pending=new Map();

  /** GitHub Pages의 저장소 하위 경로를 보존한 절대 URL을 만든다. */
  function url(src){
    // 실제 브라우저에서는 URL 생성자로 저장소 하위 경로를 정확히 보존한다.
    if(typeof URL==="function"){
      const resolved=new URL(src,document.baseURI);
      resolved.searchParams.set("assetBuild",BUILD);
      return resolved.href;
    }
    // 테스트 환경처럼 URL 생성자가 없는 경우에도 상대 경로와 캐시 버전은 유지한다.
    const separator=String(src).includes("?")?"&":"?";
    return `${src}${separator}assetBuild=${BUILD}`;
  }

  /** 경로마다 Image 객체를 정확히 하나만 생성한다. */
  function image(src){
    if(images.has(src))return images.get(src);
    const instance=new Image();
    instance.decoding="async";
    instance.dataset.assetPath=src;
    images.set(src,instance);
    return instance;
  }

  /**
   * 이미지를 한 번만 요청하고 모든 호출자가 같은 Promise를 기다리게 한다.
   * onload 속성을 덮어쓰지 않고 addEventListener를 사용해 메뉴 갱신 리스너와 공존한다.
   */
  function load(src){
    if(pending.has(src))return pending.get(src);
    const instance=image(src);
    const task=new Promise(resolve=>{
      let settled=false;
      let retriedRaw=false;
      const finish=ok=>{
        if(settled)return;settled=true;
        const result={ok,width:instance.naturalWidth||0,height:instance.naturalHeight||0,url:instance.currentSrc||instance.src,path:src,retriedRaw};
        status.set(src,result);
        resolve(result);
      };
      const onLoad=()=>finish(instance.naturalWidth>0);
      const onError=()=>{
        // Safari/PWA가 assetBuild 쿼리가 붙은 이미지 요청만 간헐적으로 실패하는 경우
        // 실제 파일의 상대경로를 동일 Image 객체에서 한 번 더 요청한다.
        if(!retriedRaw){retriedRaw=true;instance.src=src;return;}
        finish(false);
      };
      instance.addEventListener("load",onLoad,{once:false});
      instance.addEventListener("error",onError,{once:false});
      instance.src=url(src);
      if(instance.complete&&instance.naturalWidth)queueMicrotask(onLoad);
    });
    pending.set(src,task);
    return task;
  }

  async function preload(onProgress=()=>{}){
    let done=0;
    await Promise.all(files.map(async src=>{
      await load(src);done++;onProgress(done,files.length,src);
    }));
    const failed=[...status.entries()].filter(([,value])=>!value.ok).map(([src])=>src);
    return {total:files.length,failed,status,images};
  }

  const character=id=>image(`assets/characters/${id}.png`);
  const portrait=id=>image(`assets/portraits/${id}.png`);
  const enemy=id=>image(`assets/enemies/${id}.png`);
  const isReady=src=>Boolean(status.get(src)?.ok&&image(src).naturalWidth);

  return Object.freeze({BUILD,preload,load,image,character,portrait,enemy,isReady,status,files,url});
})();
