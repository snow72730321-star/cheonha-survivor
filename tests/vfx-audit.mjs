import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const vfxRoot=path.join(root,"assets","vfx");
const renderer=fs.readFileSync(path.join(root,"js","vfx","sprite-vfx-v14-3-8.js"),"utf8");
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
if(pngs.length<49)throw new Error(`VFX 에셋 수 부족: ${pngs.length}`);
for(const file of pngs){
  const relative=path.relative(root,file).split(path.sep).join("/");
  const {width,height}=pngSize(file);
  if(width<32||height<32)throw new Error(`VFX 규격이 너무 작음: ${relative} ${width}x${height}`);
  if(!relative.includes("/crests/")&&!renderer.includes(relative))throw new Error(`VFX 레지스트리 누락: ${relative}`);
  if(!serviceWorker.includes(`"${relative}"`))throw new Error(`오프라인 캐시 누락: ${relative}`);
}

if(!renderer.includes('skillSaberThunderFan:{src:"assets/vfx/skills/saber_thunder_fan.png"'))throw new Error("벽력도법 부채꼴 전용 스프라이트 누락");
if(!renderer.includes('v.type==="cone"'))throw new Error("벽력도법 부채꼴 판정 렌더링 분기 누락");
if(renderer.includes('const spearTypes=new Set(["cone"'))throw new Error("벽력도법 cone이 다시 창기 화살 스프라이트에 연결됨");
for(const required of ["skillSwordMeteor","skillSpearSpin","skillBowArrowRain","skillPoisonThousand","skillTaoIceArray","skillSaberWhirlwindUser","skillKatanaNameless","skillFistTaiji"]){
  if(!renderer.includes(required))throw new Error(`무공별 전용 VFX 매핑 누락: ${required}`);
}


const skillPngs=pngs.filter(file=>file.includes(`${path.sep}skills${path.sep}`));
const hashes=new Set(skillPngs.map(file=>fs.readFileSync(file).toString("base64")));
if(skillPngs.length!==19||hashes.size!==19)throw new Error(`무공 전용 VFX가 누락되었거나 중복됨: ${skillPngs.length}개 / 고유 ${hashes.size}개`);

for(const required of ["drawProjectiles=function","drawVisuals=function","drawHazards=function","drawFields=function","VFXSprites.spawn","GameAssets.load"]){
  if(!renderer.includes(required))throw new Error(`VFX 렌더러 필수 구현 누락: ${required}`);
}
console.log(`VFX 검사 통과: 투명 PNG ${pngs.length}개, 레지스트리·오프라인 캐시 일치`);
