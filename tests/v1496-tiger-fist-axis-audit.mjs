import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(combat.includes('const attackAngle=a,range=150+lv*15'),"복호권 shared attackAngle missing");
ok(combat.includes('coneHit(attackAngle,range,half'),"복호권 hit cone not using attackAngle");
ok(combat.includes('a:attackAngle,r:range'),"복호권 VFX not using attackAngle");
ok(sprite.includes('skillFistTiger:{id:"skillFistTiger",fw:512,fh:206,sourceX:466,sourceY:103,scale:Math.max(.72,r/250),angleOffset:Math.PI}'),"tiger source-axis correction missing");
ok(sprite.includes('const renderA=a+(cfg.angleOffset||0);'),"render angle correction missing");
ok(sprite.includes('Math.cos(renderA)*localX'),"source anchor not rotated by corrected angle");
console.log("v14.9.6 tiger fist axis audit: OK");
