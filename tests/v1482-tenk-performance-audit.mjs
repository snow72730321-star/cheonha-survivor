import fs from "node:fs";
import assert from "node:assert/strict";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const v10=fs.readFileSync("js/vfx/v10.js","utf8");
assert.match(combat,/const oldCount=20\+a\.tenk\*8,count=14\+a\.tenk\*2/);
assert.match(combat,/damageScale=Math\.min\(2\.2,oldCount\/count\*\.88\)/);
assert.match(combat,/type:"skillSwordTenk".*life:\.68/s);
const tenkBlock=combat.slice(combat.indexOf("if(a.tenk&&cd.tenk<=0)"),combat.indexOf("if(a.dragonspin&&cd.dragonspin<=0)"));
assert.doesNotMatch(tenkBlock,/type:"ring"|type:"cross"/);
assert.match(combat,/source:"tenk",trail:0/);
assert.match(combat,/life:1\.7,source:"tenk"/);
assert.match(sprite,/skillSwordTenk:\{[^}]*fps:12/);
assert.match(sprite,/p\.source!=="tenk"&&\(p\.trail\|\|/);
assert.doesNotMatch(v10,/case "tenk":\s*addVisual/);
for(let lv=1;lv<=5;lv++){
  const oldCount=20+lv*8,count=14+lv*2;
  assert.ok(count>=16&&count<=24);
  const scale=Math.min(2.2,oldCount/count*.88);
  const relative=count*scale/oldCount;
  assert.ok(relative>=.87&&relative<=.89,`lv${lv} aggregate ratio ${relative}`);
}
console.log("v14.8.2 tenk performance audit: OK");
