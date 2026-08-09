import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const vfx=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(combat.includes('const range=150+lv*15,half=.58+lv*.012'),"복호권 range hotfix missing");
ok(combat.includes('knock:210+lv*15'),"복호권 knock missing");
ok(combat.includes('if(opt.knock){const n=d||1;e.pushX+=dx/n*opt.knock'),"coneHit knock implementation missing");
ok(combat.includes('range=178+a.taijifist*18')&&combat.includes('r:120'),"황룡각 range/VFX size hotfix missing");
ok(vfx.includes('skillFistTiger:{id:"skillFistTiger",fw:512,fh:206,sourceX:466')&&vfx.includes('scale:Math.max(.72,r/250)'),"복호권 orientation/scale missing");
ok(vfx.includes('skillFistDragonKick:{id:"skillFistDragonKick"')&&vfx.includes('scale:Math.max(.78,r/250)'),"황룡각 scale missing");
ok(vfx.includes('skillFistGoldenCharge:{id:"skillFistGoldenCharge",fw:822,fh:663,sourceX:562')&&vfx.includes('scale:.62'),"황룡진천 charge orientation missing");
ok(meta.includes('const castX=player.x,castY=player.y,castA=a'),"ultimate cast snapshot missing");
ok(meta.includes('const muzzle=58,x0=castX+Math.cos(castA)*muzzle'),"beam start is not close to fixed cast origin");
ok(meta.includes('x:castX,y:castY,a:castA')&&meta.includes('a:castA,len:beamLen'),"charge/beam are not tied to fixed cast transform");
console.log("v14.9.5 fist placement hotfix audit: OK");
