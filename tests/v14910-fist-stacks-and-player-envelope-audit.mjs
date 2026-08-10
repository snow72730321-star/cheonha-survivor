import fs from "node:fs";
const state=fs.readFileSync("js/core/runtime-state.js","utf8");
const meta=fs.readFileSync("js/data/characters-meta.js","utf8");
const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const remaster=fs.readFileSync("js/render/sprite-remaster-v14-3-18.js","utf8");
const aura=fs.readFileSync("js/render/weapon-visuals-v14-4.js","utf8");
function ok(v,m){if(!v)throw new Error(m)}
ok(sprite.includes('skillFistGoldenDragon:{id:"skillFistGoldenDragon",fw:1304,fh:516,sourceX:115,sourceY:278,scale:Math.max(.46,r/1304)}'),"황룡십팔장 VFX 방향 복구 누락");
ok(state.includes('desc:"적을 처치할 때마다 황룡 스택을 얻는다. 황룡 스택마다 방어력이 증가한다."'),"황룡십팔장 설명 정리 누락");
ok(meta.includes('heal=player.maxHp*.15')&&meta.includes('player.hp=Math.min(player.maxHp,player.hp+heal)'),"만권일극 회복 누락");
ok(remaster.includes('황룡 ${h}/20')&&remaster.includes('만권 ${m}/10'),"장권 스택 HUD 누락");
ok(remaster.includes('function playerVisualEnvelope')&&remaster.includes('rx:61*z,ry:79*z'),"플레이어 에셋 envelope 누락");
ok(remaster.includes('ctx.ellipse(cx,sy,rx,ry'),"호신강기가 캐릭터 envelope를 사용하지 않음");
ok(aura.includes('playerVisualEnvelope(z)')&&aura.includes('ctx.ellipse(cx,ey,env.rx'),"무기 오오라가 캐릭터 envelope를 사용하지 않음");
console.log("v14.9.10 fist stacks/player envelope audit: OK");