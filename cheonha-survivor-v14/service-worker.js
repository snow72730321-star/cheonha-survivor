"use strict";

/** v14 오프라인 캐시. 문서 요청과 정적 리소스의 실패 처리를 분리한다. */
const CACHE="cheonha-v14-stable-forge";
const APP_SHELL=[
  "./","index.html","manifest.webmanifest",
  "css/base.css","css/systems.css","css/remaster.css","css/mobile.css","css/animation-pass.css","css/awakening-cutscene.css","css/forge-v13.css","css/v14-improvements.css",
  "js/core/runtime-state.js","js/core/game-events.js","js/core/save-manager.js","js/core/asset-loader.js","js/core/pwa.js","js/core/startup.js",
  "js/data/balance-v14.js","js/data/characters-meta.js",
  "js/systems/spatial-grid.js","js/systems/object-pool.js","js/systems/content-registry.js","js/systems/storage-forge.js","js/systems/combat-runtime.js","js/systems/meta-combat.js","js/systems/forge-v13.js","js/systems/game-runtime-v14.js",
  "js/render/canvas-renderer.js","js/render/animation-controller.js","js/render/sprite-remaster.js",
  "js/ui/input.js","js/ui/menu-codex.js","js/ui/meta-menus-events.js","js/ui/advanced-settings.js",
  "js/audio/audio-manager.js","js/vfx/awakening-cutscene.js","js/vfx/v10.js",
  "js/skills/sword.js","js/skills/spear.js","js/skills/bow.js","js/skills/poison.js","js/skills/tao.js","js/skills/saber.js","js/skills/katana.js","js/skills/fist.js","js/boss/blood-demon.js",
  "assets/icons/icon-192.png","assets/icons/icon-512.png",
  "assets/characters/sword.png","assets/characters/spear.png","assets/characters/bow.png","assets/characters/poison.png","assets/characters/tao.png","assets/characters/saber.png","assets/characters/katana.png","assets/characters/fist.png",
  "assets/portraits/sword.png","assets/portraits/spear.png","assets/portraits/bow.png","assets/portraits/poison.png","assets/portraits/tao.png","assets/portraits/saber.png","assets/portraits/katana.png","assets/portraits/fist.png",
  "assets/enemies/bandit.png","assets/enemies/spear.png","assets/enemies/brute.png","assets/enemies/master.png","assets/enemies/assassin.png","assets/enemies/blackblade.png","assets/enemies/poisonhand.png","assets/enemies/ironmonk.png","assets/enemies/boss.png"
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

  // 문서 이동은 네트워크 우선, 실패 시에만 앱 셸을 반환한다.
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{
      const copy=response.clone();caches.open(CACHE).then(cache=>cache.put("index.html",copy));return response;
    }).catch(()=>caches.match("index.html")));
    return;
  }

  // JS/CSS/이미지는 캐시 우선 후 백그라운드 갱신한다. HTML을 리소스 대신 반환하지 않는다.
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(cached=>{
    const network=fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy))}
      return response;
    });
    return cached||network;
  }));
});
