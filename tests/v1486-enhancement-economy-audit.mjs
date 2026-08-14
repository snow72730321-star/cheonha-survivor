import fs from "node:fs";
import assert from "node:assert/strict";
const forge=fs.readFileSync("js/systems/forge-v13.js","utf8");
const balance=fs.readFileSync("js/data/balance-v14.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
assert.match(forge,/lv>=20\?\.006:lv>=15\?\.012:\.05/);
assert.match(balance,/sura:\{[^}]*clearGold:8000,bossGold:4000,midBossGold:250/);
assert.match(combat,/d\.clearGold\?\?80\*d\.rank/);
assert.match(combat,/d\.bossGold\?\?90\*d\.rank/);
assert.match(combat,/midBossGold\?\?\(20\+8\*difficultyDefs\[selectedDifficulty\]\.rank\)/);
// Sura fixed ore drops: 19 midboss ores + 5 boss ores. Top-table expected sale value = 3028.2 each.
const oreExpected=.47*360+.32*1500+.17*6200+.035*25000+.005*90000;
const fixedOreCount=19+5;
const direct=8000+4000+19*250;
const runValue=direct+fixedOreCount*oreExpected;
assert.ok(runValue>88000&&runValue<91000,`sura run baseline ${runValue}`);
assert.ok(runValue*3>260000&&runValue*3<275000,`hourly baseline ${runValue*3}`);
console.log("v14.8.6 enhancement economy audit: OK",{runValue,hourly:runValue*3});
