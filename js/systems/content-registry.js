"use strict";

/**
 * 무공과 보스 콘텐츠의 공개 레지스트리.
 * 현재 전투 판정은 기존 런타임과 호환되며, 신규 콘텐츠는 이 인터페이스로 등록한다.
 */
const SkillRegistry=(()=>{
  const weapons=new Map();
  function register(weaponId,module){
    if(!weaponDefs[weaponId])throw new Error(`알 수 없는 무기군: ${weaponId}`);
    weapons.set(weaponId,Object.freeze(module));
  }
  function get(weaponId){return weapons.get(weaponId)}
  function list(){return [...weapons.entries()]}
  return Object.freeze({register,get,list});
})();

const BossRegistry=(()=>{
  const bosses=new Map();
  function register(id,module){bosses.set(id,Object.freeze(module))}
  function get(id){return bosses.get(id)}
  function list(){return [...bosses.entries()]}
  return Object.freeze({register,get,list});
})();
