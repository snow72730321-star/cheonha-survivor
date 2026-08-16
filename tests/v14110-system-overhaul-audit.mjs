import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const read=p=>fs.readFileSync(p,"utf8");
const combat=read("js/systems/combat-runtime.js");
const forge=read("js/systems/forge-v13.js");
const storage=read("js/systems/storage-forge.js");
const world=read("js/systems/system-overhaul-v14-10.js");
const visuals=read("js/render/weapon-visuals-v14-4.js");
const renderer=read("js/render/canvas-renderer.js");
const codex=read("js/ui/menu-codex.js");
const html=read("index.html"),sw=read("service-worker.js");

assert.match(world,/player\.invuln=Math\.max\(player\.invuln\|\|0,1\.25\)/,"절기 공통 무적 누락");
assert.match(forge,/if\(lv<15\)return \{down:\.01,destroy:0\}/,"+10~14 강화 위험 누락");
assert.match(forge,/if\(lv<20\)return \{down:\.02,destroy:\.005\}/,"+15~19 강화 위험 누락");
assert.match(forge,/if\(lv<24\)return \{down:\.05,destroy:\.01\}/,"+20~23 강화 위험 누락");
assert.match(forge,/return \{down:\.10,destroy:\.05\}/,"+24→25 강화 위험 누락");
assert.match(combat,/capMonsterOreGrade/);assert.match(combat,/gradeIndex\("legendary"\)/,"몹 광석 전설 상한 누락");
assert.match(storage,/cost:3000,mythic:\.005,eternal:\.0007,soulStone:\.001/);assert.match(storage,/data-ore-gacha/);assert.ok(!storage.includes("account.ores[key]-=3"),"구형 전설 광석 소모형 뽑기가 남아 있음");
assert.match(world,/gosu:\{chance:\.40/);assert.match(world,/sura:\{chance:\.35/);assert.match(world,/clear-ore-choice-grid/,"고수·수라 클리어 3택 보상 누락");
assert.ok(!visuals.includes("drawPlayer=function(){WeaponVisuals.drawAuraLayer(false)"),"플레이어 강화 오오라가 남아 있음");
assert.match(combat,/GameSpatial\.queryCircle\(player\.x,player\.y,reach\)/,"태극검진 전체 적 전수검사 최적화 누락");
assert.match(world,/WORLD_HALF=2600/);assert.match(world,/function drawMinimap/);assert.match(world,/강호도/,"맵/미니맵 누락");
assert.match(renderer,/portrait\?\.62:\.73/);assert.match(renderer,/portrait\?\.68:\.78/,"모바일 시야 확대 누락");assert.match(combat,/halfW=W\/\(2\*z\)/,"확대된 모바일 시야와 화면내 적 판정 불일치");
assert.match(forge,/id="forgeGoldLive"/);assert.match(forge,/id="potentialOddsBtn"/);assert.match(forge,/function showPotentialOdds/,"대장간 실시간 금자/잠재확률 UI 누락");
assert.match(codex,/발월 8성 \+ 월영참 1·2·3식 4성/,"왜도 도감 구형 조건 잔존");
assert.ok(html.includes("system-overhaul-v14-10.js")&&sw.includes("system-overhaul-v14-10.js"),"시스템 패치 로드/캐시 누락");

// SaveManager 실제 정규화 계약: +25와 잠재 줄 등급을 보존한다.
const ctx={console,window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},URL:{createObjectURL:()=>"",revokeObjectURL:()=>{}},Blob:class{},Date,Math,Number,JSON,Object,Array,String,Set,
 weaponDefs:{sword:{name:"검"}},gradeDefs:[{id:"common"},{id:"rare"},{id:"epic"},{id:"unique"},{id:"legendary"},{id:"mythic"},{id:"eternal"}],oreTypes:{han:{name:"한철",ability:"강철심",desc:"기본 피해"}},ui:{},refreshAccountUI:()=>{},GameEvents:{emit:()=>{}},fmtTime:()=>"00:00",account:{},loadAccountData:()=>{},saveAccountData:()=>{},loadRecords:()=>{},saveRecords:()=>{}};
vm.createContext(ctx);vm.runInContext(read("js/core/save-manager.js")+"\n;globalThis.__sm=SaveManager;",ctx);
const out=ctx.__sm.sanitizeAccount({weapons:[{id:"w1",weapon:"sword",grade:"legendary",ability:"han",level:25,potentialGrade:"legendary",potentials:[{key:"crit",name:"치명",value:.12,format:"pct",grade:"legendary"}]}]});
assert.equal(out.weapons[0].level,25,"+25 저장/로드 보존 실패");
assert.equal(out.weapons[0].potentials[0].grade,"legendary","잠재 줄 등급 저장/로드 보존 실패");
console.log("v14.10 system overhaul audit: OK");
