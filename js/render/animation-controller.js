"use strict";

/**
 * 캐릭터 행동별 스프라이트 시트 레지스트리.
 *
 * 고급 에셋은 아래 경로 규칙으로 등록할 수 있다.
 * assets/characters/<캐릭터>/<idle|walk|dodge|hit|skill|dead>.png
 * 각 시트는 4방향 행과 행동별 프레임 열을 사용한다.
 * 등록되지 않은 행동은 기존 32×40, 방향별 4프레임 시트로 자동 대체된다.
 */
const AnimationController=(()=>{
  const directions={down:0,left:1,right:2,up:3};
  const registry=new Map();
  const images=new Map();

  function registerCharacter(id,actions){
    const normalized={};
    for(const [action,definition] of Object.entries(actions||{})){
      const defaults=GameBalance.animationDefaults[action]||GameBalance.animationDefaults.idle;
      normalized[action]=Object.assign({},defaults,definition,{dirs:directions});
      if(definition?.src){
        const image=new Image();image.decoding="async";image.src=definition.src;
        images.set(`${id}:${action}`,image);
      }
    }
    registry.set(id,normalized);
  }

  function definition(id,action){return registry.get(id)?.[action]||null}
  function image(id,action){return images.get(`${id}:${action}`)||null}

  function frame(id,action,time,dir){
    const meta=definition(id,action),img=image(id,action);
    if(!meta||!img?.complete||!img.naturalWidth)return null;
    const column=Math.floor(time*meta.fps)%meta.frames;
    return {img,meta,column,row:meta.dirs[dir]??0};
  }

  return Object.freeze({registerCharacter,definition,image,frame,directions});
})();

// 현재 번들에는 레거시 시트만 포함되어 있다. 향후 고급 시트를 추가할 때 이 객체만 채우면 된다.
const CHARACTER_ANIMATION_MANIFEST=window.CHARACTER_ANIMATION_MANIFEST||{};
for(const [id,actions] of Object.entries(CHARACTER_ANIMATION_MANIFEST))AnimationController.registerCharacter(id,actions);
