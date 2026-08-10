import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('scale:.56,angleOffset:Math.PI,flipY:true,backwardOffset:124'),"charge scale/back tuning missing");
ok(meta.includes('beamWidth=(130+stacks*3.1)*player.areaMul'),"beam size increase missing");
ok(meta.includes('mouthLocalX=(174-562)*chargeScale'),"energy orb X anchor missing");
ok(meta.includes('mouthLocalY=-(381-340)*chargeScale'),"energy orb Y anchor missing");
ok(meta.includes('chargeBaseX=castX-Math.cos(castA)*chargeBack'),"charge and muzzle do not share backward transform");
ok(meta.includes('type:"goldenDragonBeamStart",x:x0,y:y0,a:castA'),"beam start not using transformed energy orb anchor");
console.log("v14.9.9 golden dragon charge/beam tuning audit: OK");