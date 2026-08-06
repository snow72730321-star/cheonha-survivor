import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const refs=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1].split("?")[0]).filter(ref=>!ref.startsWith("http"));
const missing=refs.filter(ref=>!fs.existsSync(path.join(root,ref)));
if(missing.length)throw new Error(`누락된 HTML 참조: ${missing.join(", ")}`);
if(!html.includes('js/audio/audio-manager-v14-3-8.js'))throw new Error("v14.3.8 오디오 엔진이 HTML에 연결되지 않음");
if(!html.includes('js/vfx/sprite-vfx-v14-3-8.js'))throw new Error("v14.3.8 무공별 VFX 렌더러가 HTML에 연결되지 않음");
if(!html.includes('js/render/sprite-remaster-v14-3-18.js'))throw new Error("v14.3.18 원본 추출 정규화 렌더러가 HTML에 연결되지 않음");
if(html.includes('js/vfx/sprite-vfx-v14-3-6.js'))throw new Error("구형 v14.3.6 VFX 렌더러가 HTML에 남아 있음");
if(html.includes('js/audio/audio-manager-v14-3-5.js')||html.includes('js/audio/audio-manager-v14-3-4.js')||html.includes('js/audio/audio-manager-v14-3-3.js'))throw new Error("구형 오디오 엔진이 HTML에 남아 있음");

for(const requiredId of ["audioPanelBtn","audioQuickPanel","quickMasterVolume","quickBgmVolume","quickSfxVolume","quickUiVolume"]){
  if(!html.includes(`id="${requiredId}"`))throw new Error(`인게임 오디오 UI 누락: ${requiredId}`);
}

const serviceWorker=fs.readFileSync(path.join(root,"service-worker.js"),"utf8");
const shellBlock=serviceWorker.match(/const APP_SHELL=\[([\s\S]*?)\];/)?.[1]||"";
const shellRefs=[...shellBlock.matchAll(/"([^"]+)"/g)].map(match=>match[1]).filter(ref=>ref!=="./");
const missingShell=shellRefs.filter(ref=>!fs.existsSync(path.join(root,ref)));
if(missingShell.length)throw new Error(`누락된 서비스 워커 참조: ${missingShell.join(", ")}`);
if(shellBlock.includes("battle-bgm.mp3"))throw new Error("대용량 BGM이 서비스 워커 사전 캐시에 포함됨");
if(shellBlock.includes("assets/audio/sfx"))throw new Error("SFX가 앱 설치 단계에서 일괄 사전 캐시됨");
if(!serviceWorker.includes('endsWith("/assets/audio/battle-bgm.mp3")'))throw new Error("BGM 네트워크 스트리밍 예외 누락");

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

const audioManager=fs.readFileSync(path.join(root,"js/audio/audio-manager-v14-3-8.js"),"utf8");
for(const required of ["createBufferSource","decodeAudioData","MAX_ACTIVE_VOICES=10","GROUP_LIMITS","PROFILE_CHECK_MS","requestIdleCallback"]){
  if(!audioManager.includes(required))throw new Error(`모바일 오디오 최적화 누락: ${required}`);
}
const updateBody=audioManager.match(/function update\(\)\{([\s\S]*?)\n  \}/)?.[1]||"";
if(updateBody.includes("refreshControls"))throw new Error("오디오 프레임 업데이트에서 DOM 갱신이 다시 호출됨");
if(audioManager.includes("Array.from({length:def.maxVoices}"))throw new Error("구형 HTMLAudio 다중 풀 구현이 남아 있음");

if(!audioManager.includes('define("attack-katana","katana-iai-sharp-v1435.wav"'))throw new Error("일섬 발도술 신규 효과음 매핑 누락");
if(audioManager.includes('define("attack-katana","katana-cut.wav"'))throw new Error("일섬 발도술에 구형 뿅 계열 효과음이 남아 있음");
const iaiSfx=path.join(root,"assets/audio/sfx-hq/katana-iai-sharp-v1435.wav");
if(!fs.existsSync(iaiSfx)||fs.statSync(iaiSfx).size<50000)throw new Error("일섬 발도술 신규 WAV 누락 또는 손상");

if(!audioManager.includes('define("attack-saber","saber-greatblade-v1436.wav"'))throw new Error("박도 중량 공격음 매핑 누락");
if(audioManager.includes('define("attack-saber","blade-heavy.wav"'))throw new Error("박도에 구형 경량 공격음이 남아 있음");
const saberSfx=path.join(root,"assets/audio/sfx-hq/saber-greatblade-v1436.wav");
if(!fs.existsSync(saberSfx)||fs.statSync(saberSfx).size<90000)throw new Error("박도 중량 WAV 누락 또는 손상");

const sfxDir=path.join(root,"assets/audio/sfx-hq");
const sfxFiles=fs.readdirSync(sfxDir).filter(name=>name.endsWith(".wav"));
if(sfxFiles.length<35)throw new Error(`HQ 효과음 파일 부족: ${sfxFiles.length}개`);
let totalBytes=0;
for(const name of sfxFiles){
  const data=fs.readFileSync(path.join(sfxDir,name));
  totalBytes+=data.length;
  if(data.length<10000||data.toString("ascii",0,4)!=="RIFF"||data.toString("ascii",8,12)!=="WAVE"){
    throw new Error(`손상된 HQ WAV 효과음: ${name}`);
  }
  const channels=data.readUInt16LE(22);
  const rate=data.readUInt32LE(24);
  if(channels!==2||rate!==44100)throw new Error(`HQ WAV 규격 오류: ${name} (${channels}ch ${rate}Hz)`);
}
if(totalBytes>8*1024*1024)throw new Error(`HQ 효과음 총용량 과다: ${(totalBytes/1024/1024).toFixed(2)}MiB`);

for(const folder of ["characters","enemies"]){
  for(const name of fs.readdirSync(path.join(root,"assets",folder)).filter(name=>name.endsWith(".png"))){
    const data=fs.readFileSync(path.join(root,"assets",folder,name));
    const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
    const expected=folder==="characters"?(name==="sword.png"?[384,512]:[144,208]):[128,160];
    if(width!==expected[0]||height!==expected[1])throw new Error(`스프라이트 규격 오류: ${folder}/${name} ${width}x${height}`);
  }
}

const spriteRenderer=fs.readFileSync(path.join(root,"js/render/sprite-remaster-v14-3-18.js"),"utf8");
if(spriteRenderer.includes("row*fh+split"))throw new Error("상하체 분할 source rect가 남아 있음");
if(spriteRenderer.includes("fh-split"))throw new Error("상하체 분할 렌더링이 남아 있음");
for(const required of ["resolvePlayerSheetMeta","img.naturalWidth/playerSpriteSheetLayout.frames","img.naturalHeight/playerSpriteSheetLayout.directionRows","sourceScale=52/meta.frameH","external-png-assets-source-normalized-v14318"]){if(!spriteRenderer.includes(required))throw new Error(`동적 프레임 잘림 보정 누락: ${required}`);}

console.log(`정적 검사 통과: JS ${jsFiles.length}개, HTML 참조 ${refs.length}개, 오프라인 참조 ${shellRefs.length}개, HQ WAV ${sfxFiles.length}개 ${(totalBytes/1024/1024).toFixed(2)}MiB`);
