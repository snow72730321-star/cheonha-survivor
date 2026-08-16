import fs from "node:fs";
const js=fs.readFileSync("js/systems/forge-v13.js","utf8");
const css=fs.readFileSync("css/forge-mobile-final-v14-11-1.css","utf8");
const sw=fs.readFileSync("service-worker.js","utf8");
const checks=[
 [js.includes("compare-weapon-art"),"compare weapon art"],
 [js.includes("compare-weapon-title"),"compare title"],
 [js.includes("compare-balance"),"compare balance"],
 [js.includes("potentialBox(\"기존\"")&&js.includes("potentialBox(\"신규\""),"existing/new potential boxes"],
 [css.includes("v14.12.8 — black jade comparison popup"),"comparison css"],
 [css.includes(".compare-box .potential-line:nth-of-type(3)"),"three exact potential rows"],
 [sw.includes("cheonha-v14-12-8-black-compare-align"),"cache bump"]
];
for(const [ok,name] of checks){if(!ok)throw new Error(`FAIL: ${name}`)}
console.log("v14.12.8 black-jade comparison alignment audit: OK");
