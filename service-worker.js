const CACHE="cheonha-v12.3-player-render";
const FILES=["./", "index.html", "css/base.css", "css/systems.css", "css/remaster.css", "css/mobile.css", "js/core/runtime-state.js", "js/systems/storage-forge.js", "js/ui/menu-codex.js", "js/systems/combat-runtime.js", "js/render/canvas-renderer.js", "js/ui/input.js", "js/data/characters-meta.js", "js/systems/meta-combat.js", "js/ui/meta-menus-events.js", "js/render/sprite-remaster.js", "js/skills/sword.js", "js/skills/spear.js", "js/skills/bow.js", "js/skills/poison.js", "js/skills/tao.js", "js/skills/saber.js", "js/skills/katana.js", "js/skills/fist.js", "js/boss/blood-demon.js", "js/vfx/v10.js", "js/core/pwa.js", "js/core/startup.js"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(hit=>hit||caches.match("./")))
  );
});