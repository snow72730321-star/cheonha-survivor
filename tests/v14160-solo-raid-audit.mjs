import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const html=read("index.html");
const raid=read("js/systems/solo-raid-v14-16.js");
const css=read("css/solo-raid-v14-16.css");
const loader=read("js/core/asset-loader.js");
const save=read("js/core/save-manager.js");
const sw=read("service-worker.js");
const map=read("js/systems/world-map-v14-15.js");
const runtime=read("js/systems/game-runtime-v14.js");
const pkg=JSON.parse(read("package.json"));

assert.equal(pkg.version,"14.16.1");
assert.match(html,/content="v14\.16\.1-raid-three-phase" name="game-build"/);
assert.match(html,/css\/solo-raid-v14-16\.css\?v=14161/);
assert.match(html,/js\/systems\/solo-raid-v14-16\.js\?v=14161/);
for(const id of ["soloRaidOpen","soloRaidLobby","soloRaidStart","raidHud","raidStageText","raidTimerText","raidPartBars"]){
  assert.match(html,new RegExp(`id="${id}"`),`${id} UI missing`);
}
assert.match(css,/\.raid-pattern-warning/);
assert.match(css,/@media\(max-width:760px\)/);

assert.match(raid,/const START_LEVEL=20/);
assert.match(raid,/const GATE_LEVELS=\[8,9,10,10\]/);
assert.match(raid,/pendingLevelUps=START_LEVEL-1/);
assert.match(raid,/player\.hiddenReady\[art\.id\]=true/);
assert.match(raid,/player\.arts\[art\.id\]=1/);
assert.match(raid,/art\.onLearn\?\.\(player,1\)/);
assert.match(raid,/spawnTimer=Infinity;nextMiniBossAt=Infinity;finalBossAt=Infinity;runDuration=Infinity/);
assert.match(raid,/gainXp=function\(amount\)\{if\(raid\.active\)return/);
assert.match(raid,/금자\/경험치 획득 <b>0<\/b>/);

for(const name of ["도마종 단주 팽단휘","법마종 대주 남궁혁","검마종 종주 마허진","우호법 천단","천마(폭주)"]){
  assert.ok(raid.includes(name),`${name} missing`);
}
for(const gimmick of ["혈도세","사상법진","삼절검총","금강반진","cheonma-left-arm","cheonma-right-arm","cheonma-dragon","cheonma-body"]){
  assert.ok(raid.includes(gimmick),`${gimmick} gimmick missing`);
}
for(const pattern of ["혈도횡단","멸문도강","파천도진","봉마뢰","삼중법환","삼절검진","유성검락","항마벽력장","부동명왕진","좌측 마수 · 멸혼마광","우측 마수 · 마장폭발","양대 마수 · 교차멸진","마룡 · 멸세용식","마룡 · 마미천륜","마룡 · 육조마흔","마룡 · 삼중마식","천마 본체 · 천마멸세","천마 본체 · 군림마장","천마 본체 · 천마신장","천마 본체 · 마역붕괴"]){
  assert.ok(raid.includes(`name:"${pattern}"`),`${pattern} telegraph missing`);
}
assert.match(raid,/warning=Math\.max\(\.55/);
assert.match(raid,/if\(entity\.raidFinalArm&&raid\.finalPhase===1\).*startFinalPhaseTwo\(\)/s);
assert.match(raid,/if\(entity\.raidId==="cheonma-dragon"&&raid\.finalPhase===2\)\{startFinalPhaseThree\(\)/);
assert.match(raid,/raid\.finalCompletedDamage=raid\.finalPhaseMax\.arm\+raid\.finalPhaseMax\.dragon/);
assert.match(raid,/dealt=Math\.min\(raid\.finalPhaseMax\.arm,armDamage\)/);
assert.match(raid,/reason==="quit"\?0:Math\.max\(0,Math\.floor\(progress\*22\)\+\(win\?40:0\)\)/);
assert.match(raid,/progress>=4\.5/);
assert.match(raid,/stats\.bestProgress=Math\.max/);
assert.match(raid,/if\(win\)raid\.finalDamage=1/);
assert.match(raid,/runFinalized=true/);
assert.match(runtime,/if\(window\.SoloRaidMode\?\.active\)return false/);

const bossFiles=["peng-danhui.png","namgung-hyeok.png","ma-heojin.png","cheondan.png","cheonma-throne.png","cheonma-left-maqi-arm.png","cheonma-right-maqi-arm.png","cheonma-demon-dragon.png"];
for(const file of bossFiles){
  const path=`assets/raid/bosses/${file}`,data=fs.readFileSync(path);
  assert.equal(data.subarray(1,4).toString(),"PNG",`${file} is not PNG`);
  assert.ok(data.length>250_000,`${file} sprite quality/size too low`);
  assert.equal(data[25],6,`${file} must have RGBA transparency`);
  assert.ok(loader.includes(path)&&sw.includes(path)&&raid.includes(path),`${file} wiring/cache missing`);
}
const arena=fs.readFileSync("assets/raid/map/cheonma-altar.webp");
assert.equal(arena.subarray(0,4).toString(),"RIFF");
assert.ok(arena.length>100_000);
assert.ok(loader.includes("assets/raid/map/cheonma-altar.webp")&&sw.includes("assets/raid/map/cheonma-altar.webp"));

assert.match(save,/const VERSION=18/);
assert.match(save,/raidTokens:Math\.floor/);
assert.match(save,/bestFinalDamage:finite/);
assert.match(map,/SoloRaidMode\?\.active/);
assert.match(sw,/const CACHE="cheonha-v14-16-1-raid-three-phase"/);

console.log("v14.16.1 solo raid rules/assets/three-phase telegraph audit: OK");
