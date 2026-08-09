import fs from "node:fs";
import assert from "node:assert/strict";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
assert.match(combat,/type:"skillSaberUnityMountain",x:player\.x,y:player\.y,a:ang,r:len/);
assert.match(sprite,/v\.type==="skillSaberUnityMountain"[\s\S]*scaleX=Math\.max\(\.32,r\/741\)/);
assert.match(sprite,/originOffset=368\.5\*scaleX/);
assert.match(sprite,/skillSaberUnityMountain"[\s\S]*flipX:true/);
console.log("v14.8.9 saber unity mountain direction audit: OK");
