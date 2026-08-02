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
class AudioContextStub{
  constructor(){this.state="running";this.currentTime=0;this.sampleRate=44100;this.destination={}}
  resume(){} createGain(){return {gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},connect(){return this}}}
  createOscillator(){return {frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){}},connect(){return this},start(){},stop(){}}}
  createBuffer(){return {getChannelData(){return new Float32Array(8)}}} createBufferSource(){return {connect(){return this},start(){}}} createBiquadFilter(){return {frequency:{value:0},connect(){return this}}}
}

const storage=new Map();
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key)};
const listeners=new Map();
const sandbox={
  console,document,localStorage,Image:ImageStub,AudioContext:AudioContextStub,webkitAudioContext:AudioContextStub,
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

// 실제 전투를 시작하고 고정 틱을 여러 번 실행해 생성·판정 경로가 예외 없이 동작하는지 확인한다.
const gameplay=vm.runInContext(`(()=>{
  selectedWeapon="sword";selectedDifficulty="chuchul";startGame();
  for(let i=0;i<360;i++)update(1/60);
  const beforeLevel=player.level;
  gainXp(5000);
  const sanitized=SaveManager.sanitizeAccount({
    gold:"손상",stats:{runs:-5},settings:{fps:999},
    weapons:[{id:'x" onclick="bad',weapon:"sword",grade:"common",ability:"han",name:"<img src=x>검"}]
  });
  return {
    state,elapsed,enemies:enemies.length,projectiles:projectiles.length,
    levelGain:player.level-beforeLevel,pending:pendingLevelUps,choices:ui.choices.children.length,
    sanitizedGold:sanitized.gold,sanitizedRuns:sanitized.stats.runs,sanitizedFps:sanitized.settings.fps,
    sanitizedId:sanitized.weapons[0].id,sanitizedName:sanitized.weapons[0].name
  };
})()`,context);
if(gameplay.state!=="levelup"||gameplay.elapsed<5.9||gameplay.enemies<1||gameplay.levelGain<2||gameplay.pending!==gameplay.levelGain||gameplay.choices!==3){
  throw new Error(`전투·연속 레벨업 검증 실패: ${JSON.stringify(gameplay)}`);
}
if(gameplay.sanitizedGold!==0||gameplay.sanitizedRuns!==0||gameplay.sanitizedFps!==60||
   gameplay.sanitizedId.includes('"')||/[<>]/.test(gameplay.sanitizedName)){
  throw new Error(`저장 검증 실패: ${JSON.stringify(gameplay)}`);
}
console.log("브라우저 스모크 로드 통과",assertions);
console.log("전투 스모크 테스트 통과",gameplay);
