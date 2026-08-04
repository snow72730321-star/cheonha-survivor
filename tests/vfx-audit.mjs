import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const vfxRoot=path.join(root,"assets","vfx");
const renderer=fs.readFileSync(path.join(root,"js","vfx","sprite-vfx-v14-3-6.js"),"utf8");
const serviceWorker=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");

function walk(directory){
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
    const full=path.join(directory,entry.name);
    return entry.isDirectory()?walk(full):[full];
  });
}

function pngSize(filename){
  const data=fs.readFileSync(filename);
  const signature="89504e470d0a1a0a";
  if(data.subarray(0,8).toString("hex")!==signature)throw new Error(`PNG 서명 오류: ${filename}`);
  return {width:data.readUInt32BE(16),height:data.readUInt32BE(20)};
}

const pngs=walk(vfxRoot).filter(file=>file.endsWith(".png"));
if(pngs.length<24)throw new Error(`VFX 에셋 수 부족: ${pngs.length}`);
for(const file of pngs){
  const relative=path.relative(root,file).split(path.sep).join("/");
  const {width,height}=pngSize(file);
  if(width<32||height<32)throw new Error(`VFX 규격이 너무 작음: ${relative} ${width}x${height}`);
  if(!renderer.includes(relative))throw new Error(`VFX 레지스트리 누락: ${relative}`);
  if(!serviceWorker.includes(`"${relative}"`))throw new Error(`오프라인 캐시 누락: ${relative}`);
}

if(!renderer.includes('saberHeavy:{src:"assets/vfx/weapons/saber_heavy_arc.png"'))throw new Error("박도 전용 무화살표 참격 스프라이트 누락");
if(!renderer.includes('v.type==="heavyArc"'))throw new Error("박도 heavyArc 전용 렌더링 분기 누락");

for(const required of ["drawProjectiles=function","drawVisuals=function","drawHazards=function","drawFields=function","VFXSprites.spawn","GameAssets.load"]){
  if(!renderer.includes(required))throw new Error(`VFX 렌더러 필수 구현 누락: ${required}`);
}
console.log(`VFX 검사 통과: 투명 PNG ${pngs.length}개, 레지스트리·오프라인 캐시 일치`);
