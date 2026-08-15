"use strict";

/** 왜도 무공 모듈. 전투 수치는 weaponDefs와 중앙 밸런스 데이터에서 읽는다. */
SkillRegistry.register("katana",{
  id:"katana",
  name:"왜도",
  basic:"발월",
  definitions:()=>[weaponDefs.katana.basic,...weaponDefs.katana.arts],
  /** 자동 공격은 중앙 전투 런타임을 호출해 판정 중복을 방지한다. */
  castBasic:()=>{if(selectedWeapon==="katana")fireBasic()},
  onSelected:()=>GameEvents.emit("skill:path-selected",{weapon:"katana"})
});
