import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:115,sourceY:278,scale:Math.max(.46,r/1304)}'),"황룡십팔장 native VFX direction missing");
ok(!sprite.includes('skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:115,sourceY:278,scale:Math.max(.46,r/1304),angleOffset:Math.PI}'),"황룡십팔장 VFX remains 180 rotated");
ok(meta.includes('life:4.45,max:4.45')&&meta.includes('type:"skillFistGoldenCharge"'),"charge lifetime does not cover beam");
ok(sprite.includes('if(v.type==="skillFistGoldenCharge")')&&sprite.includes('frame:25'),"charge final-frame hold missing");
ok(meta.includes('mouthLocalX=(174-562)*chargeScale')&&meta.includes('mouthLocalY=-(381-340)*chargeScale'),"marked energy-orb muzzle missing");
ok(meta.includes('beamWidth=(130+stacks*3.1)*player.areaMul'),"beam enlargement missing");
ok(combat.includes('type:"skillFistGoldenBeam"')&&combat.includes('life:3,max:3'),"beam duration missing");
console.log("v14.9.11 golden dragon VFX continuity audit: OK");