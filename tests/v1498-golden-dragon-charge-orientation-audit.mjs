import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('forwardOffset:96,upright:true'),"charge forward muzzle/upright policy missing");
ok(sprite.includes('const flipY=cfg.upright?Math.cos(a)>=0:!!cfg.flipY'),"half-plane upright flip missing");
ok(sprite.includes('baseX=v.x+Math.cos(a)*(forward-back)'),"directional placement base missing");
ok(meta.includes('chargeMuzzleOffset=96'),"muzzle transform forward offset missing");
ok(meta.includes('x0=castX+Math.cos(castA)*chargeMuzzleOffset'),"fixed cast forward muzzle missing");
console.log("v14.9.8 golden dragon charge orientation audit: OK (superseded upright policy)");
