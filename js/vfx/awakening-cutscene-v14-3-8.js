"use strict";
/**
 * v14.3.8 절기 각성 컷인 모듈.
 * 상단 마법진 대신 가문 문장을 사용하고, 등장/발동 사운드를 분리한다.
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
  // v14.5.3 GIF 시험: 왜도 절기에서 사용자가 제공한 애니메이션을 실제 컷인 레이어로 재생한다.
  let katanaGif=cutscene.querySelector(".katana-ultimate-gif");
  if(!katanaGif){
    katanaGif=document.createElement("img");
    katanaGif.className="katana-ultimate-gif";
    katanaGif.alt="";katanaGif.decoding="async";katanaGif.draggable=false;
    cutscene.prepend(katanaGif);
  }
  const titleWrap=cutscene.querySelector(".cutscene-title-wrap");
  if(titleWrap&&!titleWrap.querySelector(".awakening-rank")){
    const rank=document.createElement("span");rank.className="awakening-rank";rank.textContent="절정 오의 · AWAKENING";titleWrap.prepend(rank);
  }

  const symbolByWeapon={sword:"劍",spear:"槍",bow:"弓",poison:"毒",tao:"符",saber:"刀",katana:"斬",fist:"拳"};
  const crestByWeapon={
    sword:"assets/vfx/crests/sword_crest.png",
    spear:"assets/vfx/crests/spear_crest.png",
    bow:"assets/vfx/crests/bow_crest.png",
    poison:"assets/vfx/crests/poison_crest.png",
    tao:"assets/vfx/crests/tao_crest.png",
    saber:"assets/vfx/crests/saber_crest.png",
    katana:"assets/vfx/crests/katana_crest.png",
    fist:"assets/vfx/crests/fist_crest.png"
  };
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
    const crest=crestByWeapon[selectedWeapon]||crestByWeapon.sword;
    cutscene.style.setProperty("--crest-url",`url('${crest}?assetBuild=v14.3.9-handcrafted-heraldry')`);
    drawPortrait(ui.cutsceneCanvas,selectedWeapon,currentSkin());

    const useKatanaGif=selectedWeapon==="katana";
    cutscene.classList.toggle("katana-gif-active",useKatanaGif);
    if(useKatanaGif){
      // src를 비웠다가 다시 지정해 매 절기 사용마다 GIF가 첫 프레임부터 재생되게 한다.
      if(typeof katanaGif.removeAttribute==="function")katanaGif.removeAttribute("src");else katanaGif.src="";
      void katanaGif.offsetWidth;
      katanaGif.src="assets/vfx/cutscenes/katana-munen-issen-test.gif?assetBuild=v14.5.3-gif-test";
    }else{
      if(typeof katanaGif.removeAttribute==="function")katanaGif.removeAttribute("src");else katanaGif.src="";
    }

    cutscene.classList.remove("show");cutscene.classList.add("awakening");void cutscene.offsetWidth;cutscene.classList.add("show");

    // 절기 컷신은 등장과 해방 사운드 두 축으로 정리한다.
    if(typeof GameEvents!=="undefined")GameEvents.emit("ultimate:used",{weapon:selectedWeapon});
    playAwakeningCue("awakening-entry");
    setTimeout(()=>playAwakeningCue("awakening-unleash"),1360);

    setTimeout(()=>{
      cutscene.classList.remove("show");
      cutscene.classList.remove("katana-gif-active");
      if(katanaGif)if(typeof katanaGif.removeAttribute==="function")katanaGif.removeAttribute("src");else katanaGif.src="";
      state="playing";ui.dodgeBtn.style.display="flex";ui.ultimateBtn.style.display="flex";
      ultimateAttack();screenShake=Math.max(screenShake,18);flash=Math.max(flash,.82);last=performance.now();
    },duration);
  };
})();
