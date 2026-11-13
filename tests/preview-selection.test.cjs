const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup(interactive){
 const dom=new JSDOM('<body><div class="reward-modal-backdrop"><div class="preview-card" role="dialog"><section><button id="native-watch">Native</button><button id="native-close">Close</button></section></div></div><output></output><template data-ja-face data-reward-id="preview"><h2 data-ja-edit-index="0">Olá, {{person}}</h2><p data-optional-model>{{model}}</p><div data-ja-edit-index="1"><button data-ja-action="watch"><span data-ja-label>Assistir</span></button></div></template></body>',{url:'https://publisher.test/wp-admin/admin-post.php',runScripts:'outside-only'});
 const w=dom.window,messages=[];
 w.JoinAdsRewardDesignSchema=JSON.parse(fs.readFileSync('joinads-reward-studio/config/appearance.json','utf8'));
 w.JoinAdsRewardPreview={interactive,person:'Ana',type:'viagem',model:'Conteúdo à escolha'};
 w.postMessage=(message,origin)=>messages.push({message,origin});
 for(const script of ['design','urgency','frontend','preview'])w.eval(fs.readFileSync('joinads-reward-studio/assets/'+script+'.js','utf8'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,messages,doc:w.document,dispose:()=>w.close()};
}
test('studio preview selects a block without clicking the native ad button',()=>{
 const c=setup(true);let clicks=0;c.doc.getElementById('native-watch').addEventListener('click',()=>clicks++);
 c.doc.querySelector('.ja-face [data-ja-action]').click();
 assert.equal(clicks,0);assert.ok(c.doc.querySelector('.ja-face'));
 assert.equal(c.messages[0].message.type,'ja-reward-preview-select');assert.equal(c.messages[0].message.index,1);assert.equal(c.messages[0].origin,'https://publisher.test');
 const heading=c.doc.querySelector('.ja-face h2');assert.equal(heading.textContent,'Olá, Ana');assert.equal(heading.tabIndex,0);assert.equal(heading.title,'Clique para editar');
 heading.dispatchEvent(new c.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(c.messages[1].message.index,0);c.dispose();
});
test('preview passes optional model through the same public personalization path',()=>{
 const c=setup(true);
 assert.equal(c.doc.querySelector('[data-optional-model]').textContent,'Conteúdo à escolha');
 assert.equal(new URL(c.w.location.href).searchParams.get('model'),'Conteúdo à escolha');c.dispose();
});
test('saved simulator preserves native CTA delegation outside the interactive studio',()=>{
 const c=setup(false);let clicks=0;c.doc.getElementById('native-watch').addEventListener('click',()=>clicks++);
 c.doc.querySelector('.ja-face [data-ja-action]').click();assert.equal(clicks,1);assert.equal(c.messages.length,0);assert.equal(c.doc.querySelector('.ja-face'),null);c.dispose();
});
