import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=path=>fs.readFileSync(path,"utf8");
const html=read("index.html"),source=read("js/systems/world-map-v14-15.js"),loader=read("js/core/asset-loader.js"),sw=read("service-worker.js");
const data=JSON.parse(read("assets/map/data/map-v1.json"));
const pkg=JSON.parse(read("package.json"));

assert.equal(pkg.version,"14.15.4");
assert.equal(data.schema,1);
assert.equal(data.version,"cheonha-world-v1");
assert.equal(data.seed,"cheonha-v14.15.0-world-v1");
assert.equal(data.worldHalf,2600);
assert.equal(data.zones.length,5);
assert.equal(data.roads.length,7);
assert.deepEqual(data.zones.map(zone=>zone.name),["연무장","청죽림","폐관문","월영지","단애로"]);

const art=[data.baseArt,...data.zones.map(zone=>zone.art)];
assert.equal(new Set(art).size,6);
for(const path of art){
  assert.ok(fs.existsSync(path),`map art missing: ${path}`);
  const bytes=fs.readFileSync(path);
  assert.ok(bytes.length>100_000,`map art unexpectedly small: ${path}`);
  assert.equal(bytes.toString("ascii",0,4),"RIFF",`invalid WebP RIFF header: ${path}`);
  assert.equal(bytes.toString("ascii",8,12),"WEBP",`invalid WebP signature: ${path}`);
  assert.ok(loader.includes(path),`map art not in essential loader: ${path}`);
  assert.ok(sw.includes(path),`map art not in offline shell: ${path}`);
}

assert.match(html,/js\/systems\/world-map-v14-15\.js/);
assert.ok(html.indexOf("world-map-v14-15.js")>html.indexOf("system-overhaul-v14-10.js"));
assert.match(source,/seededRandom\(map\.seed\)/);
assert.doesNotMatch(source,/Math\.random/);
assert.match(source,/drawMirroredGround/);
assert.match(source,/visibleBox/);
assert.match(source,/drawZonePlates/);
assert.match(source,/drawAuthoredMinimap/);
assert.doesNotMatch(source,/clampEntity|pathfind|collisionRadius|update=function/);

const silentConsole={log:()=>{},info:()=>{},warn:()=>{},error:()=>{}};
const context={
  console:silentConsole,window:{},fetch:async()=>({ok:true,json:async()=>data}),
  GameAssets:{url:value=>value,preloadList:async()=>({failed:[]}),image:()=>({naturalWidth:1})},
  drawBackground:()=>{},draw:()=>{},ws:(x,y)=>({x,y}),mobileCameraScale:()=>1,
  ctx:{},player:{x:0,y:0},W:390,H:844,state:"menu",enemies:[],chests:[],Math
};
vm.createContext(context);vm.runInContext(source,context);
const first=await context.window.GameWorldMap.prepare();
const second=await context.window.GameWorldMap.prepare();
assert.equal(first.ready,true);
assert.equal(first.seed,data.seed);
assert.equal(first.decorHash,"abbcd919");
assert.equal(second.decorHash,first.decorHash,"fixed seed produced a different decoration layout");
assert.deepEqual({...context.window.GameWorldMap.snapshot()},{version:"cheonha-world-v1",seed:data.seed,zoneCount:5,roadCount:7,decorCount:360,decorHash:"abbcd919"});

console.log("v14.15.0 fixed authored map/assets audit: OK",first);
