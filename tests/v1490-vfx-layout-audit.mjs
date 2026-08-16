import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

for(const dir of ["assets/vfx/user","assets/vfx/user_batch02","assets/vfx/user_poison"]){
  assert.equal(fs.existsSync(dir),false,`temporary VFX folder returned: ${dir}`);
}
for(const file of [
  "assets/vfx/weapons/saber_heavy_arc.png",
  "assets/vfx/skills/poison_miasma_bloom.png",
  "assets/vfx/skills/poison_thousand_fan.png",
  "assets/vfx/user/user_vfx_05.png"
]) assert.equal(fs.existsSync(file),false,`orphan VFX returned: ${file}`);

for(const weapon of ["sword","spear","bow","poison","tao","saber","katana","fist"]){
  const dir=`assets/vfx/skills/${weapon}`;
  assert.equal(fs.existsSync(dir),true,`missing weapon VFX directory: ${dir}`);
  assert.ok(fs.readdirSync(dir).some(f=>f.endsWith(".png")),`empty weapon VFX directory: ${dir}`);
}

const sprite=fs.readFileSync("js/vfx/sprite-vfx-v14-3-8.js","utf8");
for(const dead of ["saberHeavy","skillSaberSocheon","skillPoisonThousand","skillPoisonMiasma","skillPoisonLifeDeath"]){
  assert.doesNotMatch(sprite,new RegExp(`${dead}\\s*:`),`obsolete registry alias returned: ${dead}`);
}
const allFiles=[];
function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,f.name);f.isDirectory()?walk(p):allFiles.push(p.replaceAll("\\\\","/"));}}
walk("assets/vfx");
for(const f of allFiles.filter(f=>/\.(png|gif)$/i.test(f))){
  const hay=["js/core/asset-loader.js","js/vfx/sprite-vfx-v14-3-8.js","js/vfx/awakening-cutscene-v14-3-8.js","service-worker.js"].map(p=>fs.readFileSync(p,"utf8")).join("\n");
  assert.ok(hay.includes(f),`VFX file has no loader/registry/cutscene/cache reference: ${f}`);
}
console.log("v14.9.0 VFX layout audit: OK");
