"use strict";

/** v14.3.16 캐릭터 전체 프레임·하단 잘림 보정 오프라인 캐시. 대용량 BGM은 스트리밍하고 SFX는 최초 사용 뒤 캐시한다. */
const CACHE="cheonha-v14-3-16-sprite-fullbody-fix";
const APP_SHELL=[
  "./","index.html","manifest.webmanifest",
  "css/base.css","css/systems.css","css/remaster.css","css/mobile.css","css/animation-pass.css","css/awakening-cutscene.css","css/forge-v13.css","css/v14-improvements.css","css/audio-mixer-v14-3-3.css",
  "js/core/runtime-state.js","js/core/game-events.js","js/core/save-manager.js","js/core/asset-loader.js","js/core/pwa.js","js/core/startup.js",
  "js/data/balance-v14.js","js/data/characters-meta.js",
  "js/systems/spatial-grid.js","js/systems/object-pool.js","js/systems/content-registry.js","js/systems/storage-forge.js","js/systems/combat-runtime.js","js/systems/meta-combat.js","js/systems/forge-v13.js","js/systems/game-runtime-v14.js","js/systems/combat-progression-v14-3-1.js",
  "js/render/canvas-renderer.js","js/render/animation-controller.js","js/render/sprite-remaster-v14-3-16.js",
  "js/ui/input.js","js/ui/menu-codex.js","js/ui/meta-menus-events.js","js/ui/advanced-settings-v14-3-3.js",
  "js/audio/audio-manager-v14-3-8.js","js/vfx/awakening-cutscene.js","js/vfx/awakening-cutscene-v14-3-8.js","js/vfx/v10.js","js/vfx/sprite-vfx-v14-3-8.js",
  "js/skills/sword.js","js/skills/spear.js","js/skills/bow.js","js/skills/poison.js","js/skills/tao.js","js/skills/saber.js","js/skills/katana.js","js/skills/fist.js","js/boss/blood-demon.js",
  "assets/icons/icon-192.png","assets/icons/icon-512.png",
  "assets/characters/sword.png","assets/characters/spear.png","assets/characters/bow.png","assets/characters/poison.png","assets/characters/tao.png","assets/characters/saber.png","assets/characters/katana.png","assets/characters/fist.png",
  "assets/portraits/sword.png","assets/portraits/spear.png","assets/portraits/bow.png","assets/portraits/poison.png","assets/portraits/tao.png","assets/portraits/saber.png","assets/portraits/katana.png","assets/portraits/fist.png",
  "assets/enemies/bandit.png","assets/enemies/spear.png","assets/enemies/brute.png","assets/enemies/master.png","assets/enemies/assassin.png","assets/enemies/blackblade.png","assets/enemies/poisonhand.png","assets/enemies/ironmonk.png","assets/enemies/boss.png",
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
  "assets/vfx/crests/sword_crest.png",
  "assets/vfx/crests/spear_crest.png",
  "assets/vfx/crests/bow_crest.png",
  "assets/vfx/crests/poison_crest.png",
  "assets/vfx/crests/tao_crest.png",
  "assets/vfx/crests/saber_crest.png",
  "assets/vfx/crests/katana_crest.png",
  "assets/vfx/crests/fist_crest.png",
  "assets/vfx/weapons/arrow_green.png",
  "assets/vfx/weapons/saber_heavy_arc.png",
  "assets/vfx/weapons/fist_gold.png",
  "assets/vfx/weapons/needle_purple.png",
  "assets/vfx/weapons/slash_cyan.png",
  "assets/vfx/weapons/slash_red.png",
  "assets/vfx/weapons/spear_gold.png",
  "assets/vfx/weapons/sword_cyan.png",
  "assets/vfx/skills/bow_arrow_rain.png",
  "assets/vfx/skills/bow_sunmoon_burst.png",
  "assets/vfx/skills/fist_dragon_return.png",
  "assets/vfx/skills/fist_hundred_step.png",
  "assets/vfx/skills/fist_iron_mountain.png",
  "assets/vfx/skills/fist_taiji_vortex.png",
  "assets/vfx/skills/katana_moon_chain.png",
  "assets/vfx/skills/katana_nameless_cuts.png",
  "assets/vfx/skills/katana_zanshin.png",
  "assets/vfx/skills/poison_lifedeath_seal.png",
  "assets/vfx/skills/poison_miasma_bloom.png",
  "assets/vfx/skills/poison_thousand_fan.png",
  "assets/vfx/skills/saber_demon_wheel.png",
  "assets/vfx/skills/saber_mountain_split.png",
  "assets/vfx/skills/saber_thunder_fan.png",
  "assets/vfx/skills/saber_whirlwind.png",
  "assets/vfx/skills/spear_dragon_spin.png",
  "assets/vfx/skills/spear_overlord.png",
  "assets/vfx/skills/spear_starfall.png",
  "assets/vfx/skills/sword_meteor_rain.png",
  "assets/vfx/skills/sword_taiji_array.png",
  "assets/vfx/skills/sword_ten_thousand.png",
  "assets/vfx/skills/tao_fire_dragon.png",
  "assets/vfx/skills/tao_five_thunder.png",
  "assets/vfx/skills/tao_ice_array.png"
];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  // 대용량 MP3의 Range 응답(206)은 Cache Storage에 직접 넣을 수 없으므로 네트워크에 위임한다.
  if(request.headers.has("range")){event.respondWith(fetch(request));return}

  // 문서 이동은 네트워크 우선, 실패 시에만 앱 셸을 반환한다.
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("index.html",copy));return response;
    }).catch(()=>caches.match("index.html")));
    return;
  }

  const url=new URL(request.url);

  // 80MB 이상의 전투 BGM은 Cache Storage에 복제하지 않고 Range 스트리밍만 사용한다.
  if(url.pathname.endsWith("/assets/audio/battle-bgm.mp3")){event.respondWith(fetch(request));return}

  const isCode=/\.(?:js|css|webmanifest)$/i.test(url.pathname);

  // JS/CSS/매니페스트는 네트워크 우선으로 배포 직후 구버전 코드가 한 번 더 실행되는 문제를 막는다.
  if(isCode){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
      return response;
    }).catch(()=>caches.match(request)));
    return;
  }

  // 이미지 등 불변 에셋은 캐시 우선 후 백그라운드 갱신한다.
  event.respondWith(caches.match(request).then(cached=>{
    const network=fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
      return response;
    });
    return cached||network;
  }));
});
