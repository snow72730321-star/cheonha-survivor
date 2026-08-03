"use strict";

/** 혈마 보스 모듈. 패턴 이름과 난이도별 사용 가능 여부를 외부 도감·테스트에 제공한다. */
BossRegistry.register("blood-demon",{
  id:"blood-demon",name:"혈마",
  phases:[
    {id:"base",threshold:1,patterns:["혈교 사도 소환","혈폭장","혈영신법","혈옥산화"]},
    {id:"blood-sea",threshold:.65,patterns:["십자혈열참","혈지장"]},
    {id:"heaven-demon",threshold:.35,patterns:["혈영연진","천열십자"]}
  ],
  spawn:()=>spawnBoss(),
  active:()=>boss&&!boss.dead
});
