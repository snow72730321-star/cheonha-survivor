import assert from "node:assert/strict";
import fs from "node:fs";

const read=file=>fs.readFileSync(file,"utf8");
const forge=read("js/systems/forge-v13.js");
const visuals=read("js/render/weapon-visuals-v14-4.js");
const forgeCss=read("css/forge-v13.css");
const improvements=read("css/v14-improvements.css");
const mobileCss=read("css/forge-mobile-final-v14-11-1.css");
const deviceCss=read("css/forge-mobile-v14-15-3-device-fix.css");
const html=read("index.html");
const sw=read("service-worker.js");

assert.match(html,/v14\.16\.2-raid-transcend/);
assert.match(html,/css\/v14-improvements\.css\?v=14162/);
assert.match(sw,/cheonha-v14-16-2-raid-transcend/);

for(const token of ["forge-sparks","forge-impact-flash","anvil-hammer","forge-fire"]){
  assert.doesNotMatch(forge,new RegExp(token),`legacy forge DOM remains: ${token}`);
  assert.doesNotMatch(forgeCss,new RegExp(token),`legacy forge CSS remains: ${token}`);
  assert.doesNotMatch(mobileCss,new RegExp(token),`legacy mobile forge CSS remains: ${token}`);
}
for(const token of ["anvilWeaponStrike","anvilWeaponSuccess","anvilWeaponFail","sparkBurst","impactFlash","successPulse","hammerStrike"]){
  assert.doesNotMatch(forgeCss,new RegExp(token),`legacy forge animation remains: ${token}`);
  assert.doesNotMatch(improvements,new RegExp(token),`legacy weapon animation remains: ${token}`);
}

assert.match(forge,/<div class="anvil-weapon" id="anvilWeapon"><div class="anvil-weapon-media"><img class="anvil-weapon-img"/);
assert.match(forge,/function renderAnvilSelection\(/);
assert.match(forge,/if\(window\.WeaponVisuals\)WeaponVisuals\.renderAnvilWeapon\(node,item\)/);
assert.match(forge,/if\(effect\)scene\.classList\.add\(effect\);\s*renderAnvilSelection\(scene\)/);
assert.match(visuals,/const primary=hudAsset\(item\),fallback=asset\(item\)/);
assert.match(visuals,/img\.onerror=\(\)=>[\s\S]*?img\.src=fallback/);
assert.match(deviceCss,/#anvilScene\.anvil-scene\.art-anvil-scene \.anvil-weapon\{[\s\S]*?z-index:10!important[\s\S]*?opacity:1!important[\s\S]*?visibility:visible!important/);
assert.match(deviceCss,/\.anvil-weapon-media>\.anvil-weapon-img\{[\s\S]*?display:block!important[\s\S]*?opacity:1!important[\s\S]*?visibility:visible!important/);
assert.match(deviceCss,/\.forge-success-vfx\{z-index:6!important\}/);

for(const family of ["sword","spear","bow","poison","tao","saber","katana","fist"]){
  assert.ok(fs.existsSync(`assets/weapons/hud/${family}.png`),`missing forge HUD weapon: ${family}`);
  assert.ok(fs.existsSync(`assets/weapons/master/${family}.png`),`missing forge fallback weapon: ${family}`);
}

console.log("v14.16.2 legacy forge effect removal + weapon visibility audit: OK");
