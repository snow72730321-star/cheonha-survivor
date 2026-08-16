import fs from 'node:fs';
const css=fs.readFileSync('css/forge-mobile-final-v14-11-1.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('js/ui/forge-mobile-final-v14-11-1.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(html.includes('v14.15.0-authored-seeded-world-map'),'build meta missing');
ok(sw.includes('cheonha-v14-15-0-authored-seeded-world-map'),'cache key missing');
ok(html.includes('id="oreMileageShopOpen"')&&html.includes('<span>마일리지<br>상점</span>'),'mileage shop control missing');
ok(css.includes('#oreGacha .ore-gacha-shop-open')&&css.includes('right:4.7%!important')&&css.includes('border-radius:50%!important'),'mileage shop not mapped to right circle');
ok(css.includes('#oreGacha .ore-gacha-odds-toggle')&&css.includes('left:4.5%!important'),'odds control not moved to left edge');
ok(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))')&&css.includes('grid-template-rows:repeat(2,1fr)'),'weapon filters are not mapped as 5+4 slots');
ok(css.includes('overflow-y:auto!important')&&css.includes('touch-action:pan-y!important')&&css.includes('overscroll-behavior:contain!important'),'weapon inventory independent scroll missing');
ok(ui.includes('const previousScroll=host.scrollTop||0')&&ui.includes('host.scrollTop=Math.min(previousScroll'),'weapon scroll preservation missing');
ok(ui.includes('summaryHost=$("forgeOreSelectedSummary")'),'ore center frame was not repurposed');
ok(css.includes('.forge-ore-selected-summary')&&html.includes('id="forgeOreSelectedSummary"'),'ore center frame was not activated');
ok(html.includes('id="forgeOreActions"')&&css.includes('.forge-ore-actions button:nth-child(1)')&&css.includes('.forge-ore-actions button:nth-child(5)'),'ore action slots not aligned');
ok(css.includes('.forge-enhance-outcomes')&&css.includes('.forge-enhance-outcomes .destroy b'),'enhancement outcomes not remapped');
console.log('v14.12.2 forge UI scroll/alignment audit: OK');
