import fs from "node:fs";
import assert from "node:assert/strict";
const runtime=fs.readFileSync("js/systems/game-runtime-v14.js","utf8");
const abyss=fs.readFileSync("js/systems/abyss-mode-v14-8-7.js","utf8");
assert.match(runtime,/function abyssFiniteGrowthComplete\(\)/);
assert.match(runtime,/selectedDifficulty!=="abyss"/);
assert.match(runtime,/t\.damage<10/);
assert.match(runtime,/전체 피해 \+3% · 누적 최대 \+30%/);
assert.match(runtime,/player\.damageMul\*=exactStepRatio\(n,\.03,1\)/);
assert.match(runtime,/t\.haste<10/);
assert.match(runtime,/누적 최대 20%/);
assert.match(runtime,/t\.area<10/);
assert.match(runtime,/t\.vitality<10/);
assert.match(runtime,/t\.ultimate<10/);
assert.match(runtime,/id:"abyss_recover"/);
assert.match(abyss,/abyssTranscend=\{damage:0,haste:0,speed:0,area:0,vitality:0,ultimate:0\}/);
function ratio(level,step,sign=1){return (1+sign*step*level)/(1+sign*step*(level-1))}
let dmg=1,haste=1;
for(let i=1;i<=10;i++){dmg*=ratio(i,.03,1);haste*=ratio(i,.02,-1)}
assert.ok(Math.abs(dmg-1.3)<1e-12,`damage cap ${dmg}`);
assert.ok(Math.abs(haste-.8)<1e-12,`haste cap ${haste}`);
console.log("v14.8.8 abyss transcend audit: OK");
