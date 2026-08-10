import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
for(const sig of [
  'skillFistTiger:{id:"skillFistTiger",fw:512,fh:206,sourceX:466,sourceY:103',
  'skillFistDragonKick:{id:"skillFistDragonKick",fw:382,fh:200,sourceX:42,sourceY:102',
  'skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:1189,sourceY:278',
  'skillFistToOne:{id:"skillFistToOne",fw:1614,fh:1040,sourceX:270,sourceY:520',
  'skillFistGoldenCharge:{id:"skillFistGoldenCharge",fw:822,fh:663,sourceX:180,sourceY:384'
])ok(sprite.includes(sig),`missing explicit source anchor: ${sig}`);
ok(sprite.includes('localX=(cfg.fw*.5-cfg.sourceX)*cfg.scale*(flipX?-1:1)'),"source-anchor transform missing");
ok(sprite.includes('x=baseX+Math.cos(renderA)*localX-Math.sin(renderA)*localY'),"rotated X anchor transform missing");
ok(sprite.includes('y=baseY+Math.sin(renderA)*localX+Math.cos(renderA)*localY'),"rotated Y anchor transform missing");
ok(meta.includes('const chargeMuzzleOffset=96')&&meta.includes('x0=castX+Math.cos(castA)*chargeMuzzleOffset'),"charge mouth-anchor missing");
ok(sprite.includes('const beamSourceX=96,beamSourceY=160,beamFrameW=900,beamFrameH=308'),"beam internal source-anchor policy missing");
console.log("v14.9.4 fist anchor audit: OK");
