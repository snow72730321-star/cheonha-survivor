import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const remaster=fs.readFileSync("js/render/sprite-remaster-v14-3-18.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(combat.includes('updateProjectiles(dt);updateGems(dt);if(state!=="playing")return;updateEnemies(dt)'),"레벨업 즉시 적 업데이트 차단 누락");
ok(combat.includes('damage:(16+lv*6)*(n>1?.82:1)*.88'),"검 기본기 너프 누락");
ok(combat.includes('damage:(18+a.meteor*9)*.9'),"유성검우 너프 누락");
ok(combat.includes('damageEnemy(e,(8+a.taiji*7)*.88'),"태극검진 너프 누락");
ok(combat.includes('damage:(24+a.tenk*10)*.9'),"만검귀종 너프 누락");
ok(combat.includes('namelessCutV1454')&&combat.includes('visualSource:"namelessV1454"'),"신규 무명참 호출 누락");
ok(sprite.includes('v.type==="namelessCutV1454"'),"신규 무명참 렌더러 누락");
ok(remaster.includes('남은 충전 구슬')&&remaster.includes('player.shieldMax'),"방어막 가독성 렌더 누락");
console.log("combat clarity audit passed");
