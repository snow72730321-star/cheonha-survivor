import fs from "node:fs";
const k=fs.readFileSync("js/systems/katana-rework-v15.js","utf8");
const ok=(v,m)=>{if(!v)throw new Error(m)};
ok(k.includes('player.katanaMoonFormActive)return;'),"월영참 진행 중 월은화 재충전 차단 누락");
ok(k.includes('if(flipX)ctx.scale(-1,1)'),"VFX 수평 반전 렌더 지원 누락");
ok(k.includes('if(n==="1")flipX=true'),"월영참 1식 수평 반전 누락");
ok(k.includes('"jeolwol":{sheet:"jeolwol.sheet.png",fw:773,fh:435,frames:52,cols:8,d:Array(52).fill(50),total:2600}'),"절월 프레임 타이밍이 의도치 않게 변경됨");
ok(k.includes('d.slice(0,40).reduce((a,b)=>a+b,0)/1000'),"절월 41프레임 판정 지연 유지 실패");
console.log("v14.12.4 katana moonflower/direction audit: OK");
