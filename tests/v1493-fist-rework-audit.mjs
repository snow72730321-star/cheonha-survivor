import fs from "node:fs";
const state=fs.readFileSync("js/core/runtime-state.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const vfx=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
function ok(x,m){if(!x)throw new Error(m)}
for(const n of ["복호권","백보신권","황룡각","황룡십팔장","만권일극"])ok(state.includes(n),`missing fist rework name: ${n}`);
for(const id of ["skillFistTiger","skillFistHundredShoot","skillFistHundredCombo","skillFistDragonKick","skillFistDragonKickCombo","skillFistGoldenDragon","skillFistToOneDefense","skillFistToOne","skillFistGoldenCharge","skillFistGoldenBeam"])ok(vfx.includes(id),`missing VFX ${id}`);
ok(combat.includes('source==="hundredstep"')&&combat.includes('"hundredstepCombo"'),"hundred fist splash missing");
ok(meta.includes('Math.min(20,n|0)')&&meta.includes('delta*.012'),"황룡 20-stack defense missing");
ok(meta.includes('player.tenThousandStacks>=10'),"만권 trigger threshold missing");
ok(meta.includes('setHuanglongStacks(0)'),"ultimate does not consume all 황룡");
ok(combat.includes('life:3,max:3')&&combat.includes('i<15')&&combat.includes('i*.2'),"3-second beam/ticks missing");
ok(vfx.includes('VFXSprites.draw("skillFistGoldenBeam"')&&vfx.includes('loop:true'),"beam loop exception missing");
console.log("v14.9.3 fist rework audit: OK");
