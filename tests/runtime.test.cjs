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
