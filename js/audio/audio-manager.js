"use strict";

/**
 * HTMLAudioElement 기반 오디오 디렉터.
 *
 * - 첫 사용자 제스처 이후에만 전투 BGM을 재생한다.
 * - Master/BGM/SFX/UI 채널을 독립적으로 조절한다.
 * - 전투·보스·일시정지 상태에 맞춰 BGM 페이드와 채널 더킹을 적용한다.
 * - 등록되지 않았거나 파일이 없는 효과음은 오류 없이 무음 처리한다.
 * - 향후 파일을 추가하면 registerSFX()만 호출해 동일한 재생 API를 사용할 수 있다.
 */
const GameAudio=(()=>{
  const BGM_SRC="assets/audio/battle-bgm.mp3";
  const DEFAULTS=Object.freeze({master:.8,bgm:.55,sfx:.8,ui:.85});
  const manifests={sfx:new Map(),ui:new Map()};
  const pools={sfx:new Map(),ui:new Map()};
  let bgm=null,unlocked=false,muted=false;
  let bgmGain=0,targetBgmGain=0,sfxStateGain=1,uiStateGain=1;
  let lastUpdate=performance.now(),duckUntil=0,duckAmount=1,lastMode="menu";

  const clamp01=value=>Math.min(1,Math.max(0,Number(value)||0));
  const currentSettings=()=>{
    const source=account?.settings||{};
    return {
      master:clamp01(source.masterVolume??DEFAULTS.master),
      bgm:clamp01(source.bgmVolume??DEFAULTS.bgm),
      sfx:clamp01(source.sfxVolume??DEFAULTS.sfx),
      ui:clamp01(source.uiVolume??DEFAULTS.ui)
    };
  };

  function createElement(src,loop=false){
    const element=new Audio(src);
    element.preload=loop?"auto":"metadata";
    element.loop=loop;
    element.playsInline=true;
    element.crossOrigin="anonymous";
    return element;
  }

  function ensureBgm(){
    if(!bgm)bgm=createElement(BGM_SRC,true);
    return bgm;
  }

  function modeProfile(){
    const bossActive=!!(boss&&!boss.dead);
    if(state==="paused")return {mode:"pause",bgm:.16,sfx:.28,ui:.82};
    if(state==="cutscene")return {mode:"cutscene",bgm:.28,sfx:.48,ui:.75};
    if(state==="levelup"||state==="augment")return {mode:"choice",bgm:.48,sfx:.55,ui:1};
    if(state==="playing"&&bossActive)return {mode:"boss",bgm:.88,sfx:1,ui:.88};
    if(state==="playing")return {mode:"combat",bgm:1,sfx:1,ui:.9};
    if(state==="victory"||state==="gameover")return {mode:"result",bgm:.2,sfx:.5,ui:1};
    return {mode:"menu",bgm:.38,sfx:.6,ui:1};
  }

  function applyVolumes(){
    const settings=currentSettings();
    const active=muted||!soundOn?0:1;
    if(bgm)bgm.volume=clamp01(settings.master*settings.bgm*bgmGain*active);
  }

  function unlock(){
    if(unlocked)return;
    unlocked=true;
    const track=ensureBgm();
    track.volume=0;
    const playResult=track.play();
    if(playResult&&typeof playResult.catch==="function")playResult.catch(()=>{});
    syncState(true);
  }

  function syncState(immediate=false){
    const profile=modeProfile();
    targetBgmGain=profile.bgm;
    sfxStateGain=profile.sfx;
    uiStateGain=profile.ui;
    if(profile.mode!==lastMode){
      lastMode=profile.mode;
      if(profile.mode==="boss")duck(.42,.72);
    }
    if(immediate)bgmGain=Math.min(bgmGain,targetBgmGain*.15);
    applyVolumes();
  }

  function update(){
    if(!unlocked)return;
    const now=performance.now(),dt=Math.min(.1,Math.max(0,(now-lastUpdate)/1000));
    lastUpdate=now;
    syncState(false);
    const speed=targetBgmGain<bgmGain?5.8:2.4;
    bgmGain+= (targetBgmGain-bgmGain)*(1-Math.exp(-speed*dt));
    if(now>=duckUntil)duckAmount=1;
    applyVolumes();
  }

  function registerSFX(name,src,options={}){
    if(!name||!src)return false;
    const channel=options.channel==="ui"?"ui":"sfx";
    manifests[channel].set(name,{src,maxVoices:Math.max(1,Math.min(12,options.maxVoices||4)),volume:clamp01(options.volume??1)});
    pools[channel].delete(name);
    return true;
  }

  function poolFor(name,channel){
    const def=manifests[channel].get(name);
    if(!def)return null;
    if(!pools[channel].has(name)){
      const voices=Array.from({length:def.maxVoices},()=>createElement(def.src,false));
      pools[channel].set(name,{voices,index:0,def});
    }
    return pools[channel].get(name);
  }

  function play(name,channel="sfx",options={}){
    if(!unlocked||muted||!soundOn)return false;
    const actualChannel=channel==="ui"?"ui":"sfx";
    const pool=poolFor(name,actualChannel);
    if(!pool)return false;
    const voice=pool.voices[pool.index++%pool.voices.length];
    const settings=currentSettings();
    const stateGain=actualChannel==="ui"?uiStateGain:sfxStateGain;
    const channelGain=actualChannel==="ui"?settings.ui:settings.sfx;
    voice.pause();
    try{voice.currentTime=0}catch(_){/* 일부 브라우저는 메타데이터 전 접근을 막는다. */}
    voice.volume=clamp01(settings.master*channelGain*stateGain*duckAmount*pool.def.volume*(options.volume??1));
    const result=voice.play();
    if(result&&typeof result.catch==="function")result.catch(()=>{});
    return true;
  }

  function playSFX(name,options){return play(name,"sfx",options)}
  function playUI(name,options){return play(name,"ui",options)}

  function duck(duration=.25,amount=.68){
    duckUntil=Math.max(duckUntil,performance.now()+Math.max(0,duration)*1000);
    duckAmount=Math.min(duckAmount,clamp01(amount));
  }

  function setMuted(value){muted=!!value;soundOn=!muted;ui.soundBtn.textContent=muted?"🔇":"🔊";applyVolumes()}
  function toggleMuted(){setMuted(!muted);if(!muted)unlock();return muted}
  function configure(){syncState(false);applyVolumes()}

  // 현재 배포본에는 BGM만 포함된다. 아래 API로 실제 파일을 등록하기 전까지 SFX/UI 호출은 무음이다.
  GameEvents.on("runtime:frame",update);
  GameEvents.on("boss:spawn",()=>{duck(.55,.58);syncState(false)});
  GameEvents.on("ultimate:used",()=>duck(.7,.5));
  GameEvents.on("player:hurt",()=>duck(.16,.78));
  GameEvents.on("settings:save",configure);
  GameEvents.on("save:loaded",configure);
  GameEvents.on("run:finished",()=>syncState(false));

  ["pointerdown","touchstart","keydown"].forEach(type=>window.addEventListener(type,unlock,{once:true,passive:true}));

  return Object.freeze({unlock,update,configure,registerSFX,playSFX,playUI,duck,setMuted,toggleMuted,isUnlocked:()=>unlocked,isMuted:()=>muted});
})();
