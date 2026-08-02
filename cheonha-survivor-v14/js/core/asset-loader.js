"use strict";

/**
 * 필수 이미지의 로딩 상태와 규격을 검사한다.
 * 실패한 이미지는 기존 코드 생성 도트 캐릭터로 자동 대체된다.
 */
const GameAssets=(()=>{
  const characterIds=["sword","spear","bow","poison","tao","saber","katana","fist"];
  const enemyIds=["bandit","spear","brute","master","assassin","blackblade","ironmonk","poisonhand","boss"];
  const files=[
    ...characterIds.map(id=>`assets/characters/${id}.png`),
    ...characterIds.map(id=>`assets/portraits/${id}.png`),
    ...enemyIds.map(id=>`assets/enemies/${id}.png`)
  ];
  const status=new Map();

  function loadImage(src){
    return new Promise(resolve=>{
      const image=new Image();
      image.onload=()=>{status.set(src,{ok:true,width:image.naturalWidth,height:image.naturalHeight});resolve(status.get(src))};
      image.onerror=()=>{status.set(src,{ok:false,width:0,height:0});resolve(status.get(src))};
      image.src=src;
    });
  }

  async function preload(onProgress=()=>{}){
    let done=0;
    await Promise.all(files.map(async src=>{
      await loadImage(src);done++;onProgress(done,files.length,src);
    }));
    const failed=[...status.entries()].filter(([,value])=>!value.ok).map(([src])=>src);
    return {total:files.length,failed,status};
  }

  return Object.freeze({preload,status,files});
})();
