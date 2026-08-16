"use strict";

/** 새 빌드는 전투 데이터를 저장한 뒤 메뉴·결과 화면에서만 활성화한다. */
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
  addEventListener("load",async()=>{
    try{
      const registration=await navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"});
      let waitingWorker=registration.waiting||null,activationRequested=false,refreshing=false;
      const safeState=()=>typeof state==="undefined"||state==="menu"||state==="result";
      const announce=()=>showSystemToast?.(safeState()?"새 버전을 적용합니다.":"새 버전이 준비되었습니다. 이번 원정이 끝나면 적용합니다.");
      const applyWaitingUpdate=()=>{
        if(!waitingWorker||!safeState())return false;
        try{if(typeof saveAccountData==="function")saveAccountData()}catch(error){console.warn("업데이트 전 저장 실패",error)}
        activationRequested=true;waitingWorker.postMessage({type:"SKIP_WAITING"});return true;
      };
      const acceptWaiting=worker=>{waitingWorker=worker;announce();applyWaitingUpdate()};

      window.applyCheonhaUpdate=applyWaitingUpdate;
      if(waitingWorker)acceptWaiting(waitingWorker);
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller)acceptWaiting(worker)});
      });
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if(refreshing||!activationRequested)return;
        refreshing=true;location.reload();
      });
      GameEvents?.on?.("run:finished",()=>setTimeout(applyWaitingUpdate,0));
      document.addEventListener("visibilitychange",()=>{if(!document.hidden)applyWaitingUpdate()});
      window.setInterval?.(applyWaitingUpdate,1500);
      await registration.update();
    }catch(error){console.warn("서비스 워커 등록 실패",error)}
  });
}
