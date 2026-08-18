import fs from "node:fs";
import assert from "node:assert/strict";

const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");

// Global AOE gameplay helper must not be wrapped to guess explosion art.
assert.doesNotMatch(sprite,/const\s+aoeBeforeSpriteVFX\s*=\s*aoe/);
assert.doesNotMatch(sprite,/aoe\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?explosionBlood/);

// Dedicated skill paths deliberately suppress generic visual + hit feedback.
for(const skill of ["skillPoisonExplosion","skillPoisonDemon","skillStingrainExplosion","skillTaoFiveThunder","skillSaberWhirlwindUser","skillTaoFireDragon"]){
  assert.match(combat,new RegExp(skill));
}
assert.match(combat,/whirlwind[\s\S]*?skipVisual:true[\s\S]*?skillSaberWhirlwindUser/);
assert.match(combat,/skillPoisonDemon[\s\S]*?skipVisual:true/);
assert.match(combat,/skillTaoFiveThunder[\s\S]*?skipVisual:true/);
assert.match(combat,/skillTaoFireDragon[\s\S]*?skipVisual:true/);

// skipVisual also suppresses automatic per-target hit sprites.
assert.match(sprite,/dealt>0&&allowImpact&&!options\.skipVisual&&!options\.skipImpactVfx/);

console.log("no-inferred-combat-vfx-audit: OK");
