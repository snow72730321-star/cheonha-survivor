import fs from "node:fs";
import assert from "node:assert/strict";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const chars=fs.readFileSync("js/data/characters-meta.js","utf8");
const vfx=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const loader=fs.readFileSync("js/core/asset-loader.js","utf8");
for(const f of ["assets/vfx/skills/saber/unity_thunder.png","assets/vfx/skills/saber/whirlwind.png","assets/vfx/skills/saber/unity_mountain.png"]){assert.ok(fs.existsSync(f),`missing ${f}`);assert.ok(loader.includes(f),`not preloaded ${f}`)}
assert.match(chars,/saber:\{name:"마련화",title:"소천마도",ultimate:"천마합일"/);
assert.match(chars,/player\.saberUnityTimer=15/);
assert.doesNotMatch(chars,/for\(let i=0;i<5;i\+\+\).*lineHit.*"ultimate"/s,"천마합일에 구형 5방향 천마참이 남아 있음");
assert.match(combat,/range=\(100\+lv\*12\)\*saberHeavenRangeMul\(\)/);
assert.match(chars,/player\.fireTimer=Math\.min/);
assert.match(chars,/trueUnity&&player\.cooldowns/);
assert.match(combat,/trueUnity=saberTrueUnityActive\(\)/);
assert.match(combat,/type:"skillSaberUnityThunder"/);
assert.match(combat,/type:"skillSaberWhirlwindUser"/);
assert.match(combat,/type:"skillSaberUnityMountain"/);
assert.match(combat,/damage=\(20\+lv\*7\)\*\(trueUnity\?1\.35:1\)/);
assert.match(combat,/trueUnity\?\.75:unity\?\.80:1/);
assert.match(vfx,/skillSaberUnityThunder:\{src:"assets\/vfx\/skills\/saber\/unity_thunder\.png"/);
assert.match(vfx,/skillSaberWhirlwindUser:\{src:"assets\/vfx\/skills\/saber\/whirlwind\.png"/);
assert.match(vfx,/skillSaberUnityMountain:\{src:"assets\/vfx\/skills\/saber\/unity_mountain\.png"/);
assert.ok(!combat.includes('showMessage("소천마도",1)'),"title leaked into hidden skill message");
console.log("saber unity runtime audit: ok");

assert.match(chars,/return "진천마합일"/);
assert.match(chars,/player\.saberUnityTrue=trueUnity/);
