const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
function setup() {
    const dom = new JSDOM('<body><h2 id="outside">Site</h2><div class="reward-modal-backdrop"><div id="modal"><section><h2 id="native">Core</h2><button id="native-button" disabled>Core</button></section><div class="ja-face"><h2 id="title">Face</h2><button class="ja-face-button">Assistir</button></div></div></div><div class="ja-face" id="other"><h2>Outra face</h2></div></body>', {runScripts:'outside-only'});
    const w = dom.window;
    for (const file of ['custom-css','studio-order','studio-layout']) w.eval(fs.readFileSync('joinads-reward-studio/assets/'+file+'.js','utf8'));
    return {w,doc:w.document,css:w.JoinAdsRewardCustomCSS,dispose:()=>w.close()};
}
test('CSS cannot style the publisher, another face, native controls or escaped siblings',()=>{
    const c=setup(),root=c.doc.getElementById('modal'),face=root.querySelector('.ja-face');
    const cleanup=c.css.apply(root,face,[root.parentElement],'* { color:red; } .ja-face + section, .reward-modal-backdrop + div { display:none; }');
    const style=c.doc.querySelector('[data-ja-custom-style]');
    assert.ok(style);
    const matched=Array.from(style.sheet.cssRules).flatMap(rule=>Array.from(c.doc.querySelectorAll(rule.selectorText)));
    assert.ok(matched.includes(c.doc.getElementById('title')));
    for(const id of ['outside','native','native-button','other'])assert.ok(!matched.includes(c.doc.getElementById(id)),id+' must remain native');
    assert.equal(c.doc.getElementById('native-button').disabled,true);
    cleanup();cleanup();
    assert.equal(c.doc.querySelector('[data-ja-custom-style]'),null);
    assert.equal(c.doc.querySelector('[data-ja-css-scope]'),null);
    c.dispose();
});
test('CSS preserves media queries, complex selector lists, pseudo-elements and isolated animation names',()=>{
    const c=setup();
    const result=c.css.compile('@keyframes glow { from { opacity:0.8 } to { opacity:1 } } @media (max-width:640px) { .ja-face :is(h2,p), [data-label="a,b"]::after { content:"a,{b}"; animation:glow 2s ease infinite; } }','one');
    assert.equal(result.error,'');
    assert.match(result.css,/@media/);assert.match(result.css,/@keyframes ja-css-one-glow/);
    assert.match(result.css,/animation:ja-css-one-glow/);
    assert.match(result.css,/\)::after/);
    assert.match(result.css,/:is\(h2,p\)/);
    const second=c.css.compile('@keyframes glow { to { opacity:1 } } .ja-face { animation-name:glow }','two');
    assert.match(second.css,/animation-name:ja-css-two-glow/);
    c.dispose();
});
test('incomplete CSS, global rules and oversized input fail without changing the native modal',()=>{
    const c=setup(),root=c.doc.getElementById('modal');
    for(const input of ['.ja-face { color:red', '.ja-face { content:"oops; }','@font-face { font-family:Other; src:url(https://example.com/a.woff) }','@import "https://example.com/a.css";', 'x'.repeat(20001)]) {
        const result=c.css.compile(input);
        assert.ok(result.error,input.slice(0,50));assert.equal(result.css,'');
        c.css.apply(root,root.querySelector('.ja-face'),[],input)();
        assert.equal(root.hasAttribute('data-ja-css-scope'),false);
        assert.equal(c.doc.querySelector('[data-ja-custom-style]'),null);
    }
    assert.equal(c.css.compile('/* vazio */').error,'');
    c.dispose();
});
test('reordering moves the existing blocks without flattening groups or losing styles and bindings',()=>{
    const c=setup(),order=c.w.JoinAdsRewardStudioOrder;
    const a={clientId:'title',name:'core/heading',attributes:{content:'{{person}}',style:{color:{text:'#123456'}}}},b={clientId:'watch',name:'joinads/reward-action',attributes:{action:'watch',label:'Assistir'}},d={clientId:'text',name:'core/paragraph',attributes:{content:'{{type}}'}};
    const group={clientId:'group',name:'core/group',attributes:{className:'keep-grid'},innerBlocks:[a,b,d]},blocks=[group];
    const move=order.destination(blocks,'watch','title',false);
    const [existing]=group.innerBlocks.splice(group.innerBlocks.findIndex(block=>block.clientId===move.clientIds[0]),1);
    group.innerBlocks.splice(move.index,0,existing);
    assert.equal(move.fromRootClientId,'group');assert.equal(move.toRootClientId,'group');
    assert.deepEqual(group.innerBlocks,[b,a,d]);assert.equal(group.innerBlocks[0],b);
    assert.equal(group.attributes.className,'keep-grid');assert.equal(a.attributes.content,'{{person}}');assert.equal(b.attributes.action,'watch');
    assert.equal(order.destination(blocks,'watch','text',true).index,2);
    assert.equal(order.destination(blocks,'group','watch',false),null);
    assert.equal(order.destination(blocks,'watch','watch',true),null);
    c.dispose();
});
test('row grouping keeps the selected left/right elements, existing IDs, unrelated blocks and visual settings',()=>{
    const c=setup(),layout=c.w.JoinAdsRewardStudioLayout;
    const left={clientId:'exclusive',name:'core/paragraph',attributes:{content:'CONTEÚDO EXCLUSIVO',style:{color:{text:'#123456'}}}},right={clientId:'audience',name:'joinads/reward-audience',attributes:{label:'{count} agora',initial:328}},watch={clientId:'watch',name:'joinads/reward-action',attributes:{action:'watch'}};
    const group={clientId:'group',name:'core/group',attributes:{className:'keep-me'},innerBlocks:[left,watch]},blocks=[group,right];
    const plan=layout.groupPlan(blocks,'exclusive','audience');
    assert.equal(plan.rootClientId,'group');assert.equal(plan.partnerRootClientId,'');
    assert.equal(plan.innerBlocks[0],left);assert.equal(plan.innerBlocks[1],right);
    assert.equal(plan.attributes.layout.justifyContent,'space-between');assert.equal(group.innerBlocks[1],watch);
    assert.equal(left.attributes.style.color.text,'#123456');assert.equal(right.attributes.initial,328);
    const initial={...plan.attributes,className:plan.attributes.className+' user-style',style:{spacing:{blockGap:'var:preset|spacing|20',padding:{top:'8px'}},color:{background:'#fff'}}};
    const stacked=layout.update(initial,{mobile:'stack',sizing:'equal',justify:'right'});
    assert.ok(stacked.className.includes('user-style'));assert.ok(stacked.className.includes('ja-row-mobile-stack'));assert.ok(stacked.className.includes('ja-row-equal'));
    assert.equal(stacked.style.spacing.blockGap,'var:preset|spacing|20');
    const spaced=layout.update(stacked,{gap:0});assert.equal(spaced.style.spacing.blockGap,'0px');assert.equal(spaced.style.spacing.padding.top,'8px');assert.equal(spaced.style.color.background,'#fff');
    assert.equal(layout.groupPlan(blocks,'group','exclusive'),null);
    assert.equal(layout.groupPlan(blocks,'exclusive','exclusive'),null);
    c.dispose();
});
