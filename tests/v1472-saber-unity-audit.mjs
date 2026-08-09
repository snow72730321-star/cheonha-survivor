import fs from "node:fs";
import assert from "node:assert/strict";
const chars=fs.readFileSync("js/data/characters-meta.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const loader=fs.readFileSync("js/core/asset-loader.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const v10=fs.readFileSync("js/vfx/v10.js","utf8");
const sw=fs.readFileSync("service-worker.js","utf8");
assert.match(chars,/unityGain=\(\(player\.saberUnityTimer\|\|0\)>0&&selectedWeapon==="saber"&&player\.saberUnityTrue\)\?\.5:1/);
assert.match(chars,/Math\.min\(4,dealt\*\.08\)/);
assert.match(chars,/player\.saberUnityTimer=15/);
assert.match(combat,/source:"?demon"?|"demon"/);
assert.match(combat,/"demon",\{knock:300,shake:14,color:"#a82e35",width:9,skipVisual:true\}/);
for(const [name,text] of [["loader",loader],["sprite",sprite],["v10",v10],["sw",sw]]){
  assert.doesNotMatch(text,/saber_demon_wheel|skillSaberDemon/,`${name}: demon wheel legacy ref remains`);
}
console.log("v14.7.2 saber unity audit: ok");

assert.match(chars,/name:"천마신공"|return "진천마합일"/);
