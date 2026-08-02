"use strict";

/**
 * 전투 중 반복 생성되는 작은 객체를 재사용한다.
 * 모바일 브라우저의 가비지 컬렉션 순간 끊김을 줄이는 것이 목적이다.
 */
function createObjectPool(maxSize=1500){
  const free=[];
  return {
    acquire(defaults,values){
      const item=free.pop()||{};
      for(const key of Object.keys(item))delete item[key];
      return Object.assign(item,defaults,values);
    },
    release(item){
      if(item&&free.length<maxSize)free.push(item);
    },
    size(){return free.length}
  };
}

const GamePools=Object.freeze({
  projectile:createObjectPool(1800),
  particle:createObjectPool(2600)
});
