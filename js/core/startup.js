"use strict";

/** 애플리케이션 부팅 순서를 한곳에서 관리한다. */
(async function startup(){
  const loader=document.getElementById("assetLoader");
  const loaderText=document.getElementById("assetLoaderText");
  const loaderFill=document.getElementById("assetLoaderFill");

  // 저장 데이터를 가장 먼저 불러와 그래픽·접근성 설정을 초기 화면부터 적용한다.
  resize();loadAccountData();AdvancedSettings.apply();

  try{
    const result=await GameAssets.preload((done,total,src)=>{
      if(loaderFill)loaderFill.style.width=`${Math.round(done/total*100)}%`;
      if(loaderText)loaderText.textContent=`${done}/${total} · ${src.split("/").pop()}`;
    });
    if(result.failed.length){
      console.error("누락된 외부 PNG 에셋",result.failed);
      showSystemToast(`외부 PNG ${result.failed.length}개를 불러오지 못했습니다. 구형 생성 캐릭터는 사용하지 않습니다.`,true);
    }else{
      console.info(`[에셋 렌더러] ${GameAssets.BUILD} · 캐릭터/VFX PNG ${result.total}개 준비 완료`);
    }
  }catch(error){
    console.error("에셋 로딩 실패",error);
    showSystemToast("외부 PNG 에셋 로딩에 실패했습니다. 캐시를 지우고 다시 접속해 주세요.",true);
  }

  buildDifficultyMenu();buildWeaponMenu();buildCodex();loadRecords();updateStartButton();updateHud();
  loader?.classList.add("done");setTimeout(()=>loader?.remove(),350);
  last=performance.now();requestAnimationFrame(loop);
  GameEvents.emit("app:ready",{renderer:window.__CHEONHA_RENDERER_MODE__||"unknown",assetBuild:GameAssets.BUILD});
})();

// 예기치 못한 오류를 콘솔에만 숨기지 않고 사용자에게 알린다.
window.addEventListener("error",event=>showSystemToast(`오류가 발생했습니다: ${event.message}`,true));
window.addEventListener("unhandledrejection",event=>showSystemToast(`처리되지 않은 오류: ${event.reason?.message||event.reason}`,true));
