const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const runtime = fs.readFileSync('joinads-reward-studio/assets/frontend.js', 'utf8');
const id = '01KTS123456789ABCDEFGHJKMNP';
function setup(query = '', html = '') {
    const dom = new JSDOM(`<body><div role="dialog" aria-label="Original"><section><h2>Native</h2><button id="native" disabled>Native CTA</button><button id="close">Close</button></section></div>${html}</body>`, { url: `https://publisher.test/${query}`, runScripts: 'outside-only' });
    const w = dom.window;
    const root = w.document.querySelector('[role=dialog]');
    const button = root.querySelector('#native');
    const close = root.querySelector('#close');
    w.JoinAdsRewardDesignSchema = JSON.parse(fs.readFileSync('joinads-reward-studio/config/appearance.json', 'utf8'));
    w.eval(fs.readFileSync('joinads-reward-studio/assets/custom-css.js', 'utf8'));
    w.eval(fs.readFileSync('joinads-reward-studio/assets/design.js', 'utf8'));
    w.eval(fs.readFileSync('joinads-reward-studio/assets/urgency.js', 'utf8'));
    w.eval(runtime);
    const fire = (rewardId = id) => {
        w.dispatchEvent(new w.CustomEvent('joinads:reward-face', { detail: { version: 1, rewardId, root, button, close } }));
        w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
        Object.defineProperty(w.document, 'readyState', { value: 'interactive', configurable: true });
    };
    return { w, root, button, close, fire, dispose: () => w.close() };
}
function template(type = '', text = '{{person}}: {{type}}', watch = true) {
    return `<template data-ja-face data-reward-id="${id}" data-campaign-type="${type}" data-person-fallback="Visitante" data-type-fallback="conteúdo"><h2>${text}</h2>${watch ? '<button data-ja-action="watch">Assistir</button>' : ''}<button data-ja-action="close">Sair</button></template>`;
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
test('custom CSS is removed before the Core CTA runs and cannot bypass readiness',async()=>{
    const ctx=setup('',template());
    ctx.w.document.querySelector('template').dataset.customCss='.ja-face h2 { color:red } .ja-face-button { opacity:1 }';
    ctx.fire();
    assert.ok(ctx.w.document.querySelector('[data-ja-custom-style]'));
    const cta=ctx.root.querySelector('[data-ja-action=watch]');
    assert.equal(cta.disabled,true);
    let clicks=0;
    ctx.button.addEventListener('click',()=>{clicks++;assert.equal(ctx.w.document.querySelector('[data-ja-custom-style]'),null);assert.equal(ctx.root.hasAttribute('data-ja-css-scope'),false);});
    cta.click();assert.equal(clicks,0);
    ctx.button.disabled=false;await tick();cta.click();
    assert.equal(clicks,1);ctx.dispose();
});
test('personalizes text safely, selects exact campaign, keeps unrelated reward native', () => {
    const ctx = setup('?person=%3Cimg%20src=x%20onerror=alert(1)%3E&type=carro', template('', 'geral') + template('carro'));
    ctx.fire('unrelated');
    assert.equal(ctx.root.querySelector('.ja-face'), null);
    ctx.fire();
    assert.equal(ctx.root.querySelector('.ja-face h2').textContent, '<img src=x onerror=alert(1)>: carro');
    assert.equal(ctx.root.querySelector('.ja-face img'), null);
    assert.equal(ctx.root.getAttribute('aria-label'), '<img src=x onerror=alert(1)>: carro');
    ctx.dispose();
});
test('person accepts Base64, UTF-8, URL-safe alphabet and missing padding without decoding type',()=>{
    for(const name of ['Maria','João da Conceição','😃 Ana','aþ','A'.repeat(160)]){
        for(const encoded of [Buffer.from(name).toString('base64'),Buffer.from(name).toString('base64url')]){
            const ctx=setup('?person='+encodeURIComponent(encoded)+'&type=TWFyaWE%3D',template());ctx.fire();
            assert.equal(ctx.root.querySelector('.ja-face h2').textContent,name+': TWFyaWE=');ctx.dispose();
        }
    }
    for(const name of ['😃 Ana','aþ']){
        const encoded=Buffer.from(name).toString('base64');assert.ok(encoded.includes('+'));
        const ctx=setup('?person='+encoded,template());ctx.fire();
        assert.equal(ctx.root.querySelector('.ja-face h2').textContent,name+': conteúdo');ctx.dispose();
    }
});
test('plain names, malformed Base64 and invalid UTF-8 fall back safely; decoded markup remains text',()=>{
    for(const name of ['Maria','Ana Paula','José','%%%%','wyg=','AA==']){
        const ctx=setup('?person='+encodeURIComponent(name),template());ctx.fire();
        assert.equal(ctx.root.querySelector('.ja-face h2').textContent,name+': conteúdo');ctx.dispose();
    }
    const html='<img src=x onerror=alert(1)>',ctx=setup('?person='+Buffer.from(html).toString('base64url'),template());ctx.fire();
    assert.equal(ctx.root.querySelector('.ja-face h2').textContent,html+': conteúdo');assert.equal(ctx.root.querySelector('img'),null);ctx.dispose();
    const empty=setup('?person=',template());empty.fire();assert.equal(empty.root.querySelector('.ja-face h2').textContent,'Visitante: conteúdo');empty.dispose();
});
test('optional model personalizes text only, does not select a campaign and can use a per-face fallback',()=>{
    const value='<img src=x onerror=alert(1)> {{person}} & modelo à escolha';
    const ctx=setup('?person=TWFyaWE%3D&model='+encodeURIComponent(value),template('carro','Outra campanha')+template('','{{person}} | {{model}} | {{type}}'));
    ctx.fire();
    assert.equal(ctx.root.querySelector('.ja-face h2').textContent,'Maria | '+value+' | conteúdo');
    assert.equal(ctx.root.querySelector('.ja-face img'),null);ctx.dispose();
    for(const query of ['', '?model=', '?model=%20%00%20']){
        const empty=setup(query,template('','Conteúdo: {{ model }}'));empty.fire();
        assert.equal(empty.root.querySelector('.ja-face h2').textContent,'Conteúdo: ');empty.dispose();
        const fallback=setup(query,template('','{{model}}'));
        fallback.w.document.querySelector('template').dataset.modelFallback='Conteúdo padrão';fallback.fire();
        assert.equal(fallback.root.querySelector('.ja-face h2').textContent,'Conteúdo padrão');fallback.dispose();
    }
    const long=setup('?model='+('a'.repeat(1001)),template('','{{model}}'));long.fire();
    assert.equal(long.root.querySelector('.ja-face h2').textContent.length,1000);long.dispose();
});
test('pending/ready gating and native click delegation; original restored before delivery', async () => {
    const ctx = setup('', template());
    let clicks = 0;
    ctx.button.addEventListener('click', () => { clicks++; assert.equal(ctx.root.querySelector('.ja-face'), null); });
    ctx.fire();
    const cta = ctx.root.querySelector('[data-ja-action=watch]');
    assert.equal(cta.disabled, true);
    cta.click();
    assert.equal(clicks, 0);
    ctx.button.disabled = false;
    await tick();
    assert.equal(cta.disabled, false);
    cta.click();
    assert.equal(clicks, 1);
    assert.equal(ctx.root.querySelector('.ja-native-hidden'), null);
    assert.equal(ctx.root.getAttribute('aria-label'), 'Original');
    ctx.dispose();
});
test('early mount queues until footer templates exist; fallbacks resolve; duplicate mounts ignored', () => {
    const ctx = setup();
    ctx.w.dispatchEvent(new ctx.w.CustomEvent('joinads:reward-face', { detail: { version: 1, rewardId: id, root: ctx.root, button: ctx.button, close: null } }));
    ctx.w.document.body.insertAdjacentHTML('beforeend', template());
    ctx.w.document.dispatchEvent(new ctx.w.Event('DOMContentLoaded'));
    assert.equal(ctx.root.querySelector('.ja-face h2').textContent, 'Visitante: conteúdo');
    assert.equal(ctx.root.querySelector('[data-ja-action=close]').hidden, true);
    ctx.fire();
    assert.equal(ctx.root.querySelectorAll('.ja-face').length, 1);
    ctx.dispose();
});
test('invalid face falls back to native; unavailable teardown cleans observers', async () => {
    const bad = setup('', template('', 'Missing CTA', false));
    bad.fire();
    assert.equal(bad.root.querySelector('.ja-native-hidden'), null);
    bad.dispose();
    const ctx = setup('', template());
    ctx.fire();
    ctx.root.remove();
    await tick();
    assert.equal(ctx.root.querySelector('.ja-face'), null);
    assert.equal(ctx.root.querySelector('.ja-native-hidden'), null);
    ctx.dispose();
});
test('close delegates to Core and restores original UI', () => {
    const ctx = setup('', template());
    let closed = 0;
    ctx.close.addEventListener('click', () => closed++);
    ctx.fire();
    ctx.root.querySelector('[data-ja-action=close]').click();
    assert.equal(closed, 1);
    assert.equal(ctx.root.querySelector('.ja-face'), null);
    ctx.dispose();
});
test('native drawer close via Escape cleans a reusable container', async () => {
    const ctx = setup('', template());
    const drawer = ctx.w.document.createElement('div');
    drawer.id = 'ja-drawer';
    drawer.className = 'ja-open';
    ctx.root.before(drawer);
    drawer.appendChild(ctx.root);
    ctx.fire();
    assert.ok(ctx.root.querySelector('.ja-face'));
    drawer.classList.remove('ja-open');
    await tick();
    assert.equal(ctx.root.querySelector('.ja-face'), null);
    assert.equal(ctx.root.querySelector('.ja-native-hidden'), null);
    ctx.dispose();
});
