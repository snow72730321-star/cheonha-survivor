import fs from 'node:fs';
const css=fs.readFileSync('css/forge-mobile-final-v14-11-1.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('js/ui/forge-mobile-final-v14-11-1.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
function ok(c,m){if(!c)throw new Error(m)}
ok(html.includes('v14.12.2-forge-hitbox-scroll-polish'),'build meta missing');
ok(sw.includes('cheonha-v14-12-2-forge-hitbox-scroll-polish'),'cache key missing');
ok(html.includes('id="oreMileageShopOpen"')&&html.includes('<span>상점</span>'),'mileage shop control missing');
ok(css.includes('#oreGacha .ore-gacha-shop-open')&&css.includes('right:5.15%!important')&&css.includes('border-radius:50%!important'),'mileage shop not mapped to right circle');
ok(css.includes('#oreGacha .ore-gacha-odds-toggle')&&css.includes('left:0!important')&&css.includes('border-left:0!important'),'odds control not moved to left edge');
ok(css.includes('grid-template-columns:repeat(9,minmax(0,1fr))'),'weapon filters are not rebuilt as 9 slots');
ok(css.includes('overflow-y:auto!important')&&css.includes('touch-action:pan-y!important')&&css.includes('overscroll-behavior:contain!important'),'weapon inventory independent scroll missing');
ok(ui.includes('const previousScroll=host.scrollTop||0')&&ui.includes('host.scrollTop=Math.min(previousScroll'),'weapon scroll preservation missing');
ok(ui.includes('forge-ore-selected-summary'),'ore center frame was not repurposed');
ok(css.includes('.forge-ore-selected-summary')&&css.includes('#forge .forge-mobile-ores::after{display:none!important}'),'ore center frame was not activated');
ok(css.includes('button:nth-child(3){left:5.6%!important')&&css.includes('button:nth-child(1){left:8.4%!important'),'ore action slots not aligned');
ok(css.includes('.forge-rate-card>div:nth-child(2){top:49.05%!important')&&css.includes('.forge-risk-note{left:17.7%!important'),'enhancement outcomes not remapped');
console.log('v14.12.2 forge UI scroll/alignment audit: OK');
