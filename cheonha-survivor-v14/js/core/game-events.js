"use strict";

/**
 * 게임 전역 이벤트 버스.
 *
 * 기존 프로젝트는 여러 파일이 함수를 순서대로 덮어쓰는 방식에 의존했다.
 * 신규 기능은 가능한 한 이 이벤트 버스를 구독하여 로딩 순서 결합을 줄인다.
 */
const GameEvents=(()=>{
  const listeners=new Map();

  function on(type,handler){
    if(typeof handler!=="function")throw new TypeError("이벤트 핸들러는 함수여야 합니다.");
    if(!listeners.has(type))listeners.set(type,new Set());
    listeners.get(type).add(handler);
    return ()=>off(type,handler);
  }

  function once(type,handler){
    const unsubscribe=on(type,payload=>{unsubscribe();handler(payload)});
    return unsubscribe;
  }

  function off(type,handler){
    listeners.get(type)?.delete(handler);
  }

  function emit(type,payload={}){
    const handlers=listeners.get(type);
    if(!handlers)return;
    for(const handler of [...handlers]){
      try{handler(payload)}catch(error){console.error(`[GameEvents:${type}]`,error)}
    }
  }

  function clear(type){
    if(type)listeners.delete(type);else listeners.clear();
  }

  return Object.freeze({on,once,off,emit,clear});
})();
