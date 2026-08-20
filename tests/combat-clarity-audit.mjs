import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const remaster=fs.readFileSync("js/render/sprite-remaster-v14-3-18.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(combat.includes('updateProjectiles(dt);updateGems(dt);if(state!=="playing")return;updateDelayed(dt);updateEnemies(dt)'),"레벨업 차단 또는 플레이어 지연타 선처리 누락");
ok(combat.includes('damage:(16+lv*6)*(n>1?.82:1)*.82')&&combat.includes('n===1?.72:n===2?.52:n===3?.38:n===4?.28:n===5?.20:.15'),"검 기본기 보스 집중 감쇄 누락");
ok(combat.includes('damage:(18+a.meteor*9)*.84'),"유성검우 너프 누락");
ok(combat.includes('damageEnemy(e,(8+a.taiji*7)*.82'),"태극검진 너프 누락");
ok(combat.includes('baseDamage=(24+a.tenk*10)*.84*damageScale')&&combat.includes('n===1?.62:n===2?.40:n===3?.26:.16'),"만검귀종 너프 누락");
ok(combat.includes('namelessCutV1454')&&combat.includes('visualSource:"namelessV1454"'),"신규 무명참 호출 누락");
ok(sprite.includes('v.type==="namelessCutV1454"'),"신규 무명참 렌더러 누락");
ok(remaster.includes('playerVisualEnvelope')&&remaster.includes('player.shieldMax')&&remaster.includes('ctx.ellipse(cx,sy,rx,ry'),"방어막 가독성 렌더 누락");
console.log("combat clarity audit passed");
