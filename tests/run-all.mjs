import fs from "node:fs";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const testsDir=path.dirname(fileURLToPath(import.meta.url));
const tests=fs.readdirSync(testsDir).filter(name=>name.endsWith(".mjs")&&name!=="run-all.mjs").sort();
const failed=[];
for(const name of tests){
  const result=spawnSync(process.execPath,[path.join(testsDir,name)],{stdio:"inherit"});
  if(result.status!==0)failed.push(name);
}
if(failed.length){console.error(`실패한 테스트 ${failed.length}개: ${failed.join(", ")}`);process.exit(1)}
console.log(`전체 회귀 테스트 ${tests.length}개 통과`);
