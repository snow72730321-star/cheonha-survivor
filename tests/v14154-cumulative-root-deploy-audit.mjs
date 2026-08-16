import assert from "node:assert/strict";
import fs from "node:fs";

const read=file=>fs.readFileSync(file,"utf8");
const html=read("index.html");
const sw=read("service-worker.js");
const forge=read("js/systems/forge-v13.js");
const visuals=read("js/render/weapon-visuals-v14-4.js");
const css=read("css/forge-mobile-v14-15-3-device-fix.css");

assert.equal(read("BUILD.txt").split(/\r?\n/)[0],"v14.15.6-cumulative-root");
assert.match(html,/forge-mobile-v14-15-3-device-fix\.css\?v=14156/);
assert.match(html,/js\/systems\/forge-v13\.js\?v=14156/);
assert.match(html,/js\/render\/weapon-visuals-v14-4\.js\?v=14156/);
assert.match(html,/js\/systems\/katana-rework-v15\.js\?v=14156/);
assert.match(sw,/cheonha-v14-15-6-cumulative-root/);
assert.match(sw,/cache\.addAll\(/);
assert.doesNotMatch(sw,/Promise\.allSettled/);
assert.match(sw,/if\(!response\.ok\)throw new Error/);
assert.match(forge,/function setAnvilEffect\(scene,effect=""\)/);
assert.doesNotMatch(forge,/scene\.className="anvil-scene/);
assert.match(visuals,/\.anvil-weapon-media/);
assert.doesNotMatch(visuals,/node\.innerHTML=`<div class="anvil-weapon-aura"/);
assert.match(css,/#anvilScene\.anvil-scene\.art-anvil-scene/);
assert.match(css,/\.anvil-weapon-media>/);

const shell=[...sw.matchAll(/"([^"\n]+\.(?:css|js|webmanifest|json|png|webp))"/g)].map(match=>match[1]);
for(const file of shell)assert.ok(fs.existsSync(file),`service-worker required file missing: ${file}`);

console.log("v14.15.6 cumulative root deploy audit: OK");
