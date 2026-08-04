import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1].split("?")[0]).filter(ref=>!ref.startsWith("http"));
const missing=refs.filter(ref=>!fs.existsSync(path.join(root,ref)));
if(missing.length)throw new Error(`누락된 HTML 참조: ${missing.join(", ")}`);

for(const requiredId of ["audioPanelBtn","audioQuickPanel","quickMasterVolume","quickBgmVolume","quickSfxVolume","quickUiVolume"]){
  if(!html.includes(`id="${requiredId}"`))throw new Error(`인게임 오디오 UI 누락: ${requiredId}`);
}

// 서비스 워커의 앱 셸 목록도 실제 파일과 일치해야 완전한 오프라인 설치가 가능하다.
const serviceWorker=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const shellBlock=serviceWorker.match(/const APP_SHELL=\[([\s\S]*?)\];/)?.[1]||"";
const shellRefs=[...shellBlock.matchAll(/"([^"]+)"/g)].map(match=>match[1]).filter(ref=>ref!=="./");
const missingShell=shellRefs.filter(ref=>!fs.existsSync(path.join(root,ref)));
if(missingShell.length)throw new Error(`누락된 서비스 워커 참조: ${missingShell.join(", ")}`);

const jsFiles=[];
function walk(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const full=path.join(directory,entry.name);
    if(entry.isDirectory())walk(full);else if(full.endsWith(".js"))jsFiles.push(full);
  }
}
walk(path.join(root,"js"));
const combined=jsFiles.map(file=>fs.readFileSync(file,"utf8")).join("\n");
for(const forbidden of ["openLevelUp","cloneNode(true)","sort(()=>Math.random()-.5)","createOscillator","OscillatorNode","webkitAudioContext","function beep","beep("]){
  if(combined.includes(forbidden))throw new Error(`제거되지 않은 위험 패턴: ${forbidden}`);
}
for(const required of ["GameSpatial.queryCircle","pendingLevelUps","SaveManager","fixedTimestepLoop","SkillRegistry.register","CombatProgressionV1431","registerSFX","battle-bgm.mp3","createMediaElementSource","createGain","attack:basic","level:gained"]){
  if(!combined.includes(required))throw new Error(`필수 개선 코드 누락: ${required}`);
}

const sfxDir=path.join(root,"assets/audio/sfx");
const sfxFiles=fs.readdirSync(sfxDir).filter(name=>name.endsWith(".wav"));
if(sfxFiles.length<30)throw new Error(`효과음 파일 부족: ${sfxFiles.length}개`);
for(const name of sfxFiles){
  const data=fs.readFileSync(path.join(sfxDir,name));
  if(data.length<1000||data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WAVE"){
    throw new Error(`손상된 WAV 효과음: ${name}`);
  }
}

console.log(`정적 검사 통과: JS ${jsFiles.length}개, HTML 참조 ${refs.length}개, 오프라인 참조 ${shellRefs.length}개, WAV ${sfxFiles.length}개`);
