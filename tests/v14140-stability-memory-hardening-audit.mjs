import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root=path.resolve(import.meta.dirname,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const html=read("index.html"),sw=read("service-worker.js"),loader=read("js/core/asset-loader.js"),pwa=read("js/core/pwa.js");
const save=read("js/core/save-manager.js"),forge=read("js/systems/forge-v13.js"),runtime=read("js/systems/game-runtime-v14.js");
const combat=read("js/systems/combat-runtime.js"),world=read("js/systems/world-map-v14-12.js"),systemWorld=read("js/systems/system-overhaul-v14-10.js");
const menu=read("js/render/sprite-remaster-v14-3-18.js"),gacha=read("js/systems/storage-forge.js"),cutscene=read("js/vfx/awakening-cutscene-v14-3-8.js");
const pkg=JSON.parse(read("package.json"));

assert.equal(pkg.version,"14.14.0");
assert.match(html,/v14\.14\.0-stability-memory-hardening/);
assert.match(loader,/const BUILD="v14\.14\.0-stability-memory-hardening"/);
assert.match(sw,/cheonha-v14-14-0-stability-memory-hardening/);
assert.match(save,/const VERSION=17/);

const ctx={console,window:{},document:{getElementById:()=>null},localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},URL:{createObjectURL:()=>"",revokeObjectURL:()=>{}},Blob:class{},Date,Math,Number,JSON,Object,Array,String,Set,
  weaponDefs:{sword:{name:"검"},bow:{name:"활"}},gradeDefs:[{id:"common"},{id:"rare"},{id:"epic"},{id:"unique"},{id:"legendary"},{id:"mythic"},{id:"eternal"}],oreTypes:{han:{name:"한철",ability:"강철심",desc:"기본 피해"}},skinDefs:{default:{},azure:{}},achievementDefs:[{id:"firstClear"}],ui:{},refreshAccountUI:()=>{},GameEvents:{emit:()=>{}},fmtTime:()=>"00:00",account:{},loadAccountData:()=>{},saveAccountData:()=>{},loadRecords:()=>{},saveRecords:()=>{}};
vm.createContext(ctx);vm.runInContext(save+"\n;globalThis.__sm=SaveManager;",ctx);
const normalized=ctx.__sm.sanitizeAccount({settings:{gameSpeed:2},weapons:[{id:"same",weapon:"sword",grade:"common",ability:"han"},{id:"same",weapon:"bow",grade:"common",ability:"han"}],pendingPotential:{weaponId:"same",grade:"rare",lines:[{key:"damage",value:.04,grade:"rare"},{key:"hp",value:10,format:"flat",grade:"rare"},{key:"projectile",value:1,format:"flat",grade:"rare"}]},skinsUnlocked:{default:true,azure:true,forged:true},selectedSkins:{sword:"azure",bad:"forged"},achievements:{firstClear:true,fake:true},stats:{paths:{sword:true,fake:true}}});
assert.equal(normalized.settings.gameSpeed,2,"게임 속도 저장 보존 실패");
assert.equal(new Set(normalized.weapons.map(item=>item.id)).size,2,"중복 무기 ID 복구 실패");
assert.equal(normalized.pendingPotential?.weaponId,"same","흑옥 비교 트랜잭션 보존 실패");
assert.deepEqual(Object.keys(normalized.achievements),["firstClear"]);
assert.deepEqual(Object.keys(normalized.stats.paths),["sword"]);

assert.match(save,/MAX_IMPORT_BYTES=5\*1024\*1024/);
assert.match(forge,/if\(enhancementInFlight\)return/);
assert.match(forge,/setEnhancementBusy\(true\)/);
assert.match(forge,/account\.pendingPotential=pendingPotential/);
assert.match(runtime,/pagehide/);assert.match(runtime,/persistActiveRun/);assert.match(runtime,/targetFps=.*state==="paused"\?12:8/);
assert.match(combat,/if\(accountChanged\)refreshAccountUI\(\)/);
assert.match(world,/__CHEONHA_AUTHORED_MINIMAP__=true/);
assert.match(systemWorld,/if\(!window\.__CHEONHA_AUTHORED_MINIMAP__\)drawMinimap\(\)/);
assert.match(menu,/weapon-cp/);assert.match(menu,/renderCharacterPreview\(\);buildDifficultyMenu\(\);updateStartButton\(\)/);

const shell=sw.match(/const APP_SHELL=\[([\s\S]*?)\];/)?.[1]||"";
assert.ok(!shell.includes("assets/vfx/")&&!shell.includes("forge-mobile-final/main.png")&&!shell.includes("ore-gacha-draw"),"대용량 에셋이 앱 셸에 포함됨");
assert.match(sw,/key\.startsWith\(CACHE_PREFIX\)/);
assert.match(sw,/event\.data\?\.type==="SKIP_WAITING"/);
assert.ok(!sw.includes('.then(()=>self.skipWaiting())')&&sw.includes('self.addEventListener("install",event=>event.waitUntil(cacheAppShell()))'),"설치 중 강제 활성화가 남아 있음");
assert.match(pwa,/safeState=.*state==="menu"\|\|state==="result"/);
assert.match(pwa,/if\(!waitingWorker\|\|!safeState\(\)\)return false/);
assert.match(loader,/const preloadEssential=/);assert.match(loader,/const preloadWeapon=/);assert.match(loader,/const preloadSkill=/);assert.match(loader,/initialWeaponPacks/);assert.match(loader,/concurrency=4/);

assert.match(gacha,/ore-gacha-draw\.mp4/);assert.match(gacha,/ore-gacha-draw\.gif/);
assert.match(cutscene,/videoByWeapon/);assert.match(cutscene,/\.replace\(\/\\\.gif\$\/,"\.mp4"\)/);
for(const relative of ["assets/ui/ore-gacha-draw.mp4",...fs.readdirSync(path.join(root,"assets/vfx/cutscenes")).filter(name=>name.endsWith(".mp4")).map(name=>`assets/vfx/cutscenes/${name}`)]){
  const data=fs.readFileSync(path.join(root,relative));assert.equal(data.toString("ascii",4,8),"ftyp",`MP4 헤더 손상: ${relative}`);assert.ok(data.indexOf(Buffer.from("moov"))>0,`MP4 인덱스 손상: ${relative}`);
}

function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const full=path.join(directory,entry.name);return entry.isDirectory()?walk(full):[full]})}
for(const file of walk(path.join(root,"assets")).filter(file=>file.endsWith(".png"))){
  const data=fs.readFileSync(file),width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  assert.ok(width<=4096&&height<=4096,`모바일 텍스처 한도 초과: ${path.relative(root,file)} ${width}x${height}`);
}

assert.equal(pkg.scripts.test,"node tests/run-all.mjs","전체 테스트 자동 수집이 연결되지 않음");
console.log("v14.14.0 stability/memory hardening audit: OK");
