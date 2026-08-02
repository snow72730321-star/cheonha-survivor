const CACHE="cheonha-v13-forge";
const FILES=[
 "./","index.html","manifest.webmanifest",
 "css/base.css","css/systems.css","css/remaster.css","css/mobile.css","css/animation-pass.css","css/awakening-cutscene.css","css/forge-v13.css",
 "js/core/runtime-state.js","js/systems/storage-forge.js","js/ui/menu-codex.js","js/systems/combat-runtime.js","js/render/canvas-renderer.js","js/ui/input.js","js/data/characters-meta.js","js/systems/meta-combat.js","js/ui/meta-menus-events.js","js/systems/forge-v13.js","js/render/sprite-remaster.js","js/audio/audio-manager.js","js/vfx/awakening-cutscene.js","js/vfx/v10.js","js/core/pwa.js","js/core/startup.js"
];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 event.respondWith(fetch(event.request).then(response=>{
   const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;
 }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./"))));
});
