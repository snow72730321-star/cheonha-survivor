import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const vfx=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
for(let i=1;i<=5;i++)ok(fs.existsSync(`assets/vfx/user/user_vfx_0${i}.png`),`missing user VFX ${i}`);
ok(vfx.includes('skillTaoFireDragon:{src:"assets/vfx/user/user_vfx_01.png"'),"VFX1 not mapped to tao");
ok(vfx.includes('skillTaoFiveThunder:{src:"assets/vfx/user/user_vfx_04.png"'),"VFX4 not mapped to tao");
ok(vfx.includes('skillStingrainExplosion:{src:"assets/vfx/user_poison/stingrain_explosion.png"'),"stingrain explosion missing");
ok(vfx.includes('skillSpearOverlord:{src:"assets/vfx/user/user_vfx_02.png"'),"VFX2 not mapped to overlord spear");
ok(vfx.includes('skillBowRicochetSeal:{src:"assets/vfx/user/user_vfx_03.png"'),"VFX3 not mapped to bow ultimate");
ok(combat.includes('type:"overlordThrust"')&&combat.includes('type:"overlordBurst"'),"overlord spear staged mechanics missing");
ok(combat.includes('ricochetUltimate:true')&&combat.includes('life:10'),"10s ricochet arrow missing");
ok(combat.includes('mobileCameraScale()')&&combat.includes('p.vx=-Math.abs(p.vx)')&&combat.includes('p.vy=-Math.abs(p.vy)'),"viewport bounce missing");
ok(combat.includes('hitRegistry:new Map()')&&combat.includes('rehitDelay:.30'),"ricochet re-hit limiter missing");
ok(meta.includes('type:"skillBowRicochetSeal"')&&meta.includes('type:"ricochetVolley"'),"bow ultimate sequence missing");
console.log("skill VFX/mechanics audit: ok");
