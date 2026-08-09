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

class AudioParamStub{
  constructor(value=1){this.value=value}
  cancelScheduledValues(){}
  setTargetAtTime(value){this.value=value}
  setValueAtTime(value){this.value=value}
}
class GainNodeStub{
  constructor(){this.gain=new AudioParamStub(1);this.connections=[]}
  connect(node){this.connections.push(node);return node}
}
class MediaElementSourceStub{
  constructor(element){this.mediaElement=element;this.connections=[]}
  connect(node){this.connections.push(node);return node}
}
class AudioBufferSourceStub{
  constructor(){this.buffer=null;this.playbackRate={value:1};this.connections=[];this.onended=null;this.stopped=false}
  connect(node){this.connections.push(node);return node}
  start(){queueMicrotask(()=>this.onended?.())}
  stop(){this.stopped=true;queueMicrotask(()=>this.onended?.())}
}
class AudioContextStub{
  constructor(){this.state="running";this.currentTime=0;this.destination={}}
  createGain(){return new GainNodeStub()}
  createMediaElementSource(element){return new MediaElementSourceStub(element)}
  createBufferSource(){return new AudioBufferSourceStub()}
  decodeAudioData(_data,success){const buffer={duration:.3};queueMicrotask(()=>success?.(buffer));return Promise.resolve(buffer)}
  resume(){this.state="running";return Promise.resolve()}
}

const storage=new Map();
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const listeners=new Map();
const sandbox={
  console,document,localStorage,Image:ImageStub,Audio:AudioStub,AudioContext:AudioContextStub,
  navigator:{vibrate(){},serviceWorker:{register:async()=>({})}},location:{protocol:"https:"},
  innerWidth:1280,innerHeight:720,devicePixelRatio:1,performance,Math,Date,JSON,Map,Set,WeakMap,Promise,
  Blob:class{},URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},confirm:()=>false,
  setTimeout,clearTimeout,queueMicrotask,
  fetch:async()=>({ok:true,status:200,statusText:"OK",arrayBuffer:async()=>new ArrayBuffer(128)}),
  requestIdleCallback:callback=>setTimeout(()=>callback({timeRemaining:()=>8}),0),
  cancelIdleCallback:id=>clearTimeout(id),
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
if(assertions.version!==15||assertions.skills!==8||assertions.bosses!==1||!assertions.fixed||assertions.accountVersion!==15){
  throw new Error(`부팅 검증 실패: ${JSON.stringify(assertions)}`);
}

// v14.3.6 회귀: GainNode 믹서, AudioBuffer 재사용, 채널 음량을 확인한다.
await vm.runInContext("GameAudio.unlock()",context);
await new Promise(resolve=>setTimeout(resolve,40));
const audioRegression=vm.runInContext(`(()=>{
  state="playing";GameAudio.configure(true);
  const before=GameAudio.debugState();
  GameAudio.setVolume("bgm",.2,false);
  GameAudio.setVolume("sfx",.35,false);
  const played=GameAudio.playSFX("attack-sword");
  const saberPlayed=GameAudio.playSFX("attack-saber");
  const after=GameAudio.debugState();
  return {before,after,played,saberPlayed,panel:!!document.getElementById("audioQuickPanel")};
})()`,context);
if(!audioRegression.after.graph||audioRegression.after.registered<40||!audioRegression.played||!audioRegression.saberPlayed||audioRegression.after.loadedBuffers<2||
   Math.abs(audioRegression.after.settings.bgm-.2)>.001||Math.abs(audioRegression.after.settings.sfx-.35)>.001||
   !(audioRegression.after.gains.bgm<audioRegression.before.gains.bgm)||!audioRegression.panel){
  throw new Error(`오디오 믹서·효과음 회귀 검증 실패: ${JSON.stringify(audioRegression)}`);
}
console.log("AudioBuffer 오디오 엔진 회귀 테스트 통과",audioRegression);


// v14.3.7 회귀: 무공별 전용 VFX와 벽력도법 부채꼴이 실제 visuals에 생성되는지 확인한다.
const vfxRegression=vm.runInContext(`(()=>{
  const cases={
    sword:[["meteor",3]],spear:[["dragonspin",3]],bow:[["arrowrain",3],["sunmoon",2]],
    poison:[["thousand",3],["miasma",3]],tao:[["icepulse",3]],
    saber:[["mountain",3]],katana:[["moonchain",3],["zanshinDrop",3],["nameless",2]],
    fist:[["hundredstep",3],["taijifist",3],["dragonreturn",2]]
  };
  const emitted=[];visuals=[];
  for(const [weapon,skills] of Object.entries(cases)){selectedWeapon=weapon;for(const [id,lv] of skills){const before=visuals.length;emitSkillVfx(id,lv);emitted.push({weapon,id,type:visuals[before]?.type||""})}}
  selectedWeapon="saber";state="playing";visuals=[];enemies=[];player.arts.thundersaber=4;player.fireTimer=0;
  spawnEnemy("bandit",player.x+110,player.y);enemies[0].speed=0;GameSpatial.rebuild(enemies);fireBasic();
  return {emitted,saberTypes:visuals.map(v=>v.type),customCount:new Set(emitted.map(v=>v.type)).size};
})()`,context);
if(vfxRegression.customCount<13||!vfxRegression.saberTypes.includes("cone")||vfxRegression.saberTypes.includes("skillSaberThunderFan")||vfxRegression.emitted.some(item=>!item.type.startsWith("skill")&&item.type!=="namelessCutV1454")){
  throw new Error(`무공별 VFX·벽력도법 중복 방지 회귀 검증 실패: ${JSON.stringify(vfxRegression)}`);
}
console.log("무공별 전용 VFX·벽력도법 중복 방지 회귀 테스트 통과",vfxRegression);


// v14.8.0 회귀: 기본 천마합일과 천마신공 습득 후 진천마합일을 각각 실제 런타임 검증한다.
const saberUnityRuntime=vm.runInContext(`(()=>{
  const runCase=(heavenLv)=>{
    selectedWeapon="saber";selectedDifficulty="chuchul";startGame();state="playing";
    enemies=[];visuals=[];delayed=[];projectiles=[];
    player.arts.thundersaber=8;player.arts.mountain=3;player.arts.whirlwind=3;player.arts.bloodsaber=heavenLv;
    spawnEnemy("bandit",player.x+130,player.y);enemies[0].speed=0;enemies[0].damage=0;GameSpatial.rebuild(enemies);
    ultimateAttack();
    const timer=player.saberUnityTimer,isTrue=!!player.saberUnityTrue,name=currentUltimateName("saber");
    enemies=[];spawnEnemy("bandit",player.x+130,player.y);enemies[0].speed=0;enemies[0].damage=0;GameSpatial.rebuild(enemies);
    visuals=[];player.fireTimer=0;fireBasic();
    const basicTypes=visuals.map(v=>v.type),basicTimer=player.fireTimer;
    enemies=[];spawnEnemy("brute",player.x+160,player.y);enemies[0].speed=0;enemies[0].damage=0;GameSpatial.rebuild(enemies);
    visuals=[];player.cooldowns.mountain=0;player.cooldowns.whirlwind=999;tickArts(1/60);
    const mountainTypes=visuals.map(v=>v.type),mountainCd=player.cooldowns.mountain;
    return {timer,isTrue,name,basicTypes,basicTimer,mountainTypes,mountainCd};
  };
  return {base:runCase(0),trueUnity:runCase(1)};
})()`,context);
if(saberUnityRuntime.base.timer<14.9||saberUnityRuntime.base.isTrue||saberUnityRuntime.base.name!=="천마합일"||
   saberUnityRuntime.base.basicTypes.includes("skillSaberUnityThunder")||saberUnityRuntime.base.mountainTypes.includes("skillSaberUnityMountain")||
   !(saberUnityRuntime.base.basicTimer<.75)||
   saberUnityRuntime.trueUnity.timer<14.9||!saberUnityRuntime.trueUnity.isTrue||saberUnityRuntime.trueUnity.name!=="진천마합일"||
   !saberUnityRuntime.trueUnity.basicTypes.includes("skillSaberUnityThunder")||
   !saberUnityRuntime.trueUnity.mountainTypes.includes("skillSaberUnityMountain")||
   !(saberUnityRuntime.trueUnity.basicTimer<.7)||!(saberUnityRuntime.trueUnity.mountainCd<3.5)){
  throw new Error(`마련화 절기 리워크 런타임 검증 실패: ${JSON.stringify(saberUnityRuntime)}`);
}
console.log("마련화 천마합일/진천마합일 런타임 검증 통과",saberUnityRuntime);

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


// v14.5.2 후반 안정성 회귀: hazard 수명, XP 병합, 장수명 객체 강제 회수, profiler를 검증한다.
const lifecycleStress=vm.runInContext(`(()=>{
  state="playing";GamePerf.reset();
  hazards=[];fields=[];visuals=[];delayed=[];gems=[];
  for(let i=0;i<300;i++)hazards.push({type:"puddle",x:player.x+500,y:player.y+500,r:50,life:.04,damage:1,tick:.01,dead:false});
  updateHazards(.08);compactActive(hazards,h=>!h.dead);
  const puddlesAfter=hazards.length;

  let xpTotal=0;
  for(let i=0;i<1800;i++){const value=1+(i%4);xpTotal+=value;gems.push({kind:"xp",x:(i%90)*22,y:Math.floor(i/90)*22,r:5,value,vx:0,vy:0,dead:false})}
  mergeXpGemsIfNeeded();compactActive(gems,g=>!g.dead);
  const mergedTotal=gems.reduce((sum,g)=>sum+(g.kind==="xp"?g.value:0),0);
  const xpCount=gems.filter(g=>g.kind==="xp").length;

  fields.push({x:0,y:0,r:10,life:999,tick:999,damage:0,age:GAME_OBJECT_LIMITS.fieldMaxLife+.01});
  delayed.push({type:"aoe",x:0,y:0,r:1,damage:0,time:999,age:GAME_OBJECT_LIMITS.delayedMaxLife+.01});
  addVisual({type:"ring",x:0,y:0,r:1,life:999,max:999});
  visuals[visuals.length-1].age=GAME_OBJECT_LIMITS.visualMaxLife+.01;
  hazards.push({type:"unknown",x:0,y:0,dead:false});
  updateFields(1/60);updateDelayed(1/60);updateVisuals(1/60);updateHazards(1/60);
  compactActive(fields,f=>f.life>0);compactActive(delayed,d=>d.time>0);compactActive(visuals,v=>v.life>0);compactActive(hazards,h=>!h.dead);
  GamePerf.tick(.6);
  return {puddlesAfter,xpCount,xpTotal,mergedTotal,fields:fields.length,delayed:delayed.length,visuals:visuals.length,hazards:hazards.length,perf:GamePerf.snapshot()};
})()`,context);
if(lifecycleStress.puddlesAfter!==0||lifecycleStress.xpCount>700||lifecycleStress.xpTotal!==lifecycleStress.mergedTotal||
   lifecycleStress.fields!==0||lifecycleStress.delayed!==0||lifecycleStress.visuals!==0||lifecycleStress.hazards!==0||
   lifecycleStress.perf.mergedXp<1||lifecycleStress.perf.culled.fields<1||lifecycleStress.perf.culled.delayed<1||lifecycleStress.perf.culled.visuals<1||lifecycleStress.perf.culled.hazards<1){
  throw new Error(`후반 객체 수명·XP 병합 스트레스 검증 실패: ${JSON.stringify(lifecycleStress)}`);
}
console.log("후반 객체 수명·XP 병합 스트레스 테스트 통과",lifecycleStress);

// v14.3.1 회귀: 전체 절기 컷신이 공개되지 않은 GameAudio.play()를 호출해 즉시 중단되던 오류를 검증한다.
const ultimateRegression=vm.runInContext(`(()=>{
  state="playing";account.settings.cutsceneMode="full";account.settings.reducedMotion=false;
  player.ultimate=100;
  let emitted=0;const off=GameEvents.on("ultimate:used",()=>emitted++);
  useUltimate();off();
  return {state,ultimate:player.ultimate,emitted,legacyPlay:typeof GameAudio.play,playSFX:typeof GameAudio.playSFX};
})()`,context);
if(ultimateRegression.state!=="cutscene"||ultimateRegression.ultimate!==0||ultimateRegression.emitted!==1||ultimateRegression.legacyPlay!=="function"||ultimateRegression.playSFX!=="function"){
  throw new Error(`절기 오디오 회귀 검증 실패: ${JSON.stringify(ultimateRegression)}`);
}
console.log("절기 오디오 회귀 테스트 통과",ultimateRegression);
