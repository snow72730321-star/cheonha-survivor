import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:1189,sourceY:278,scale:Math.max(.46,r/1304),flipX:true}'),"황룡십팔장 outward VFX direction missing");
ok(meta.includes('life:4.45,max:4.45')&&meta.includes('type:"skillFistGoldenCharge"'),"charge lifetime does not cover beam");
ok(sprite.includes('VFXSprites.draw(cfg.id,x,y,{age:animAge,loop:true')&&!sprite.includes('chargeCycle=26/16.67'),"charge loop playback missing");
ok(meta.includes('const chargeMuzzleOffset=96'),"energy-orb muzzle missing");
ok(meta.includes('beamWidth=(130+stacks*3.1)*player.areaMul'),"beam enlargement missing");
ok(combat.includes('type:"skillFistGoldenBeam"')&&combat.includes('life:3,max:3'),"beam duration missing");
console.log("v14.9.11 golden dragon VFX continuity audit: OK (superseded looping policy)");
