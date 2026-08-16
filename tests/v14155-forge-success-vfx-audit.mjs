import assert from "node:assert/strict";
import fs from "node:fs";

const read=file=>fs.readFileSync(file,"utf8");
const assetPath="assets/vfx/forge/enhance-success.gif";
const gif=fs.readFileSync(assetPath);
const forge=read("js/systems/forge-v13.js");
const css=read("css/forge-v13.css");
const html=read("index.html");
const sw=read("service-worker.js");
const loader=read("js/core/asset-loader.js");

assert.match(gif.subarray(0,6).toString("ascii"),/^GIF8[79]a$/);
assert.ok(gif.length>50_000,"enhancement success GIF is unexpectedly small");

const graphicControlExtensions=[];
for(let i=0;i<gif.length-7;i++){
  if(gif[i]===0x21&&gif[i+1]===0xf9&&gif[i+2]===0x04)graphicControlExtensions.push(i);
}
assert.equal(graphicControlExtensions.length,9,"enhancement success GIF must retain all 9 frames");
assert.ok(graphicControlExtensions.every(i=>(gif[i+3]&0x01)===0x01),"every frame must declare transparency");
assert.ok(graphicControlExtensions.every(i=>((gif[i+3]>>2)&0x07)===2),"every frame must clear to the transparent background before the next frame");

assert.match(forge,/const ENHANCE_SUCCESS_VFX = "assets\/vfx\/forge\/enhance-success\.gif"/);
assert.match(forge,/scene\.querySelector\("\.forge-success-vfx"\)\?\.remove\(\)/);
assert.match(forge,/if\(effect==="success"\)[\s\S]*?scene\.appendChild\(vfx\)/);
assert.match(forge,/setTimeout\(\(\)=>setAnvilEffect\(scene\),successful\?850:650\)/);
assert.match(css,/\.forge-success-vfx\{[\s\S]*?pointer-events:none[\s\S]*?mix-blend-mode:screen/);
assert.match(css,/@keyframes enhanceSuccessVfxReveal/);
assert.match(html,/css\/forge-v13\.css\?v=14157/);
assert.match(sw,/cheonha-v14-15-7-cumulative-root/);
assert.doesNotMatch(sw.match(/const APP_SHELL=\[([\s\S]*?)\];/)?.[1]||"",/assets\/vfx\//,"VFX must stay out of the install-time app shell");
assert.ok(loader.includes(`"${assetPath}"`),"asset loader must warm enhancement success GIF");

console.log("v14.15.7 transparent enhancement success VFX audit: OK");
