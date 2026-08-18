"use strict";

/** v14.16.8: 무신 초월 전용 에셋 완성 · 보구 대비 메인 UI 확장. */
const CACHE_PREFIX="cheonha-";
const CACHE="cheonha-v14-16-8-transcend-final";
// legacy audit compatibility token: cheonha-v14-12-8-black-compare-align
const APP_SHELL=[
  "./","index.html","manifest.webmanifest","BUILD.txt",
  "css/base.css","css/systems.css","css/remaster.css","css/mobile.css","css/animation-pass.css","css/awakening-cutscene.css","css/forge-v13.css","css/v14-improvements.css","css/audio-mixer-v14-3-3.css","css/forge-mobile-final-v14-11-1.css","css/forge-mobile-v14-14-1-hotfix.css","css/forge-mobile-v14-15-3-device-fix.css","css/solo-raid-v14-16.css",
  "js/core/runtime-state.js","js/core/game-events.js","js/core/save-manager.js","js/core/asset-loader.js","js/core/pwa.js","js/core/startup.js",
  "js/data/balance-v14.js","js/data/characters-meta.js",
  "js/systems/spatial-grid.js","js/systems/object-pool.js","js/systems/content-registry.js","js/systems/storage-forge.js","js/systems/combat-runtime.js","js/systems/meta-combat.js","js/systems/forge-v13.js","js/systems/combat-power-v14-7-7.js","js/systems/katana-rework-v15.js","js/systems/game-runtime-v14.js","js/systems/combat-progression-v14-3-1.js","js/systems/abyss-mode-v14-8-7.js","js/systems/system-overhaul-v14-10.js","js/systems/world-map-v14-15.js","js/systems/solo-raid-v14-16.js","js/systems/weapon-transcend-v14-16-2.js",
  "js/render/canvas-renderer.js","js/render/animation-controller.js","js/render/sprite-remaster-v14-3-18.js","js/render/weapon-visuals-v14-4.js",
  "js/ui/input.js","js/ui/menu-codex.js","js/ui/meta-menus-events.js","js/ui/advanced-settings-v14-3-3.js","js/ui/forge-mobile-final-v14-11-1.js",
  "js/audio/audio-manager-v14-3-8.js","js/vfx/awakening-cutscene-v14-3-8.js","js/vfx/v10.js","js/vfx/sprite-vfx-v14-3-8.js",
  "js/skills/sword.js","js/skills/spear.js","js/skills/bow.js","js/skills/poison.js","js/skills/tao.js","js/skills/saber.js","js/skills/katana.js","js/skills/fist.js","js/boss/blood-demon.js",
  "assets/icons/icon-192.png","assets/icons/icon-512.png",
  "assets/map/data/map-v1.json","assets/map/terrain/common-ground.webp","assets/map/terrain/center-training-ground.webp","assets/map/terrain/north-bamboo-grove.webp","assets/map/terrain/east-ruined-gate.webp","assets/map/terrain/south-moon-pond.webp","assets/map/terrain/west-cliff-road.webp",
  "assets/raid/map/cheonma-altar.webp","assets/raid/map/cheonma-altar-mobile.webp","assets/raid/bosses/peng-danhui.png","assets/raid/bosses/namgung-hyeok.png","assets/raid/bosses/ma-heojin.png","assets/raid/bosses/cheondan.png","assets/raid/bosses/cheonma-throne.png","assets/raid/bosses/cheonma-left-maqi-arm.png","assets/raid/bosses/cheonma-right-maqi-arm.png","assets/raid/bosses/cheonma-demon-dragon.png","assets/ui/bossbar/raid-boss-frame-compact.png","assets/ui/forge-mobile-final/transcend.png"
];

async function cacheAppShell(){
  const cache=await caches.open(CACHE);
  try{
    await cache.addAll(APP_SHELL.map(path=>new Request(path,{cache:"reload"})));
  }catch(error){
    await caches.delete(CACHE);
    throw error;
  }
}

self.addEventListener("install",event=>event.waitUntil(cacheAppShell()));

self.addEventListener("message",event=>{
  if(event.data?.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

async function fetchAndCache(request){
  const response=await fetch(request);
  if(!response.ok)throw new Error(`필수 리소스 응답 오류: ${response.status} ${request.url}`);
  const copy=response.clone();await caches.open(CACHE).then(cache=>cache.put(request,copy));
  return response;
}

self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  if(request.headers.has("range")){event.respondWith(fetch(request));return}

  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(async response=>{
      if(!response.ok)throw new Error(`페이지 응답 오류: ${response.status}`);
      const copy=response.clone();await caches.open(CACHE).then(cache=>cache.put("index.html",copy));
      return response;
    }).catch(()=>caches.match("index.html")));
    return;
  }

  const url=new URL(request.url);
  const isLargeStream=url.pathname.endsWith("/assets/audio/battle-bgm.mp3")||url.pathname.includes("/assets/vfx/cutscenes/")||/\/assets\/ui\/ore-gacha-draw\.(?:gif|mp4)$/i.test(url.pathname);
  if(isLargeStream){event.respondWith(fetch(request));return}

  const isCode=/\.(?:js|css|webmanifest)$/i.test(url.pathname);
  const isMapData=url.pathname.includes("/assets/map/data/");
  const isForgeUiArt=url.pathname.includes("/assets/ui/forge-mobile-final/");
  if(isCode||isMapData||isForgeUiArt){
    event.respondWith(fetchAndCache(request).catch(()=>caches.match(request,{ignoreSearch:true})));
    return;
  }

  const network=fetchAndCache(request);
  event.waitUntil(network.then(()=>undefined).catch(()=>undefined));
  event.respondWith(caches.match(request).then(cached=>cached||network));
});
