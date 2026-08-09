import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('skillFistGoldenCharge:{id:"skillFistGoldenCharge",fw:822,fh:663,sourceX:562,sourceY:340,scale:.62,angleOffset:Math.PI}'),"charge facing correction missing");
ok(meta.includes('chargeRenderA=castA+Math.PI'),"charge render angle not shared by muzzle transform");
ok(meta.includes('mouthLocalX=(360-562)*chargeScale'),"dragon mouth X anchor missing");
ok(meta.includes('mouthLocalY=(382-340)*chargeScale'),"dragon mouth Y anchor missing");
ok(meta.includes('Math.cos(chargeRenderA)*mouthLocalX-Math.sin(chargeRenderA)*mouthLocalY'),"mouth X world transform missing");
ok(meta.includes('Math.sin(chargeRenderA)*mouthLocalX+Math.cos(chargeRenderA)*mouthLocalY'),"mouth Y world transform missing");
ok(meta.includes('type:"goldenDragonBeamStart",x:x0,y:y0,a:castA'),"beam does not start at transformed mouth point");
ok(meta.includes('const castX=player.x,castY=player.y,castA=a'),"installation cast snapshot missing");
console.log("v14.9.7 golden dragon mouth muzzle audit: OK");
