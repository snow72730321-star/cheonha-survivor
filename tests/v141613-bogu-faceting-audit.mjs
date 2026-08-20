import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
const read=p=>fs.readFileSync(p,"utf8");
const html=read("index.html"),bogu=read("js/systems/bogu-v14-16-13.js"),save=read("js/core/save-manager.js"),state=read("js/core/runtime-state.js"),power=read("js/systems/combat-power-v14-7-7.js"),css=read("css/bogu-v14-16-13.css"),sw=read("service-worker.js");
assert.match(html,/data-forge-filter="bogu">보구</);assert.match(html,/id="forgeBoguPanel"/);assert.match(html,/bogu-v14-16-13\.js\?v=141615/);assert.match(html,/bogu-v14-16-13\.css\?v=141615/);
assert.match(bogu,/const FACETS=10/);assert.match(bogu,/CHANCE_START=\.75/);assert.match(bogu,/CHANCE_MIN=\.25/);assert.match(bogu,/CHANCE_MAX=\.75/);assert.match(bogu,/success\?1:0/);assert.match(bogu,/s\.chance=clamp\(s\.chance-CHANCE_STEP/);assert.match(bogu,/s\.chance=clamp\(s\.chance\+CHANCE_STEP/);
assert.match(bogu,/positive:\[\{id:s\.positive\[0\],successes:s\.successes\[0\]\}/);assert.match(bogu,/boguEquipped\.map\(gemById\)/);assert.match(bogu,/account\.boguEquipped=account\.boguEquipped\.map\(x=>x===id\?null:x\)/);
assert.match(save,/const VERSION=19/);assert.match(save,/boguGems/);assert.match(save,/boguEquipped/);assert.match(save,/boguFaceting/);assert.match(state,/boguGems:\[\]/);assert.match(power,/BoguSystem\?\.combatPowerFactor/);assert.match(css,/\.bogu-facet-nodes/);assert.match(sw,/cheonha-v14-16-15-bogu-effect-toggle/);

const account={boguGems:[{id:"g1",oreType:"han",grade:"eternal",positive:[{id:"damage",successes:8},{id:"crit",successes:7}],negative:{id:"speedDown",successes:2},created:1}],boguEquipped:["g1",null,null],boguFaceting:null};
const ctx={console,window:{},account,gradeDefs:[{id:"common",name:"일반"},{id:"rare",name:"희귀"},{id:"epic",name:"서사"},{id:"unique",name:"고유"},{id:"legendary",name:"전설"},{id:"mythic",name:"신화"},{id:"eternal",name:"영원"}],oreTypes:{han:{name:"한철"},moon:{name:"월은"},black:{name:"현철"},poison:{name:"독옥"},fire:{name:"화정석"},ice:{name:"빙정석"},thunder:{name:"뇌정석"}},document:{getElementById:()=>null,querySelector:()=>null},GameEvents:{on:()=>{}},saveAccountData:()=>{},buildWeaponMenu:()=>{},buildDifficultyMenu:()=>{},updateStartButton:()=>{},confirm:()=>true,showMessage:()=>{},GameAudio:{playUI:()=>{}},applyForgedWeapon:()=>{},player:{},Math,Number,Object,Array,Set,Date};ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);vm.runInContext(bogu,ctx);
const p={damageMul:1,critChance:.03,eliteDamageMul:1,cooldownRate:1,damageReduction:0,maxHp:100,hp:100,areaMul:1,speed:170,poisonMul:1};ctx.BoguSystem.applyToPlayer(p);
assert.ok(p.damageMul>1.18,"영원 보옥 피해 효과가 전투에 반영되지 않음");assert.ok(p.critChance>.14,"영원 보옥 치명 효과가 전투에 반영되지 않음");assert.ok(p.speed<170,"디버프가 전투에 반영되지 않음");assert.equal(p.boguEquipped.length,1);assert.ok(ctx.BoguSystem.combatPowerFactor()>1);
console.log("v14.16.14 bogu/faceting audit: OK",{damage:p.damageMul,crit:p.critChance,speed:p.speed,cpFactor:ctx.BoguSystem.combatPowerFactor()});
