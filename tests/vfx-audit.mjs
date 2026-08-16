import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const vfxRoot=path.join(root,"assets","vfx");
const renderer=fs.readFileSync(path.join(root,"js","vfx","sprite-vfx-v14-3-8.js"),"utf8");
const katanaRenderer=fs.readFileSync(path.join(root,"js","systems","katana-rework-v15.js"),"utf8");
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
  const katanaFile=relative.includes("/skills/katana/");
  const katanaSheet=katanaFile&&relative.includes(".sheet");
  if(!relative.includes("/crests/")&&!katanaFile&&!renderer.includes(relative))throw new Error(`VFX 레지스트리 누락: ${relative}`);
  if(katanaFile&&!renderer.includes(relative)&&!katanaRenderer.includes(path.basename(relative)))throw new Error(`왜도 VFX 렌더러 매핑 누락: ${relative}`);
}

if(!renderer.includes('skillSaberThunderFan:{src:"assets/vfx/skills/saber/thunder_fan.png"'))throw new Error("벽력도법 부채꼴 전용 스프라이트 누락");
if(!renderer.includes('v.type==="cone"'))throw new Error("벽력도법 부채꼴 판정 렌더링 분기 누락");
if(renderer.includes('const spearTypes=new Set(["cone"'))throw new Error("벽력도법 cone이 다시 창기 화살 스프라이트에 연결됨");
for(const required of ["skillSwordMeteor","skillSpearSpin","skillBowArrowRain","skillPoisonExplosion","skillPoisonDemon","skillStingrainExplosion","skillExplodedButterfly","skillTaoIceArray","skillSaberWhirlwindUser","skillKatanaNameless","skillFistTaiji"]){
  if(!renderer.includes(required))throw new Error(`무공별 전용 VFX 매핑 누락: ${required}`);
}


const skillPngs=pngs.filter(file=>file.includes(`${path.sep}skills${path.sep}`)&&!file.endsWith(".sheet.png"));
const hashes=new Set(skillPngs.map(file=>fs.readFileSync(file).toString("base64")));
if(skillPngs.length<40||hashes.size!==skillPngs.length)throw new Error(`무기군별 skills VFX가 누락되었거나 중복됨: ${skillPngs.length}개 / 고유 ${hashes.size}개`);
if(!fs.existsSync(path.join(root,"assets/vfx/skills/sword/meteor_rain.png")))throw new Error("유성검우 사용자 스프라이트 누락");

for(const required of ["drawProjectiles=function","drawVisuals=function","drawHazards=function","drawFields=function","VFXSprites.spawn","GameAssets.load"]){
  if(!renderer.includes(required))throw new Error(`VFX 렌더러 필수 구현 누락: ${required}`);
}
if(!serviceWorker.includes("fetchAndCache(request)")||serviceWorker.includes('assets/vfx/skills/fist/fist_to_one.png'))throw new Error("대용량 VFX 런타임 캐시 정책 오류");
console.log(`VFX 검사 통과: 투명 PNG ${pngs.length}개, 레지스트리·런타임 캐시 정책 일치`);
