const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const fs=require('node:fs');
const id='01M77T539HEQGYVWTF1VACPT1E';
const code=fs.readFileSync('joinads-reward-studio/assets/frontend.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function setup({type='normal',ids=[id],extra='',config=true,runtime=true}={}){
 const dom=new JSDOM(`<body>${extra}<template data-ja-face data-face-id="71" data-reward-id="${id}"><h2>Olá, {{person}}</h2><button data-ja-action="watch"><span data-ja-label>Desbloquear Agora</span></button></template></body>`,{url:'https://publisher.test/?person=Ana',runScripts:'outside-only'});
 const w=dom.window;
 w.JoinAdsRewards=ids.map(rewardId=>({rewardId}));
 if(config)w.wrapper={config:{rewards:[{rewardId:id,type}]}};
 const originalPush=w.JoinAdsRewards.push;
 if(runtime)w.eval(code);
 function addRoot(kind=type,body=''){
   const host=w.document.createElement('div');
   let html;
   if(kind==='block_drawer'){host.id='ja-drawer';host.className='ja-drawer ja-open';html='<div class="ja-paper" id="ja-paper"><div class="reward-content">Original</div><div class="reward-dock"><button id="ja-confirm" disabled>Native</button></div></div>';}
   else{host.className='reward-modal-backdrop';host.setAttribute('data-ja-reward-blocker','1');if(kind==='block_modal')host.id='paywall';html=`<div class="reward-modal" role="dialog"><div class="reward-content">Original${body}</div><div class="reward-dock"><button ${kind==='normal'?'id="show_rewarded_ad"':''} class="reward-button" disabled>Native</button></div></div>`;}
   host.innerHTML=html;w.document.body.appendChild(host);
   const root=host.firstElementChild,button=root.querySelector('.reward-dock button');
   return{root,button,host};
 }
 return{w,addRoot,originalPush,dispose:()=>w.close()};
}
test('deployed tag without bridge mounts face and preserves readiness and native click',async()=>{
 const c=setup();const{root,button}=c.addRoot();let clicks=0;button.addEventListener('click',()=>clicks++);
 await tick();assert.equal(root.querySelector('.ja-face h2').textContent,'Olá, Ana');assert.equal(c.w.JoinAdsRewardStudioStatus.integration,'native-dom');
 const proxy=root.querySelector('[data-ja-action]');assert.equal(proxy.disabled,true);proxy.click();assert.equal(clicks,0);
 button.disabled=false;await tick();assert.equal(proxy.disabled,false);proxy.click();assert.equal(clicks,1);assert.equal(root.querySelector('.ja-face'),null);
 // Native delivery may append children while the original dock still exists. Do not re-skin it.
 root.querySelector('.reward-content').appendChild(c.w.document.createElement('section'));await tick();assert.equal(root.querySelector('.ja-face'),null);
 assert.equal(c.w.JoinAdsRewards.push,c.originalPush);c.dispose();
});
test('compatibility handles modal and drawer signatures while preserving native controls',async()=>{
 for(const type of ['block_modal','block_drawer']){
  const c=setup({type});const{root}=c.addRoot();await tick();assert.ok(root.querySelector('.ja-face'),type);c.dispose();
 }
});
test('ambiguous queue, unconfirmed config and mixed triggers stay native',async()=>{
 for(const options of [{ids:[id,'other']},{config:false},{extra:'<div joinadscode="AdRewarded"></div>'},{type:'quiz'}]){
  const c=setup(options);const{root}=c.addRoot('normal');await tick();assert.equal(root.querySelector('.ja-face'),null,JSON.stringify(options));c.dispose();
 }
});
test('multiple dialogs and lead forms stay native',async()=>{
 const c=setup();const a=c.addRoot(),b=c.addRoot();await tick();assert.equal(a.root.querySelector('.ja-face'),null);assert.equal(b.root.querySelector('.ja-face'),null);c.dispose();
 const form=setup();const native=form.addRoot('normal','<input type="email">');await tick();assert.equal(native.root.querySelector('.ja-face'),null);form.dispose();
});
test('bridge retains priority when native detection sees the same modal',async()=>{
 const c=setup();const{root,button}=c.addRoot();
 c.w.dispatchEvent(new c.w.CustomEvent('joinads:reward-face',{detail:{version:1,rewardId:id,root,button,close:null}}));
 await tick();assert.equal(root.querySelectorAll('.ja-face').length,1);assert.equal(c.w.JoinAdsRewardStudioStatus.integration,'bridge');c.dispose();
});
test('late plugin loading detects an existing native modal',async()=>{
 const c=setup({runtime:false});const{root}=c.addRoot();
 await tick();assert.equal(root.querySelector('.ja-face'),null);
 c.w.eval(code);await tick();assert.ok(root.querySelector('.ja-face'));c.dispose();
});
