import fs from "node:fs";
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('flipY:true,backwardOffset:92'),"charge flipY/backward offset missing");
ok(sprite.includes('scaleY:cfg.flipY?-cfg.scale:cfg.scale'),"vertical flip render missing");
ok(sprite.includes('baseX=v.x-Math.cos(a)*back'),"backward placement missing");
ok(meta.includes('chargeBack=92'),"muzzle transform backward offset missing");
ok(meta.includes('mouthLocalY=-(382-340)*chargeScale'),"mouth anchor Y flip missing");
ok(meta.includes('chargeBaseX=castX-Math.cos(castA)*chargeBack'),"fixed cast backward base missing");
console.log("v14.9.8 golden dragon charge orientation audit: OK");