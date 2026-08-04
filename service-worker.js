"use strict";

/** v14.3.3 오프라인 캐시. 코드 업데이트는 네트워크 우선으로 즉시 반영한다. */
const CACHE="cheonha-v14-3-3-audio-mixer-sfx";
const APP_SHELL=[
  "./","index.html","manifest.webmanifest",
  "css/base.css","css/systems.css","css/remaster.css","css/mobile.css","css/animation-pass.css","css/awakening-cutscene.css","css/forge-v13.css","css/v14-improvements.css","css/audio-mixer-v14-3-3.css",
  "js/core/runtime-state.js","js/core/game-events.js","js/core/save-manager.js","js/core/asset-loader.js","js/core/pwa.js","js/core/startup.js",
  "js/data/balance-v14.js","js/data/characters-meta.js",
  "js/systems/spatial-grid.js","js/systems/object-pool.js","js/systems/content-registry.js","js/systems/storage-forge.js","js/systems/combat-runtime.js","js/systems/meta-combat.js","js/systems/forge-v13.js","js/systems/game-runtime-v14.js","js/systems/combat-progression-v14-3-1.js",
  "js/render/canvas-renderer.js","js/render/animation-controller.js","js/render/sprite-remaster.js",
  "js/ui/input.js","js/ui/menu-codex.js","js/ui/meta-menus-events.js","js/ui/advanced-settings-v14-3-3.js",
  "js/audio/audio-manager-v14-3-3.js","js/vfx/awakening-cutscene.js","js/vfx/awakening-cutscene-v14-3-2.js","js/vfx/v10.js","js/vfx/sprite-vfx.js",
  "js/skills/sword.js","js/skills/spear.js","js/skills/bow.js","js/skills/poison.js","js/skills/tao.js","js/skills/saber.js","js/skills/katana.js","js/skills/fist.js","js/boss/blood-demon.js",
  "assets/icons/icon-192.png","assets/icons/icon-512.png",
  "assets/audio/sfx/attack-bow.wav",
  "assets/audio/sfx/attack-fist.wav",
  "assets/audio/sfx/attack-katana.wav",
  "assets/audio/sfx/attack-poison.wav",
  "assets/audio/sfx/attack-saber.wav",
  "assets/audio/sfx/attack-spear.wav",
  "assets/audio/sfx/attack-sword.wav",
  "assets/audio/sfx/attack-tao.wav",
  "assets/audio/sfx/augment-open.wav",
  "assets/audio/sfx/augment-take.wav",
  "assets/audio/sfx/boss-hit.wav",
  "assets/audio/sfx/boss-spawn.wav",
  "assets/audio/sfx/defeat.wav",
  "assets/audio/sfx/dismantle.wav",
  "assets/audio/sfx/dodge.wav",
  "assets/audio/sfx/enemy-hit.wav",
  "assets/audio/sfx/equip.wav",
  "assets/audio/sfx/error.wav",
  "assets/audio/sfx/evolution.wav",
  "assets/audio/sfx/forge-failure.wav",
  "assets/audio/sfx/forge-strike.wav",
  "assets/audio/sfx/forge-success.wav",
  "assets/audio/sfx/gold-pickup.wav",
  "assets/audio/sfx/heal-pickup.wav",
  "assets/audio/sfx/hidden-ready.wav",
  "assets/audio/sfx/level-up.wav",
  "assets/audio/sfx/lightning.wav",
  "assets/audio/sfx/midboss-spawn.wav",
  "assets/audio/sfx/ore-pickup.wav",
  "assets/audio/sfx/perfect-dodge.wav",
  "assets/audio/sfx/pickup.wav",
  "assets/audio/sfx/player-hurt.wav",
  "assets/audio/sfx/refine.wav",
  "assets/audio/sfx/skill-learn.wav",
  "assets/audio/sfx/ui-click.wav",
  "assets/audio/sfx/ultimate-hit.wav",
  "assets/audio/sfx/ultimate-mid.wav",
  "assets/audio/sfx/ultimate-rise.wav",
  "assets/audio/sfx/victory.wav",
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
  "assets/vfx/weapons/arrow_green.png",
  "assets/vfx/weapons/fist_gold.png",
  "assets/vfx/weapons/needle_purple.png",
  "assets/vfx/weapons/slash_cyan.png",
  "assets/vfx/weapons/slash_red.png",
  "assets/vfx/weapons/spear_gold.png",
  "assets/vfx/weapons/sword_cyan.png"
];

const MEDIA_ASSETS=["assets/audio/battle-bgm.mp3"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    await cache.addAll(APP_SHELL);
    // 80MB 이상의 BGM은 저장 공간 제한으로 설치 전체가 실패하지 않도록 별도 최선 노력 캐시로 처리한다.
    await Promise.allSettled(MEDIA_ASSETS.map(asset=>cache.add(asset)));
  }).then(()=>self.skipWaiting()));
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
