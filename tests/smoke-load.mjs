import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(import.meta.dirname,"..");

class ClassList{
  constructor(){this.values=new Set()}
  add(...v){v.forEach(x=>this.values.add(x))}
  remove(...v){v.forEach(x=>this.values.delete(x))}
  toggle(v,force){if(force===undefined){this.values.has(v)?this.values.delete(v):this.values.add(v)}else force?this.values.add(v):this.values.delete(v)}
  contains(v){return this.values.has(v)}
}
const gradient={addColorStop(){}};
const context2d=new Proxy({canvas:null},{get(target,key){
  if(key in target)return target[key];
  if(key==="createLinearGradient"||key==="createRadialGradient")return ()=>gradient;
  if(key==="measureText")return ()=>({width:10});
  return ()=>{};
},set(target,key,value){target[key]=value;return true}});

class NodeStub{
  constructor(id=""){
    this.id=id;this.style={setProperty(){}};this.classList=new ClassList();this.dataset={};this.children=[];
    this.value="";this.checked=false;this.textContent="";this._innerHTML="";this.width=560;this.height=320;
    this.complete=true;this.naturalWidth=128;this.naturalHeight=160;this.offsetWidth=100;this.listeners=new Map();
  }
  set innerHTML(value){this._innerHTML=String(value);if(value==="")this.children=[]}
  get innerHTML(){return this._innerHTML}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler)}
  removeEventListener(type,handler){const list=this.listeners.get(type)||[];this.listeners.set(type,list.filter(item=>item!==handler))}
  appendChild(node){this.children.push(node);return node} prepend(node){this.children.unshift(node);return node}
  remove(){} replaceWith(){} insertAdjacentHTML(){}
  querySelector(){return new NodeStub()} querySelectorAll(){return []} setAttribute(){}
  click(){for(const handler of this.listeners.get("click")||[])handler({currentTarget:this,target:this,preventDefault(){}})} focus(){}
  getContext(){return context2d} getBoundingClientRect(){return {left:0,top:0,width:this.width,height:this.height}}
}

const nodes=new Map();
const document={
  body:new NodeStub("body"),documentElement:new NodeStub("html"),hidden:false,
  getElementById(id){if(!nodes.has(id))nodes.set(id,new NodeStub(id));return nodes.get(id)},
  createElement(tag){const node=new NodeStub();node.tagName=tag.toUpperCase();return node},
  querySelector(){return new NodeStub()},querySelectorAll(){return []},addEventListener(){},
};
context2d.canvas=document.getElementById("game");

class ImageStub extends NodeStub{
  constructor(){super();this.listeners={};this.complete=false;this.naturalWidth=0;this.naturalHeight=0;this.decoding="async"}
  addEventListener(type,handler){this.listeners[type]=handler}
  set src(value){this._src=value;queueMicrotask(()=>{this.complete=true;this.naturalWidth=128;this.naturalHeight=160;this.onload?.();this.listeners.load?.()})}
  get src(){return this._src}
}
class AudioStub{
  constructor(src=""){this.src=src;this.preload="";this.loop=false;this.playsInline=true;this.crossOrigin="";this.volume=1;this.currentTime=0;this.paused=true}
  play(){this.paused=false;return Promise.resolve()}
  pause(){this.paused=true}
}

const storage=new Map();
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const listeners=new Map();
const sandbox={
  console,document,localStorage,Image:ImageStub,Audio:AudioStub,
  navigator:{vibrate(){},serviceWorker:{register:async()=>({})}},location:{protocol:"https:"},
  innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance,Math,Date,JSON,Map,Set,WeakMap,Promise,
  Blob:class{},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},confirm:()=>false,
  setTimeout,clearTimeout,queueMicrotask,
  requestAnimationFrame:()=>0,cancelAnimationFrame(){},
  addEventListener(type,handler){listeners.set(type,handler)},removeEventListener(){},
};
sandbox.window=sandbox;sandbox.self=sandbox;sandbox.globalThis=sandbox;
const context=vm.createContext(sandbox);

const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const scripts=[...html.matchAll(/<script defer src="([^"]+)"/g)].map(match=>match[1]);
for(const script of scripts){
  const filename=path.join(root,script);
  try{vm.runInContext(fs.readFileSync(filename,"utf8"),context,{filename:script})}
  catch(error){throw new Error(`${script} 로드 실패: ${error.stack}`)}
}
await new Promise(resolve=>setTimeout(resolve,30));
const assertions=vm.runInContext(`({
  version:SaveManager.VERSION,
  skills:SkillRegistry.list().length,
  bosses:BossRegistry.list().length,
  fixed:typeof GameRuntimeV14==="object",
  accountVersion:account.saveVersion
})`,context);
if(assertions.version!==14||assertions.skills!==8||assertions.bosses!==1||!assertions.fixed||assertions.accountVersion!==14){
  throw new Error(`부팅 검증 실패: ${JSON.stringify(assertions)}`);
}

// 주 저장이 깨졌을 때 정상 백업을 복구하고 백업 자체는 보존하는지 확인한다.
vm.runInContext("account.gold=321;SaveManager.save()",context);
const validEnvelope=storage.get("murimAccountV1");
storage.set("murimAccountV1.backup",validEnvelope);
storage.set("murimAccountV1","{broken-json");
const originalWarn=console.warn;console.warn=()=>{};
try{vm.runInContext("SaveManager.load()",context)}finally{console.warn=originalWarn}
if(storage.get("murimAccountV1.backup")!==validEnvelope||storage.get("murimAccountV1")==="{broken-json"){
  throw new Error(`백업 복구 또는 정상 백업 보존 검증 실패: ${JSON.stringify({valid:!!validEnvelope,backupSame:storage.get("murimAccountV1.backup")===validEnvelope,main:storage.get("murimAccountV1")?.slice(0,30)})}`);
}

// 실제 전투를 시작하고 자동공격이 발동하는지 회귀 테스트한다.
// 이 검사는 공격 타이머가 최소값에 고정되어 0에 도달하지 못했던 v14.0 버그를 방지한다.
const gameplay=vm.runInContext(`(()=>{
  selectedWeapon="sword";selectedDifficulty="chuchul";startGame();
  enemies=[];projectiles=[];
  spawnEnemy("bandit",player.x+120,player.y);
  const attackTarget=enemies[0];
  attackTarget.speed=0;attackTarget.damage=0;
  const attackHpBefore=attackTarget.hp;
  let basicAttackEvents=0;
  const offAttack=GameEvents.on("attack:basic",()=>basicAttackEvents++);
  for(let i=0;i<180;i++)update(1/60);
  offAttack();
  const attackWorked=attackTarget.dead||attackTarget.hp<attackHpBefore||projectiles.length>0;
  for(let i=0;i<180;i++)update(1/60);
  const beforeLevel=player.level;
  gainXp(5000);
  const sanitized=SaveManager.sanitizeAccount({
    gold:"손상",stats:{runs:-5},settings:{fps:999},
    weapons:[{id:'x" onclick="bad',weapon:"sword",grade:"common",ability:"han",name:"<img src=x>검"}]
  });
  return {
    state,elapsed,enemies:enemies.length,projectiles:projectiles.length,
    attackWorked,basicAttackEvents,attackHpBefore,attackHpAfter:attackTarget.hp,
    levelGain:player.level-beforeLevel,pending:pendingLevelUps,choices:ui.choices.children.length,
    sanitizedGold:sanitized.gold,sanitizedRuns:sanitized.stats.runs,sanitizedFps:sanitized.settings.fps,
    sanitizedId:sanitized.weapons[0].id,sanitizedName:sanitized.weapons[0].name
  };
})()`,context);
if(gameplay.state!=="levelup"||gameplay.elapsed<5.9||gameplay.enemies<1||!gameplay.attackWorked||gameplay.basicAttackEvents<1||gameplay.levelGain<2||gameplay.pending!==gameplay.levelGain||gameplay.choices!==3){
  throw new Error(`전투·연속 레벨업 검증 실패: ${JSON.stringify(gameplay)}`);
}

// 신규 무공은 습득 직후 공격하지 않고 준비시간과 첫 재사용 대기시간을 갖는다.
const skillGate=vm.runInContext(`(()=>{
  const learned=[];
  const off=GameEvents.on("skill:learned",detail=>learned.push(detail));
  const button=ui.choices.children.find(node=>node.innerHTML.includes("무공 습득"));
  if(!button)return {found:false};
  button.click();off();
  return {
    found:true,learned:learned.length,id:learned[0]?.id||"",
    warmup:player.skillWarmup,fireTimer:player.fireTimer,
    primedMeteor:(CombatProgressionV1431.primeNewArt("meteor"),player.cooldowns.meteor),
    threat:CombatProgressionV1431.threatFactor(),
    strongPower:CombatProgressionV1431.forgedPower({damageMul:2,ability:"han",potentials:[{key:"damage",value:.2}]})
  };
})()`,context);
if(!skillGate.found||skillGate.learned!==1||skillGate.warmup<.64||skillGate.fireTimer<.31||skillGate.primedMeteor<4.9||skillGate.strongPower<=1){
  throw new Error(`신규 무공 준비시간·동적 난이도 검증 실패: ${JSON.stringify(skillGate)}`);
}

if(gameplay.sanitizedGold!==0||gameplay.sanitizedRuns!==0||gameplay.sanitizedFps!==60||
   gameplay.sanitizedId.includes('"')||/[<>]/.test(gameplay.sanitizedName)){
  throw new Error(`저장 검증 실패: ${JSON.stringify(gameplay)}`);
}
console.log("브라우저 스모크 로드 통과",assertions);
console.log("전투 스모크 테스트 통과",gameplay);
console.log("신규 무공·동적 난이도 테스트 통과",skillGate);
