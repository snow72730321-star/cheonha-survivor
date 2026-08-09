import fs from "node:fs";
const combat=fs.readFileSync("js/systems/combat-runtime.js","utf8");
const state=fs.readFileSync("js/core/runtime-state.js","utf8");
const vfx=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
const chars=fs.readFileSync("js/data/characters-meta.js","utf8");
const loader=fs.readFileSync("js/core/asset-loader.js","utf8");
const req=[
 [chars.includes('title:"소천마도"'),"마련화 별호 소천마도"],
 [chars.includes('ultimate:"천마합일"'),"절기 천마합일"],
 [state.includes('name:"천마군림도"')&&state.includes('name:"천마신공"'),"히든 무공명 리워크"],
 [combat.includes('saberHeavenRangeMul()')&&combat.includes('(100+lv*12)*saberHeavenRangeMul()'),"천마신공 포함 벽력도법 범위 성장"],
 [combat.includes('saberUnityTimer')&&combat.includes('type:"skillSaberUnityThunder"'),"천마합일 중 벽력도법 VFX1"],
 [combat.includes('type:"skillSaberWhirlwindUser"'),"선풍참 VFX3 직접 호출"],
 [combat.includes('type:"skillSaberUnityMountain"')&&combat.includes('trueUnity?1.35:1'),"진천마합일 중 단악참 VFX4/피해 강화"],
 [chars.includes('player.saberUnityTimer=15'),"천마합일 15초 강화"],
 [combat.includes('trueUnity?.75:unity?.80:1'),"천마합일/진천마합일 공격 간격 강화"],
 [vfx.includes('skillSaberUnityThunder:{src:"assets/vfx/user_batch02/vfx_01.png"'),"VFX1 등록"],
 [vfx.includes('skillSaberWhirlwindUser:{src:"assets/vfx/user_batch02/vfx_03.png"'),"VFX3 등록"],
 [vfx.includes('skillSaberUnityMountain:{src:"assets/vfx/user_batch02/vfx_04.png"'),"VFX4 등록"],
 [vfx.includes('def.cols||def.frames'),"그리드 시트 프레임 지원"],
 [loader.includes('assets/vfx/user_batch02/vfx_01.png')&&loader.includes('assets/vfx/user_batch02/vfx_03.png')&&loader.includes('assets/vfx/user_batch02/vfx_04.png'),"에셋 선로딩"]
];
for(const [ok,name] of req){if(!ok)throw new Error(`FAIL: ${name}`);console.log(`OK: ${name}`)}
