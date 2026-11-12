const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
function setup(html){
 const dom=new JSDOM('<body><div class="ja-face">'+html+'</div></body>',{url:'https://publisher.test/',runScripts:'outside-only'}),w=dom.window;
 const intervals=new Map();let id=0,cleared=0;
 w.setInterval=(fn,ms)=>{intervals.set(++id,{fn,ms});return id;};w.clearInterval=key=>{intervals.delete(key);cleared++;};
 Object.defineProperty(w.document,'hidden',{value:false,writable:true,configurable:true});
 w.eval(fs.readFileSync('joinads-reward-studio/assets/urgency.js','utf8'));
 const face=w.document.querySelector('.ja-face');
 return{w,face,intervals,tick:()=>[...intervals.values()].forEach(({fn})=>fn()),cleared:()=>cleared,dispose:()=>w.close()};
}
test('audience varies in both directions within limits and never changes its text or CTA',()=>{
 const c=setup('<button disabled>Native</button><div data-ja-audience data-minimum="320" data-maximum="335" data-initial="328" data-step="10" data-interval="2000"><span>Ana: <strong data-ja-audience-value>328</strong> watching now</span></div>');
 const stop=c.w.JoinAdsRewardUrgency.mount(c.face,'scope');const value=c.face.querySelector('strong');
 assert.equal(value.textContent,'328');assert.equal([...c.intervals.values()][0].ms,2000);
 c.w.Math.random=()=>.99;c.tick();assert.equal(value.textContent,'335');c.tick();assert.equal(value.textContent,'325');
 assert.equal(c.face.querySelector('span').textContent,'Ana: 325 watching now');assert.equal(c.face.querySelector('button').disabled,true);
 stop();stop();assert.equal(c.intervals.size,0);assert.equal(c.cleared(),1);c.dispose();
});
test('audience skips hidden/detached faces and static ranges create no timer',()=>{
 const c=setup('<div data-ja-audience data-minimum="1" data-maximum="9" data-initial="5"><strong data-ja-audience-value>5</strong></div>');
 const stop=c.w.JoinAdsRewardUrgency.mount(c.face,'scope');c.w.document.hidden=true;c.tick();assert.equal(c.face.querySelector('strong').textContent,'5');
 c.w.document.hidden=false;c.face.remove();c.tick();assert.equal(c.face.querySelector('strong').textContent,'5');stop();c.dispose();
 const fixed=setup('<div data-ja-audience data-minimum="4" data-maximum="4" data-initial="99"><strong data-ja-audience-value></strong></div>');fixed.w.JoinAdsRewardUrgency.mount(fixed.face,'scope');assert.equal(fixed.face.querySelector('strong').textContent,'4');assert.equal(fixed.intervals.size,0);fixed.dispose();
});
test('countdown updates cards, shows real final-seconds emphasis and expires without unlocking',()=>{
 const c=setup('<button disabled>Native</button><div data-ja-countdown data-layout="cards" data-mode="duration" data-seconds="120" data-urgent-seconds="60"><div role="timer"><span data-ja-countdown-value></span><span data-ja-unit="days"><strong data-ja-unit-value></strong></span><span data-ja-unit="minutes"><strong data-ja-unit-value></strong></span><span data-ja-unit="seconds"><strong data-ja-unit-value></strong></span></div><p data-ja-countdown-urgent hidden>Prazo terminando</p><p data-ja-countdown-status hidden>Encerrado</p></div>');
 let now=1700000000000;c.w.Date.now=()=>now;const stop=c.w.JoinAdsRewardUrgency.mount(c.face,'scope');
 const block=c.face.querySelector('[data-ja-countdown]');assert.equal(block.dataset.urgent,'false');assert.equal(block.querySelector('[data-ja-unit="days"]').hidden,true);assert.equal(block.querySelector('[data-ja-unit="minutes"] strong').textContent,'02');
 now+=61000;c.tick();assert.equal(block.dataset.urgent,'true');assert.equal(block.querySelector('[data-ja-countdown-urgent]').hidden,false);assert.equal(block.querySelector('[data-ja-unit="seconds"] strong').textContent,'59');
 now+=60000;c.tick();assert.equal(block.dataset.expired,'true');assert.equal(block.dataset.urgent,'false');assert.equal(block.querySelector('[data-ja-countdown-urgent]').hidden,true);assert.equal(c.face.querySelector('button').disabled,true);stop();c.dispose();
});
