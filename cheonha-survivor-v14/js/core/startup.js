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
      console.warn("누락된 에셋",result.failed);
      showSystemToast(`이미지 ${result.failed.length}개를 불러오지 못해 기본 도트로 대체합니다.`,true);
    }
  }catch(error){
    console.error("에셋 로딩 실패",error);
    showSystemToast("일부 에셋을 불러오지 못해 기본 도트로 실행합니다.",true);
  }

  buildDifficultyMenu();buildWeaponMenu();buildCodex();loadRecords();updateStartButton();updateHud();
  loader?.classList.add("done");setTimeout(()=>loader?.remove(),350);
  last=performance.now();requestAnimationFrame(loop);
  GameEvents.emit("app:ready",{});
})();

// 예기치 못한 오류를 콘솔에만 숨기지 않고 사용자에게 알린다.
window.addEventListener("error",event=>showSystemToast(`오류가 발생했습니다: ${event.message}`,true));
window.addEventListener("unhandledrejection",event=>showSystemToast(`처리되지 않은 오류: ${event.reason?.message||event.reason}`,true));
