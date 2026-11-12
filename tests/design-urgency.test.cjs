const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const schema = JSON.parse(fs.readFileSync('joinads-reward-studio/config/appearance.json', 'utf8'));
function setup(markup = '') {
    const dom = new JSDOM('<body>' + markup + '</body>', { url:'https://publisher.test/', runScripts:'outside-only' });
    const w = dom.window;
    w.JoinAdsRewardDesignSchema = schema;
    w.eval(fs.readFileSync('joinads-reward-studio/assets/design.js', 'utf8'));
    w.eval(fs.readFileSync('joinads-reward-studio/assets/urgency.js', 'utf8'));
    return { w, doc:w.document, dispose:()=>w.close() };
}
test('appearance validates ranges and rejects CSS/URL injection',()=>{
    const c=setup(); const design=c.w.JoinAdsRewardDesign;
    const values=design.sanitize({width:99999,padding:-20,background:'red;position:fixed',backgroundImage:'javascript:alert(1)',position:'evil',font:'url(attack)',duration:NaN});
    assert.equal(values.width,1600);assert.equal(values.padding,0);assert.equal(values.background,'#ffffff');assert.equal(values.backgroundImage,'');assert.equal(values.position,'center');assert.equal(values.font,'system');assert.equal(values.duration,240);
    c.dispose();
});
test('geometry, overlay and image are scoped to the chosen modal and restore exactly',()=>{
    const c=setup('<div class="reward-modal-backdrop" style="z-index:123"><div id="root" style="color:red"><div class="ja-face">Face</div></div></div><div id="other" style="width:600px">Other</div>');
    const root=c.doc.getElementById('root'),overlay=root.parentElement,other=c.doc.getElementById('other');
    const cleanup=c.w.JoinAdsRewardDesign.apply(root,root.firstElementChild,{width:900,position:'bottom-right',mobilePosition:'bottom',backgroundImage:'https://publisher.test/pic.jpg',background:'#112233',overlayOpacity:.7});
    assert.equal(root.style.getPropertyValue('--ja-width'),'900px'); assert.equal(root.style.getPropertyValue('--ja-align-x'),'end');
    assert.equal(overlay.classList.contains('ja-designed-overlay'),true);
    assert.equal(root.querySelector('.ja-face-background-image').src,'https://publisher.test/pic.jpg');
    assert.equal(other.getAttribute('style'),'width:600px');
    cleanup();cleanup();
    assert.equal(root.getAttribute('style'),'color:red');assert.equal(overlay.getAttribute('style'),'z-index:123');assert.equal(root.querySelector('img'),null);assert.equal(root.classList.contains('ja-designed-modal'),false);
    c.dispose();
});
function countdown(mode='duration',seconds=120,deadline=''){
    return `<div class="ja-face"><button disabled>Core CTA</button><div data-ja-countdown data-mode="${mode}" data-seconds="${seconds}" data-deadline="${deadline}" data-timer-id="test" data-expiry="message" data-expired-label="Prazo encerrado"><span data-ja-countdown-value></span><p data-ja-countdown-status hidden></p></div></div>`;
}
test('visitor countdown survives remount and expires without affecting the ad',()=>{
    const c=setup(countdown()); let now=1700000000000;
    c.w.Date.now=()=>now;
    const face=c.doc.querySelector('.ja-face'),block=c.doc.querySelector('[data-ja-countdown]');
    let stop=c.w.JoinAdsRewardUrgency.mount(face,'reward:face:campaign');
    assert.equal(block.querySelector('span').textContent,'00 : 02 : 00');
    stop();now+=60000;
    stop=c.w.JoinAdsRewardUrgency.mount(face,'reward:face:campaign');
    assert.equal(block.querySelector('span').textContent,'00 : 01 : 00');
    stop();now+=61000;
    stop=c.w.JoinAdsRewardUrgency.mount(face,'reward:face:campaign');
    assert.equal(block.dataset.expired,'true');assert.equal(block.querySelector('p').textContent,'Prazo encerrado');assert.equal(face.querySelector('button').disabled,true);
    stop();c.dispose();
});
test('deadline is shared across visitors; unconfigured deadline stays hidden',()=>{
    const c=setup(countdown('deadline',120,'2030-01-01T00:00:00+00:00'));c.w.Date.now=()=>Date.parse('2029-12-31T23:59:00Z');
    const stop=c.w.JoinAdsRewardUrgency.mount(c.doc.querySelector('.ja-face'),'shared');
    assert.equal(c.doc.querySelector('[data-ja-countdown-value]').textContent,'00 : 01 : 00');stop();c.dispose();
    const empty=setup(countdown('deadline'));
    empty.w.JoinAdsRewardUrgency.mount(empty.doc.querySelector('.ja-face'),'empty');
    assert.equal(empty.doc.querySelector('[data-ja-countdown]').hidden,true);empty.dispose();
});
test('blocked storage falls back safely; intervals stop on teardown',()=>{
    const c=setup(countdown());Object.defineProperty(c.w,'localStorage',{get(){throw new Error('blocked')}});
    let cleared=0;c.w.setInterval=()=>42;c.w.clearInterval=id=>{assert.equal(id,42);cleared++;};
    const stop=c.w.JoinAdsRewardUrgency.mount(c.doc.querySelector('.ja-face'),'blocked');
    assert.equal(c.doc.querySelector('[data-ja-countdown-value]').textContent,'00 : 02 : 00');stop();assert.equal(cleared,1);c.dispose();
});
test('expiration can hide only its countdown and leaves all other content unchanged',()=>{
    const c=setup(countdown('deadline',120,'2020-01-01T00:00:00Z'));
    const block=c.doc.querySelector('[data-ja-countdown]');block.dataset.expiry='hide';
    c.w.JoinAdsRewardUrgency.mount(c.doc.querySelector('.ja-face'),'past');
    assert.equal(block.hidden,true);assert.equal(c.doc.querySelector('button').disabled,true);assert.equal(c.doc.querySelector('.ja-face').hidden,false);c.dispose();
});
test('one-click fullscreen covers desktop and mobile without erasing appearance',()=>{
    const c=setup();const d=c.w.JoinAdsRewardDesign;
    const result=d.applyFormat({background:'#123456',buttonBackground:'#abcdef',font:'serif',loadingLabel:'Aguarde'},'full');
    assert.equal(result.widthMode,'full');assert.equal(result.heightMode,'full');assert.equal(result.inset,0);assert.equal(result.radius,0);assert.equal(result.maxHeight,100);
    assert.equal(result.mobileWidthMode,'full');assert.equal(result.mobileHeightMode,'full');assert.equal(result.mobileInset,0);assert.equal(result.mobileRadius,0);
    assert.equal(result.background,'#123456');assert.equal(result.buttonBackground,'#abcdef');assert.equal(result.font,'serif');assert.equal(result.loadingLabel,'Aguarde');assert.equal(d.currentFormat(result),'full');
    const center=d.applyFormat(result,'center');assert.equal(center.widthMode,'fixed');assert.equal(center.heightMode,'auto');assert.equal(center.background,'#123456');assert.equal(d.currentFormat(center),'center');c.dispose();
});
test('palette switches preserve geometry and mobile settings',()=>{
    const c=setup();const d=c.w.JoinAdsRewardDesign;
    const full=d.applyFormat({},'full');const changed=d.applyPalette(full,'night');
    assert.equal(changed.background,'#111827');assert.equal(d.currentFormat(changed),'full');assert.equal(changed.mobileHeightMode,'full');assert.equal(changed.inset,0);
    assert.deepEqual(JSON.parse(JSON.stringify(d.applyPalette(changed,'unknown'))),JSON.parse(JSON.stringify(changed)));c.dispose();
});
