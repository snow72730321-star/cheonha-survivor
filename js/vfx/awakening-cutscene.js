"use strict";
/**
 * v12.1 절기 각성 컷인 모듈.
 * 기존 궁극기 판정과 ultimateAttack()은 유지하고, 컷신의 시간축과 화면 구성만 교체한다.
 */
(function installAwakeningCutscene(){
  const cutscene=ui.cutscene;
  if(!cutscene)return;

  // 기존 HTML을 깨지 않고 필요한 장식 레이어만 동적으로 추가한다.
  const layers=[
    ["awakening-ink","div"],
    ["awakening-band","div"],
    ["awakening-symbol","div"],
    ["awakening-speed","div"],
    ["awakening-whiteout","div"]
  ];
  for(const [cls,tag] of layers){
    if(cutscene.querySelector("."+cls))continue;
    const el=document.createElement(tag);el.className=cls;
    cutscene.prepend(el);
  }
  const titleWrap=cutscene.querySelector(".cutscene-title-wrap");
  if(titleWrap&&!titleWrap.querySelector(".awakening-rank")){
    const rank=document.createElement("span");rank.className="awakening-rank";rank.textContent="절정 오의 · AWAKENING";titleWrap.prepend(rank);
  }

  const symbolByWeapon={sword:"劍",spear:"槍",bow:"弓",poison:"毒",tao:"符",saber:"刀",katana:"斬",fist:"拳"};
  const duration=2050;

  /**
   * 오디오 API 세대가 캐시에 섞여도 절기 사용 자체가 중단되지 않도록 한다.
   * v14.3.1의 GameAudio.play() 직접 호출은 새 매니저에서 공개되지 않아
   * TypeError를 발생시켰으므로, 공개 API를 기능 검사 후 호출한다.
   */
  function playAwakeningCue(name){
    if(typeof GameAudio==="undefined")return false;
    if(typeof GameAudio.playSFX==="function")return GameAudio.playSFX(name);
    if(typeof GameAudio.play==="function")return GameAudio.play(name);
    return false;
  }

  /** 절기 버튼 입력 시 2.05초 컷인을 재생한 뒤 기존 공격 판정을 실행한다. */
  useUltimate=function(){
    if(state!=="playing"||player.ultimate<100)return;
    player.ultimate=0;player.ultimateUses++;player.metrics.ultimateUses++;updateUltimateHud();
    state="cutscene";ui.dodgeBtn.style.display="none";ui.ultimateBtn.style.display="none";

    const ch=characterDefs[selectedWeapon];
    const pal=ultimatePalettes[selectedWeapon]||["#fff0a0","#d9b95f"];
    cutscene.style.setProperty("--ult",pal[0]);cutscene.style.setProperty("--ult2",pal[1]);
    ui.cutsceneName.textContent=ch.ultimate;
    ui.cutsceneLine.textContent=ch.name+" · "+ch.quote;
    const symbol=cutscene.querySelector(".awakening-symbol");if(symbol)symbol.textContent=symbolByWeapon[selectedWeapon]||"武";
    drawPortrait(ui.cutsceneCanvas,selectedWeapon,currentSkin());

    cutscene.classList.remove("show");cutscene.classList.add("awakening");void cutscene.offsetWidth;cutscene.classList.add("show");

    // 각성기 특유의 정적 → 기동 → 폭발 흐름을 오디오 레이어와 맞춘다.
    // 실제 SFX 파일이 등록되지 않은 상태에서는 안전하게 무음 처리된다.
    if(typeof GameEvents!=="undefined")GameEvents.emit("ultimate:used",{weapon:selectedWeapon});
    playAwakeningCue("awakening-start");
    setTimeout(()=>playAwakeningCue("awakening-rise"),330);
    setTimeout(()=>playAwakeningCue("awakening-slash"),790);
    setTimeout(()=>playAwakeningCue("awakening-impact"),1490);

    setTimeout(()=>{
      cutscene.classList.remove("show");
      state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";
      ultimateAttack();screenShake=Math.max(screenShake,16);flash=Math.max(flash,.75);last=performance.now();
    },duration);
  };
})();
