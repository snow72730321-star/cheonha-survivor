"use strict";

/**
 * 적 충돌 탐색용 Spatial Hash Grid.
 * 투사체마다 모든 적을 훑는 O(P×E) 구조를 주변 셀 조회로 줄인다.
 */
const GameSpatial=(()=>{
  const cellSize=GameBalance.spatialCellSize;
  const cells=new Map();

  const key=(x,y)=>`${x},${y}`;
  const cell=value=>Math.floor(value/cellSize);

  function rebuild(list){
    cells.clear();
    for(const entity of list){
      if(!entity||entity.dead)continue;
      const k=key(cell(entity.x),cell(entity.y));
      if(!cells.has(k))cells.set(k,[]);
      cells.get(k).push(entity);
    }
  }

  function queryAABB(minX,minY,maxX,maxY){
    const result=[];
    const seen=new Set();
    for(let y=cell(minY);y<=cell(maxY);y++){
      for(let x=cell(minX);x<=cell(maxX);x++){
        for(const entity of cells.get(key(x,y))||[]){
          if(!seen.has(entity)){seen.add(entity);result.push(entity)}
        }
      }
    }
    return result;
  }

  function queryCircle(x,y,r){
    return queryAABB(x-r,y-r,x+r,y+r);
  }

  return Object.freeze({rebuild,queryAABB,queryCircle,cellSize});
})();
