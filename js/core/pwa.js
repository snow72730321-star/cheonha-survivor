"use strict";

/**
 * GitHub Pages 배포 후 새 서비스 워커를 즉시 확인한다.
 * 새 워커가 제어권을 얻으면 한 번만 새로고침해 구버전 JS와 신버전 HTML이
 * 섞이는 문제를 방지한다.
 */
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
  addEventListener("load",async()=>{
    try{
      const registration=await navigator.serviceWorker.register("service-worker.js",{updateViaCache:"none"});
      await registration.update();

      let refreshing=false;
      navigator.serviceWorker.addEventListener("controllerchange",()=>{
        if(refreshing)return;
        refreshing=true;
        location.reload();
      });
    }catch(error){
      console.warn("서비스 워커 등록 실패",error);
    }
  });
}
