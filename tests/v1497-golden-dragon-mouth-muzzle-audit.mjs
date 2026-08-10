import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('skillFistGoldenCharge:{id:"skillFistGoldenCharge",fw:822,fh:663,sourceX:174,sourceY:340,scale:.56,angleOffset:Math.PI,forwardOffset:96,upright:true}'),"charge energy-orb anchor missing");
ok(meta.includes('const chargeMuzzleOffset=96'),"fixed charge muzzle offset missing");
ok(meta.includes('const x0=castX+Math.cos(castA)*chargeMuzzleOffset'),"beam muzzle X not tied to cast axis");
ok(meta.includes('const y0=castY+Math.sin(castA)*chargeMuzzleOffset'),"beam muzzle Y not tied to cast axis");
ok(meta.includes('type:"goldenDragonBeamStart",x:x0,y:y0,a:castA'),"beam does not start at charge muzzle point");
ok(meta.includes('const castX=player.x,castY=player.y,castA=a'),"installation cast snapshot missing");
console.log("v14.9.7 golden dragon mouth muzzle audit: OK (superseded anchor policy)");
