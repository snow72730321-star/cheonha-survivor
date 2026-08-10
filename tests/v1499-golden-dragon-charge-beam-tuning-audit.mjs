import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('sourceX:180,sourceY:384,scale:.56,angleOffset:Math.PI,forwardOffset:96,upright:true'),"charge orb-anchor tuning missing");
ok(meta.includes('beamWidth=(130+stacks*3.1)*player.areaMul'),"beam size increase missing");
ok(meta.includes('const chargeMuzzleOffset=96'),"energy orb forward anchor missing");
ok(meta.includes('type:"goldenDragonBeamStart",x:x0,y:y0,a:castA'),"beam start not using energy-orb anchor");
console.log("v14.9.9 golden dragon charge/beam tuning audit: OK (superseded direct-anchor policy)");
