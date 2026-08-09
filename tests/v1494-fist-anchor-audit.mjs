import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
for(const sig of [
  'skillFistTiger:{id:"skillFistTiger",fw:512,fh:206,sourceX:466,sourceY:103',
  'skillFistDragonKick:{id:"skillFistDragonKick",fw:382,fh:200,sourceX:42,sourceY:102',
  'skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:115,sourceY:278',
  'skillFistToOne:{id:"skillFistToOne",fw:1614,fh:1040,sourceX:270,sourceY:520',
  'skillFistGoldenCharge:{id:"skillFistGoldenCharge",fw:822,fh:663,sourceX:562,sourceY:340'
])ok(sprite.includes(sig),`missing explicit source anchor: ${sig}`);
ok(sprite.includes('localX=(cfg.fw*.5-cfg.sourceX)*cfg.scale'),"source-anchor transform missing");
ok(sprite.includes('x=baseX+Math.cos(renderA)*localX-Math.sin(renderA)*localY'),"rotated X anchor transform missing");
ok(sprite.includes('y=baseY+Math.sin(renderA)*localX+Math.cos(renderA)*localY'),"rotated Y anchor transform missing");
ok(meta.includes('mouthLocalX=(174-562)*chargeScale')&&meta.includes('mouthLocalY=-(381-340)*chargeScale'),"charge mouth-anchor missing");
ok(sprite.includes('Beam local source is the left edge'),"beam source-edge policy missing");
console.log("v14.9.4 fist anchor audit: OK");
