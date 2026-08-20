import fs from "node:fs";
import assert from "node:assert/strict";

const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const runtime=fs.readFileSync("js/systems/game-runtime-v14.js","utf8");
const abyss=fs.readFileSync("js/systems/abyss-mode-v14-8-7.js","utf8");
const progression=fs.readFileSync("js/systems/combat-progression-v14-3-1.js","utf8");
const codex=fs.readFileSync("js/ui/menu-codex.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const sw=fs.readFileSync("service-worker.js","utf8");
const pkg=JSON.parse(fs.readFileSync("package.json","utf8"));

assert.equal(pkg.version,"14.16.15");
assert.match(html,/v14\.16\.15-bogu-effect-toggle/);
assert.match(sw,/cheonha-v14-16-15-bogu-effect-toggle/);

// 낙성창진은 플레이어 소유 공격이며, 착탄과 넉백을 적 이동/접촉보다 먼저 판정한다.
const starfall=combat.match(/if\(a\.starfall[\s\S]*?\n if\(a\.overlord/)?.[0]||"";
assert.match(starfall,/owner:"player"/);
assert.match(starfall,/contactBreak:\.16/);
assert.doesNotMatch(starfall,/hurtPlayer\(/);
assert.match(combat,/updateGems\(dt\);if\(state!=="playing"\)return;updateDelayed\(dt\);updateEnemies\(dt\)/);
assert.match(combat,/if\(n<\.001\)\{kx=e\.x-player\.x;ky=e\.y-player\.y/);
assert.match(combat,/if\(opt\.contactBreak\)e\.contactGrace=/);
assert.match(combat,/const contactDistance=Math\.hypot\(player\.x-e\.x,player\.y-e\.y\);if\(contactDistance</);

// 첫 나락혈마만 패턴 주기를 1.25배로 늘리면 단위 시간당 패턴 빈도는 80%가 된다.
assert.match(abyss,/boss\.patternIntervalMul=n===1\?1\.25:1/);
assert.match(combat,/function bossPatternDelay\(e,seconds\)/);
assert.match(combat,/e\.summon=bossPatternDelay\(e,d\.summon/);
assert.match(combat,/e\.blast=bossPatternDelay\(e,d\.blast/);
assert.match(combat,/e\.dash=bossPatternDelay\(e,d\.dash/);
assert.match(combat,/e\.orbs=bossPatternDelay\(e,d\.orbs/);
assert.match(combat,/e\.cross=bossPatternDelay\(e,e\.phase3\?2\.2:4\.4\)/);
assert.match(combat,/e\.puddle=bossPatternDelay\(e,e\.phase3\?3\.4:5\.7\)/);
assert.match(progression,/const patternMul=Math\.max\(1,Number\(boss\.patternIntervalMul\)\|\|1\)/);
assert.equal(1/1.25,.8);

// 레벨업·일시정지·메뉴·도감에서 현재/최대 성급을 함께 표시한다.
assert.match(combat,/tag:`\$\{kind\} · \$\{lv\+1\}\/\$\{a\.max\}성`/);
assert.match(combat,/\$\{lv\?`\$\{lv\}\/\$\{a\.max\}성`:`미습득 · 최대 \$\{a\.max\}성`\}/);
assert.match(combat,/\$\{player\.universal\[a\.id\]\}\/\$\{a\.max\}성/);
assert.match(combat,/\$\{player\.augments\[a\.id\]\}\/\$\{a\.max\}중/);
assert.match(codex,/최대 \$\{art\.max\}성/);
assert.match(codex,/기본: \$\{w\.basic\.name\} · 최대 \$\{w\.basic\.max\}성/);

// 마지막 선택 뒤 0.7초 동안 전투 시뮬레이션을 멈추고 누적 틱도 비운다.
assert.match(runtime,/const LEVEL_CHOICE_RESUME_GRACE=\.7/);
assert.match(runtime,/fixedAccumulator=0;player\.levelResumeGrace=LEVEL_CHOICE_RESUME_GRACE/);
assert.match(combat,/if\(\(player\.levelResumeGrace\|\|0\)>0\)[\s\S]*?return\}elapsed\+=dt/);

console.log("v14.16.2 combat safety/balance/max-level audit: OK");
