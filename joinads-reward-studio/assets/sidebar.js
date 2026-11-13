(function (wp) {
    'use strict';
    const el = wp.element.createElement;
    const { useEffect, useRef, useState } = wp.element;
    const { RangeControl, SelectControl, TextControl, Button, Modal } = wp.components;
    const { MediaUpload, MediaUploadCheck, RichText } = wp.blockEditor;
    const sidebar = wp.editor && wp.editor.PluginSidebar ? wp.editor : wp.editPost;
    const config = window.JoinAdsRewardStudio;
    const design = window.JoinAdsRewardDesign;
    const metaKey = '_ja_appearance';
    const mobileKeys = { widthMode:'mobileWidthMode', width:'mobileWidth', heightMode:'mobileHeightMode', height:'mobileHeight', inset:'mobileInset', padding:'mobilePadding', radius:'mobileRadius', position:'mobilePosition', fontSize:'mobileFontSize', headingSize:'mobileHeadingSize' };
    const blockNames = { 'core/heading':'Título', 'core/paragraph':'Texto', 'core/image':'Imagem', 'joinads/reward-action':'Botão', 'joinads/reward-countdown':'Contagem regressiva', 'joinads/reward-badge':'Aviso e destaque', 'joinads/reward-audience':'Audiência simulada' };
    const order = window.JoinAdsRewardStudioOrder;
    const layout = window.JoinAdsRewardStudioLayout;
    function plain(html) { const template=document.createElement('template'); template.innerHTML=html || ''; return template.content.textContent; }
    function formatIcon(id) { return el('span', { className:'ja-format-icon is-' + id, 'aria-hidden':true }, el('span', {className:'ja-format-window'}, el('i'),el('i'),el('b'))); }
    function section(title, help, children) { return el('section', {className:'ja-studio-section'}, el('h3',null,title),help ? el('p',{className:'ja-help'},help) : null,children); }
    function disclosure(title, children) { return el('details',{className:'ja-studio-disclosure'},el('summary',null,title),el('div',null,children)); }

    function Preview({ content, settings, customCSS, person, campaign, model, mobile, revision, onSelect }) {
        const frame=useRef(null), container=useRef(null);
        const [frameName]=useState(()=>'ja-preview-'+Math.random().toString(36).slice(2));
        const [available,setAvailable]=useState({width:800,height:650});
        const [zoom,setZoom]=useState(false);
        const [status,setStatus]=useState('loading');
        const width=mobile ? 390 : 1200, height=mobile ? 844 : 800;
        const scale=zoom?1:Math.min(1,Math.max(.15,(available.width-48)/width),Math.max(.15,(available.height-110)/height));
        useEffect(()=>{
            const observer=new ResizeObserver(entries=>setAvailable({width:entries[0].contentRect.width,height:entries[0].contentRect.height}));
            if(container.current)observer.observe(container.current);
            return ()=>observer.disconnect();
        },[]);
        useEffect(()=>{
            const timeout=setTimeout(()=>{
                if(!frame.current)return;
                setStatus('loading');
                const doc=frame.current.ownerDocument, form=doc.createElement('form');
                form.method='post';form.action=config.previewUrl;form.target=frameName;form.hidden=true;
                const values={action:'ja_reward_preview',face:config.postId,_wpnonce:config.nonce,content,appearance:JSON.stringify(settings),custom_css:customCSS,embedded:'1',person,type:campaign,model,editor_preview:'1'};
                for(const [name,value] of Object.entries(values)){const input=doc.createElement('input');input.type='hidden';input.name=name;input.value=String(value);form.appendChild(input);}
                doc.body.appendChild(form);form.submit();form.remove();
            },280);
            return ()=>clearTimeout(timeout);
        },[content,JSON.stringify(settings),customCSS,person,campaign,model,revision,frameName]);
        useEffect(()=>{
            function receive(event){
                if(event.origin===location.origin && frame.current && event.source===frame.current.contentWindow && event.data && event.data.type==='ja-reward-preview-select')onSelect(event.data.index);
            }
            window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);
        },[onSelect]);
        return el('div',{className:'ja-preview-area',ref:container},
            el('div',{className:'ja-preview-caption'},el('span',null,mobile?'Celular · 390 × 844':'Desktop · 1200 × 800'),el('span',{role:'status',className:'ja-preview-state'},status==='loading'?'Atualizando…':status==='error'?'Confira o conteúdo':'Prévia atualizada'),el('button',{type:'button',className:'ja-preview-zoom',onClick:()=>setZoom(!zoom)},zoom?'Ajustar à área':'Ver em 100%')),
            el('div',{className:'ja-preview-stage'},el('div',{className:'ja-preview-device '+(mobile?'is-mobile':''),style:{width:width*scale,height:height*scale}},
                el('iframe',{ref:frame,name:frameName,title:'Prévia interativa do reward',onLoad:()=>{
                    try { setStatus(frame.current.contentDocument.querySelector('.ja-face')?'ready':'error'); } catch(_){setStatus('error');}
                },style:{width,height,transform:'scale('+scale+')',transformOrigin:'top left'}}))),
            el('p',{className:'ja-preview-footnote'},'Clique em um texto, imagem ou botão na prévia para editar. Nenhum anúncio é solicitado.'));
    }

    function Studio() {
        const state=wp.data.useSelect(select=>{
            const editor=select('core/editor'),blockEditor=select('core/block-editor'),blocks=blockEditor.getBlocks();
            const postType=editor.getCurrentPostType();
            // Permissions can settle after the blocks load. Subscribe to them so the
            // layout controls do not keep an early disabled state until another click.
            const permissions=postType==='ja_reward_face'?JSON.stringify(order.flatten(blocks).map(block=>[blockEditor.canMoveBlock(block.clientId),blockEditor.canRemoveBlock(block.clientId),blockEditor.canEditBlock(block.clientId),blockEditor.canInsertBlockType('core/group',block.rootClientId)])):'';
            return {postType,meta:editor.getEditedPostAttribute('meta') || {},content:editor.getEditedPostContent(),blocks,permissions};
        },[]);
        const { editPost }=wp.data.useDispatch('core/editor');
        const blockActions=wp.data.useDispatch('core/block-editor');
        const [open,setOpen]=useState(false),[tab,setTab]=useState('format'),[mobile,setMobile]=useState(false);
        const [person,setPerson]=useState('Maria'),[campaign,setCampaign]=useState('sua campanha');
        const [model,setModel]=useState('');
        const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[reset,setReset]=useState(false);
        const [revision,setRevision]=useState(0),[undoCount,setUndoCount]=useState(0);
        const [cssOpen,setCSSOpen]=useState(false),[clearCSS,setClearCSS]=useState(false);
        const [dragging,setDragging]=useState(''),[dropTarget,setDropTarget]=useState(null),[moveStatus,setMoveStatus]=useState('');
        const [partnerId,setPartnerId]=useState('');
        const history=useRef([]),dragSource=useRef('');
        if(state.postType!=='ja_reward_face')return null;
        const settings=design.sanitize(state.meta[metaKey]);
        const customCSS=state.meta._ja_custom_css || '';
        const current=design.currentFormat(settings);
        const blocks=order.flatten(state.blocks);
        const editable=blocks.filter(block=>blockNames[block.name]);
        const active=editable.find(block=>block.clientId===selected) || editable[0];
        const hasWatch=blocks.some(block=>block.name==='joinads/reward-action' && block.attributes.action!=='close');
        function remember(){history.current=[...history.current.slice(-29),{settings,customCSS}];setUndoCount(history.current.length);}
        function update(values){
            remember();
            editPost({meta:{...state.meta,[metaKey]:design.sanitize({...settings,...values})}});
        }
        function updateCSS(value){remember();editPost({meta:{...state.meta,_ja_custom_css:value}});}
        function undo(){const last=history.current.pop();if(last)editPost({meta:{...state.meta,[metaKey]:last.settings,_ja_custom_css:last.customCSS}});setUndoCount(history.current.length);}
        function movement(sourceId,targetId,after){
            const destination=order.destination(state.blocks,sourceId,targetId,after);
            const store=wp.data.select('core/block-editor');
            if(!destination || !store.canMoveBlock(sourceId))return null;
            if(destination.fromRootClientId!==destination.toRootClientId && (!store.canRemoveBlock(sourceId) || !store.canInsertBlocks([sourceId],destination.toRootClientId)))return null;
            return destination;
        }
        function move(sourceId,targetId,after){
            const next=movement(sourceId,targetId,after);
            if(!next)return;
            blockActions.moveBlocksToPosition(next.clientIds,next.fromRootClientId,next.toRootClientId,next.index);
            setSelected(sourceId);setMoveStatus('Ordem atualizada. Confira a prévia.');
        }
        function endDrag(){dragSource.current='';setDragging('');setDropTarget(null);}
        function parentRow(block){return block && blocks.find(parent=>parent.clientId===block.rootClientId&&layout.isRow(parent));}
        function canGroup(sourceId,targetId){
            const plan=layout.groupPlan(state.blocks,sourceId,targetId),store=wp.data.select('core/block-editor');
            return plan&&plan.clientIds.every(id=>store.canMoveBlock(id)&&store.canRemoveBlock(id))&&store.canInsertBlockType('core/group',plan.rootClientId)&&(plan.rootClientId===plan.partnerRootClientId||store.canInsertBlocks([targetId],plan.rootClientId))?plan:null;
        }
        function organize(){
            if(!active)return null;
            const row=parentRow(active),store=wp.data.select('core/block-editor');
            if(!row){
                const candidates=editable.filter(block=>block.clientId!==active.clientId&&canGroup(active.clientId,block.clientId));
                const partner=candidates.find(block=>block.clientId===partnerId)||candidates[0];
                return section('Colocar lado a lado','O elemento selecionado fica à esquerda. Escolha o que deve aparecer à direita.',
                    el('div',{className:'ja-line-creator'},el('div',{className:'ja-line-diagram','aria-hidden':true},el('span',null,'← Esquerda'),el('span',null,'Direita →')),
                        el('p',{className:'ja-help'},'À esquerda: '+blockNames[active.name]),
                        candidates.length?el(SelectControl,{label:'Elemento à direita',value:partner.clientId,options:candidates.map(block=>({value:block.clientId,label:blockNames[block.name]+' · '+plain(block.attributes.content||block.attributes.label||block.attributes.alt||'Imagem').slice(0,48)})),onChange:setPartnerId}):el('p',{className:'ja-help'},'Adicione outro elemento para criar uma linha. Blocos bloqueados não podem ser agrupados.'),
                        el(Button,{variant:'secondary',disabled:!partner,onClick:()=>{
                            const plan=partner&&canGroup(active.clientId,partner.clientId);if(!plan)return;
                            // Match Gutenberg's grouping transform: replacement children
                            // need fresh editor IDs while keeping their authored attributes.
                            const left=wp.blocks.cloneBlock(plan.innerBlocks[0]);
                            const group=wp.blocks.createBlock('core/group',plan.attributes,[left,wp.blocks.cloneBlock(plan.innerBlocks[1])]);
                            if(plan.rootClientId===plan.partnerRootClientId){
                                blockActions.replaceBlocks(plan.clientIds,group);
                            }else{
                                // Core Group accepts these children. Its insertion context
                                // only exists after mounting, so insert the complete tree
                                // as Gutenberg does instead of moving into an unmounted row.
                                blockActions.removeBlocks([partner.clientId],false);
                                blockActions.replaceBlocks([active.clientId],group);
                            }
                            setSelected(left.clientId);setPartnerId('');setMoveStatus('Linha criada: um elemento à esquerda e outro à direita.');
                        }},'Colocar lado a lado')));
            }
            const values=layout.read(row.attributes),canEdit=store.canEditBlock(row.clientId);
            const patch=changes=>{if(canEdit)patchBlock(row,layout.update(row.attributes,changes));};
            const canSeparate=store.canRemoveBlock(row.clientId)&&row.innerBlocks.every(block=>store.canMoveBlock(block.clientId)&&store.canInsertBlockType(block.name,row.rootClientId));
            return section('Layout da linha','As opções abaixo valem para todos os elementos desta linha.',el('div',{className:'ja-line-controls'},
                el('div',{className:'ja-line-diagram','aria-hidden':true},el('span',null,'← Esquerda'),el('span',null,'Direita →')),
                el(SelectControl,{label:'Distribuição horizontal',value:values.justify,disabled:!canEdit,options:[{label:'Pontas opostas (esquerda e direita)',value:'space-between'},{label:'Juntos à esquerda',value:'left'},{label:'Juntos no centro',value:'center'},{label:'Juntos à direita',value:'right'}],onChange:justify=>patch({justify})}),
                el(SelectControl,{label:'Largura dos elementos',value:values.sizing,disabled:!canEdit,options:[{label:'Conforme o conteúdo',value:'auto'},{label:'Colunas iguais',value:'equal'}],onChange:sizing=>patch({sizing})}),
                el(SelectControl,{label:'Alinhamento vertical',value:values.align,disabled:!canEdit,options:[{label:'Topo',value:'top'},{label:'Centro',value:'center'},{label:'Base',value:'bottom'},{label:'Mesma altura',value:'stretch'}],onChange:align=>patch({align})}),
                el(RangeControl,{label:'Espaço entre elementos (px)',value:values.gap,min:0,max:64,disabled:!canEdit,onChange:gap=>patch({gap:gap??12})}),
                el(SelectControl,{label:'No celular',value:values.mobile,disabled:!canEdit,options:[{label:'Quebrar a linha se precisar',value:'wrap'},{label:'Empilhar um abaixo do outro',value:'stack'},{label:'Manter lado a lado',value:'nowrap'}],onChange:mobile=>patch({mobile})}),
                el('div',{className:'ja-line-actions'},el(Button,{variant:'secondary',disabled:!row.innerBlocks.every(block=>store.canMoveBlock(block.clientId)),onClick:()=>blockActions.replaceInnerBlocks(row.clientId,[...row.innerBlocks].reverse(),false)},'Inverter ordem'),
                    el(Button,{variant:'tertiary',disabled:!canSeparate,onClick:()=>{if(canSeparate){const children=row.innerBlocks.map(block=>wp.blocks.cloneBlock(block));blockActions.replaceBlocks([row.clientId],children);setSelected(children[0]?.clientId||'');setMoveStatus('Elementos separados. Conteúdo e estilos mantidos.');}}},'Separar elementos'))));
        }
        function contentList(){return el('div',{className:'ja-content-list',role:'list','aria-label':'Ordem dos elementos'},editable.map((block,index)=>{
            const previous=editable[index-1],next=editable[index+1],canMove=wp.data.select('core/block-editor').canMoveBlock(block.clientId);
            const drop=dropTarget&&dropTarget.id===block.clientId?dropTarget:null;
            const label=blockNames[block.name]+' '+(index+1),row=parentRow(block);
            return el('div',{key:block.clientId,role:'listitem','data-ja-content-id':block.clientId,draggable:canMove,
                className:'ja-content-row '+(active&&active.clientId===block.clientId?'is-selected ':'')+(dragging===block.clientId?'is-dragging ':'')+(drop?'is-drop-'+(drop.after?'after':'before'):''),
                onDragStart:event=>{if(!canMove){event.preventDefault();return;}dragSource.current=block.clientId;setDragging(block.clientId);setMoveStatus('');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',block.clientId);},
                onDragEnd:endDrag,onDragOver:event=>{
                    const rect=event.currentTarget.getBoundingClientRect(),after=event.clientY>rect.top+rect.height/2;
                    if(!movement(dragSource.current,block.clientId,after)){setDropTarget(null);return;}
                    event.preventDefault();event.dataTransfer.dropEffect='move';setDropTarget({id:block.clientId,after});
                },onDrop:event=>{event.preventDefault();const rect=event.currentTarget.getBoundingClientRect();move(dragSource.current,block.clientId,event.clientY>rect.top+rect.height/2);endDrag();}},
                el('span',{className:'ja-content-grip','aria-hidden':true},'⠿'),
                el('button',{type:'button',className:'ja-content-select','aria-pressed':!!active&&active.clientId===block.clientId,onClick:()=>setSelected(block.clientId),onKeyDown:event=>{
                    if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const target=event.key==='ArrowUp'?previous:next;if(target)move(block.clientId,target.clientId,event.key==='ArrowDown');}
                }},el('span',{className:'ja-content-index'},String(index+1).padStart(2,'0')),el('span',{className:'ja-content-summary'},el('strong',null,blockNames[block.name]),el('small',null,plain(block.attributes.content || block.attributes.label || block.attributes.alt || 'Escolher imagem').slice(0,64)),row?el('span',{className:'ja-line-chip'},'↔ Linha '+(blocks.filter(layout.isRow).findIndex(item=>item.clientId===row.clientId)+1)):null)),
                el('div',{className:'ja-content-movers'},el('button',{type:'button','aria-label':'Subir '+label,title:'Subir (Alt + ↑)',disabled:!previous||!movement(block.clientId,previous.clientId,false),onClick:()=>move(block.clientId,previous.clientId,false)},'↑'),el('button',{type:'button','aria-label':'Descer '+label,title:'Descer (Alt + ↓)',disabled:!next||!movement(block.clientId,next.clientId,true),onClick:()=>move(block.clientId,next.clientId,true)},'↓')));
        }));}
        function cssEditor(){
            const result=window.JoinAdsRewardCustomCSS.compile(customCSS);
            const examples=[['Título','.ja-face h2 {\n  color: #7c3aed;\n  font-size: 36px;\n}'],['Botão','.ja-face-button {\n  border-radius: 999px;\n  background: linear-gradient(120deg, #2563eb, #7c3aed);\n  color: #ffffff;\n}'],['Janela','.ja-designed-modal {\n  border-radius: 24px !important;\n  background: #f8fafc !important;\n}'],['Celular','@media (max-width: 640px) {\n  .ja-face { padding: 20px; }\n  .ja-face h2 { font-size: 26px; }\n}']];
            return el(wp.element.Fragment,null,el(Button,{variant:'tertiary',onClick:()=>setCSSOpen(false)},'← Voltar para Mais'),
                section('CSS personalizado','Ajuste o visual desta face. A prévia atualiza enquanto você escreve.',
                    el(wp.element.Fragment,null,el('label',{className:'ja-control-label',htmlFor:'ja-custom-css'},'Código CSS'),
                        el('textarea',{id:'ja-custom-css',className:'ja-css-editor',value:customCSS,maxLength:20000,spellCheck:false,autoCapitalize:'off',autoCorrect:'off',wrap:'off','aria-describedby':'ja-css-feedback',placeholder:'.ja-face h2 {\n  color: #7c3aed;\n}',onChange:event=>updateCSS(event.target.value),onKeyDown:event=>{
                            if(event.key==='Tab'&&!event.shiftKey){event.preventDefault();const node=event.currentTarget,start=node.selectionStart,end=node.selectionEnd;updateCSS(customCSS.slice(0,start)+'  '+customCSS.slice(end));requestAnimationFrame(()=>{node.selectionStart=node.selectionEnd=start+2;});}
                        }}),el('div',{className:'ja-css-meta'},el('span',null,customCSS.length.toLocaleString('pt-BR')+' / 20.000'),el('span',null,'CSS por face')),
                        el('p',{id:'ja-css-feedback',role:'status',className:'ja-css-feedback '+(result.error?'is-error':'')},result.error?result.error+' O CSS não será aplicado.':customCSS.trim()?'CSS pronto para a prévia. Salve no WordPress para publicar.':'Sem CSS adicional. Os controles de aparência continuam ativos.'))),
                section('Exemplos para começar','Clique para adicionar ao final do seu código.',el('div',{className:'ja-css-examples'},examples.map(([label,code])=>el(Button,{key:label,variant:'secondary',disabled:customCSS.length+code.length+2>20000,onClick:()=>updateCSS((customCSS.trimEnd()?customCSS.trimEnd()+'\n\n':'')+code)},'+ '+label)))),
                disclosure('Seletores e recursos',el('div',{className:'ja-css-reference'},el('p',null,el('code',null,'.ja-face'),' Conteúdo da face.'),el('p',null,el('code',null,'.ja-face h2'),' Títulos.'),el('p',null,el('code',null,'.ja-face-button'),' Botões.'),el('p',null,el('code',null,'.ja-countdown'),' Contagem regressiva.'),el('p',null,el('code',null,'.ja-designed-modal'),' Janela do reward.'),el('p',null,el('code',null,'.ja-designed-overlay'),' Fundo atrás da janela.'),el('p',{className:'ja-help'},'Aceita @media, @supports e @keyframes. Use !important para substituir propriedades fixas da janela. Escreva os seletores completos, sem aninhamento. O CSS fica limitado à face e é removido antes da entrega do anúncio.'))),
                el(Button,{variant:'tertiary',isDestructive:true,disabled:!customCSS,onClick:()=>setClearCSS(true)},'Limpar CSS'),clearCSS?el('div',{className:'ja-reset-confirm'},el('p',null,'Remover todo o CSS desta face?'),el(Button,{variant:'primary',onClick:()=>{updateCSS('');setClearCSS(false);}},'Sim, limpar CSS'),el(Button,{variant:'tertiary',onClick:()=>setClearCSS(false)},'Cancelar')):null);
        }
        function patchBlock(block,values){blockActions.updateBlockAttributes(block.clientId,values);}
        function selectPreview(index){if(Number.isInteger(index) && editable[index]){setSelected(editable[index].clientId);setTab('content');}}
        function addBlock(name){
            const attrs=name==='joinads/reward-countdown'?{mode:'duration',seconds:900,layout:'cards',urgentSeconds:60}:{};
            const block=wp.blocks.createBlock(name,attrs);
            blockActions.insertBlocks(block,state.blocks.length);
            setSelected(block.clientId);setTab('content');
        }
        function imagePicker(value,onSelect,onRemove){return el('div',{key:'image-picker',className:'ja-studio-image'},
            value?el('img',{src:value,alt:''}):el('div',{className:'ja-image-empty'},'Escolha uma imagem da biblioteca'),
            el(MediaUploadCheck,null,el(MediaUpload,{allowedTypes:['image'],onSelect,render:({open})=>el(Button,{variant:'secondary',onClick:open},value?'Trocar imagem':'Escolher imagem')})),
            value?el(Button,{variant:'tertiary',isDestructive:true,onClick:onRemove},'Remover'):null);}
        function field(key,device=false){
            const actual=device && mobile && mobileKeys[key]?mobileKeys[key]:key;
            const d=design.schema.fields[actual];if(!d)return null;
            if((actual==='width'&&settings.widthMode==='full') || (actual==='mobileWidth'&&settings.mobileWidthMode==='full'))return null;
            if((actual==='height'&&settings.heightMode!=='fixed') || (actual==='mobileHeight'&&settings.mobileHeightMode!=='fixed'))return null;
            if(['backgroundPosition','imageOpacity'].includes(actual)&&!settings.backgroundImage)return null;
            const props={key:actual,label:d.label,value:settings[actual],onChange:value=>update({[actual]:value})};
            if(d.type==='number')return el(RangeControl,{...props,min:d.min,max:d.max,step:d.step || 1,onChange:value=>update({[actual]:value===undefined?d.default:value})});
            if(d.options)return el(SelectControl,{...props,options:d.options});
            if(d.format==='color')return el('label',{key:actual,className:'ja-editor-color'},el('span',null,d.label),el('span',{className:'ja-color-input'},el('input',{type:'color',value:settings[actual],onChange:event=>update({[actual]:event.target.value})}),el('code',null,settings[actual])));
            if(d.format==='image')return el('div',{key:actual},imagePicker(settings[actual],media=>update({[actual]:media.url}),()=>update({[actual]:''})));
            return el(TextControl,{...props,maxLength:120});
        }
        const fields=(keys,device=false)=>keys.map(key=>field(key,device));
        function formats(compact=false){return el('div',{className:'ja-format-grid '+(compact?'is-compact':'')},design.schema.formats.map(format=>el('button',{type:'button',key:format.id,className:'ja-format-card '+(current===format.id?'is-selected':''),'aria-pressed':current===format.id,onClick:()=>update(design.applyFormat(settings,format.id))},
            formatIcon(format.id),el('span',{className:'ja-format-title'},format.label),!compact?el('span',{className:'ja-format-description'},format.description):null,current===format.id?el('span',{className:'ja-format-check','aria-hidden':true},'✓'):null)));}
        function contentEditor(){
            if(!active)return el('p',{className:'ja-help'},'Adicione um elemento para começar.');
            const a=active.attributes,patch=values=>patchBlock(active,values);
            const controls=[];
            if(['core/heading','core/paragraph'].includes(active.name)){
                controls.push(el('label',{key:'label',className:'ja-control-label'},blockNames[active.name]));
                controls.push(el(RichText,{key:'content',tagName:'div',className:'ja-studio-richtext','aria-label':'Editar '+blockNames[active.name].toLowerCase(),value:a.content,allowedFormats:['core/bold','core/italic','core/link'],onChange:content=>patch({content})}));
                controls.push(el('p',{key:'tip',className:'ja-help'},'Use {{person}} para o nome, {{type}} para a campanha e {{model}} para um conteúdo opcional da URL.'));
            }
            if(active.name==='core/image')controls.push(imagePicker(a.url,media=>patch({id:media.id,url:media.url,alt:media.alt || ''}),()=>patch({id:undefined,url:undefined,alt:''})),el(TextControl,{key:'alt',label:'Descrição da imagem',value:a.alt || '',onChange:alt=>patch({alt})}));
            if(active.name==='joinads/reward-action')controls.push(
                el(TextControl,{key:'label',label:'Texto do botão',value:a.label,onChange:label=>patch({label})}),
                el(SelectControl,{key:'action',label:'Ação',value:a.action,options:[{label:'Assistir anúncio',value:'watch'},{label:'Fechar, se permitido',value:'close'}],onChange:action=>patch({action})}),
                el(SelectControl,{key:'variant',label:'Estilo',value:a.variant,options:[{label:'Automático',value:'auto'},{label:'Principal',value:'primary'},{label:'Contorno',value:'secondary'},{label:'Somente texto',value:'text'}],onChange:variant=>patch({variant})}),
                el(SelectControl,{key:'icon',label:'Ícone',value:a.icon,options:[{label:'Nenhum',value:'none'},{label:'Play',value:'play'},{label:'Seta',value:'arrow'},{label:'Presente',value:'gift'},{label:'Cadeado',value:'lock'}],onChange:icon=>patch({icon})}));
            if(active.name==='joinads/reward-badge')controls.push(el(TextControl,{key:'label',label:'Texto do aviso',value:a.label,onChange:label=>patch({label})}),el(SelectControl,{key:'icon',label:'Ícone',value:a.icon,options:[{label:'Presente',value:'gift'},{label:'Relógio',value:'clock'},{label:'Confirmado',value:'check'},{label:'Fogo',value:'fire'},{label:'Nenhum',value:'none'}],onChange:icon=>patch({icon})}));
            if(active.name==='joinads/reward-countdown'){
                let local='';if(a.deadline&&Number.isFinite(Date.parse(a.deadline))){const d=new Date(a.deadline);local=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
                controls.push(el(TextControl,{key:'label',label:'Texto acima do contador',value:a.label,onChange:label=>patch({label})}),
                    el(SelectControl,{key:'mode',label:'Quando começa o prazo?',value:a.mode,options:[{label:'Prazo por visitante',value:'duration'},{label:'Data final da campanha',value:'deadline'}],onChange:mode=>patch({mode})}),
                    a.mode==='duration'?el(RangeControl,{key:'seconds',label:'Duração em minutos',value:a.seconds/60,min:1,max:1440,onChange:value=>patch({seconds:Math.round((value || 1)*60)})}):el(TextControl,{key:'date',label:'Data e hora no seu fuso',type:'datetime-local',value:local,onChange:value=>patch({deadline:value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():''})}),
                    el(SelectControl,{key:'expiry',label:'Quando o prazo terminar',value:a.expiry,options:[{label:'Mostrar mensagem',value:'message'},{label:'Ocultar o contador',value:'hide'}],onChange:expiry=>patch({expiry})}),
                    a.expiry!=='hide'?el(TextControl,{key:'expiredLabel',label:'Mensagem final',value:a.expiredLabel,onChange:expiredLabel=>patch({expiredLabel})}):null);
            }
            if(window.JoinAdsRewardTriggerControls)controls.push(el('div',{key:'trigger-settings'},window.JoinAdsRewardTriggerControls.controls(active.name,a,patch)));
            return el('div',{className:'ja-content-editor'},el('h3',null,'Editar '+blockNames[active.name].toLowerCase()),controls,
                el(Button,{variant:'tertiary',onClick:()=>{blockActions.selectBlock(active.clientId);setOpen(false);}},'Abrir este bloco no conteúdo'));
        }
        function body(){
            if(tab==='format')return el(wp.element.Fragment,null,
                section('Como o reward deve aparecer?','Escolha um formato. Ele é aplicado no desktop e no celular, preservando suas cores e seu conteúdo.',formats()),
                el('div',{className:'ja-device-hint'},mobile?'Ajustes abaixo: celular':'Ajustes abaixo: desktop'),
                section('Ajuste o tamanho',null,fields(['widthMode','width','heightMode','height'],true)),
                section('Conteúdo na janela',null,fields(['contentAlign','contentWidth'])),
                disclosure('Espaçamento e cantos',fields(['padding','radius'],true)),
                disclosure('Posição e distância das bordas',fields(['position','inset'],true)));
            if(tab==='style')return el(wp.element.Fragment,null,
                section('Uma combinação para começar','Muda só as cores. O formato e o conteúdo são mantidos.',el('div',{className:'ja-palette-grid'},design.schema.palettes.map(palette=>el('button',{key:palette.id,type:'button',className:'ja-palette-card',onClick:()=>update(design.applyPalette(settings,palette.id))},el('span',{className:'ja-palette-colors','aria-hidden':true},palette.colors.map(color=>el('i',{key:color,style:{background:color}}))),el('span',null,palette.label))))),
                section('Cores da janela',null,fields(['background','textColor','headingColor','buttonBackground','buttonText'])),
                disclosure('Imagem no fundo da janela',fields(['backgroundImage','backgroundPosition','imageOpacity'])),
                disclosure('Fonte e tamanho dos textos',fields(['font','fontSize','headingSize','textAlign'],true)),
                disclosure('Fundo atrás da janela',fields(['overlayColor','overlayOpacity','overlayBlur'])),
                disclosure('Botões e efeitos',fields(['buttonRadius','buttonWidth','buttonFontSize','buttonHover','buttonEffect'])));
            if(tab==='content')return el(wp.element.Fragment,null,
                section('Conteúdo da sua face','Arraste os elementos para mudar a ordem ou use as setas. Clique para editar.',el(wp.element.Fragment,null,contentList(),el('p',{role:'status',className:'ja-order-status'},moveStatus))),
                organize(),
                contentEditor(),
                section('Adicionar elemento',null,el('div',{className:'ja-add-grid'},Object.entries(blockNames).map(([name,label])=>el(Button,{key:name,variant:'secondary',onClick:()=>addBlock(name)},'+ '+label)))),
                el('p',{className:'ja-help'},'Use Alt + ↑ ou Alt + ↓ no item selecionado para reordenar pelo teclado. Crie linhas aqui e use o editor de blocos para estruturas mais complexas.'));
            if(cssOpen)return cssEditor();
            const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            return el(wp.element.Fragment,null,
                section('Personalização com código','CSS exclusivo desta face, com prévia ao vivo.',el(Button,{variant:'secondary',className:'ja-open-css',onClick:()=>setCSSOpen(true)},'Avançado')),
                section('Ajustes avançados','Todos os controles continuam disponíveis aqui.',el(TextControl,{label:'Encontrar um ajuste',placeholder:'Ex.: fonte, borda, altura…',value:query,onChange:setQuery})),
                query?el('div',null,Object.entries(design.schema.fields).filter(([,d])=>normalize(d.label).includes(normalize(query))).map(([key])=>field(key))):Object.entries(design.schema.groups).map(([group,label])=>el('details',{key:group,className:'ja-studio-disclosure'},el('summary',null,label),el('div',null,Object.entries(design.schema.fields).filter(([,d])=>d.group===group).map(([key])=>field(key))))),
                disclosure('Restaurar a aparência',el('div',null,el('p',{className:'ja-help'},'Seus textos, imagens e blocos serão mantidos.'),el(Button,{variant:'secondary',isDestructive:true,onClick:()=>setReset(true)},'Restaurar aparência padrão'),reset?el('div',{className:'ja-reset-confirm'},el('p',null,'Restaurar os ajustes de aparência?'),el(Button,{variant:'primary',onClick:()=>{update(design.defaults);setReset(false);}},'Sim, restaurar'),el(Button,{variant:'tertiary',onClick:()=>setReset(false)},'Cancelar')):null)));
        }
        return el(wp.element.Fragment,null,
            sidebar.PluginPostStatusInfo?el(sidebar.PluginPostStatusInfo,{className:'ja-studio-entry'},el('p',{className:'ja-help'},'Formato, estilo e conteúdo em uma única tela.'),el(Button,{variant:'primary',className:'ja-open-studio',onClick:()=>setOpen(true)},'Abrir estúdio visual')):null,
            el(sidebar.PluginSidebarMoreMenuItem,{target:'ja-reward-design'},'Personalizar reward'),
            el(sidebar.PluginSidebar,{name:'ja-reward-design',title:'Personalizar reward',icon:'art'},
                el('div',{className:'ja-studio-launcher'},el('span',{className:'ja-studio-eyebrow'},'REWARDS STUDIO · CORE ( JOINADS )'),el('h2',null,'Sua face, do seu jeito.'),el('p',null,'Escolha o formato, ajuste o visual e edite o conteúdo vendo tudo na mesma tela.'),el(Button,{variant:'primary',className:'ja-open-studio',onClick:()=>setOpen(true)},'Abrir estúdio visual'),el('h3',null,'Formato em um clique'),formats(true),el('p',{className:'ja-help'},'Cores e conteúdo são preservados. Salve no WordPress depois de personalizar.'))),
            open?el(Modal,{title:'Personalizar reward',onRequestClose:()=>setOpen(false),className:'ja-studio-modal',shouldCloseOnClickOutside:false},
                el('div',{className:'ja-studio-toolbar'},
                    el('div',{className:'ja-studio-brand'},el('span',{className:'ja-brand-mark','aria-hidden':true},'J'),el('div',null,el('strong',null,'Sua face em tempo real'),el('small',null,'Escolha, personalize e confira o resultado.'))),
                    el('div',{className:'ja-device-switch','aria-label':'Dispositivo da prévia'},el('button',{type:'button','aria-pressed':!mobile,onClick:()=>setMobile(false)},'Desktop'),el('button',{type:'button','aria-pressed':mobile,onClick:()=>setMobile(true)},'Celular')),
                    el('div',{className:'ja-studio-actions'},el(Button,{variant:'tertiary',disabled:!undoCount,onClick:undo},'Desfazer ajuste'),el(Button,{variant:'primary',onClick:()=>setOpen(false)},'Concluído'))),
                !hasWatch?el('div',{className:'ja-studio-warning',role:'status'},'A face precisa de um botão para assistir ao anúncio. ',el(Button,{variant:'link',onClick:()=>addBlock('joinads/reward-action')},'Adicionar botão')):null,
                el('div',{className:'ja-studio-workspace'},
                    el('aside',{className:'ja-studio-controls','aria-label':'Controles do reward'},
                        el('div',{className:'ja-studio-tabs',role:'tablist','aria-label':'Personalização'},[['format','Formato'],['style','Estilo'],['content','Conteúdo'],['advanced','Mais']].map(([key,label],index,list)=>el('button',{type:'button',key,id:'ja-tab-'+key,role:'tab','aria-controls':'ja-studio-panel','aria-selected':tab===key,tabIndex:tab===key?0:-1,onClick:()=>setTab(key),onKeyDown:event=>{
                            if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?list.length-1:(index+(event.key==='ArrowRight'?1:-1)+list.length)%list.length;setTab(list[next][0]);event.currentTarget.parentElement.children[next].focus();
                        }},label))),
                        el('div',{className:'ja-studio-scroll',id:'ja-studio-panel',role:'tabpanel','aria-labelledby':'ja-tab-'+tab},body())),
                    el('main',{className:'ja-studio-canvas'},
                        el(Preview,{content:state.content,settings,customCSS,person,campaign,model,mobile,revision,onSelect:selectPreview}),
                        el('div',{className:'ja-preview-options'},
                            el('details',null,el('summary',null,'Testar nome, campanha e model'),el('div',null,el(TextControl,{label:'Nome do visitante',help:'Texto ou Base64. Ex.: Sm9zw6k= exibe José.',value:person,onChange:setPerson,maxLength:2048}),el(TextControl,{label:'Tipo / campanha',value:campaign,onChange:setCampaign,maxLength:160}),el(TextControl,{label:'Model (opcional)',help:'Use {{model}} no conteúdo para exibir este texto.',value:model,onChange:setModel,maxLength:1000}))),
                            el(Button,{variant:'tertiary',onClick:()=>setRevision(revision+1)},'Reabrir prévia')))),
                el('footer',{className:'ja-studio-footer'},el('span',null,'As alterações ficam no editor. Salve no WordPress para atualizar a face.'),el('span',null,'Anúncio e recompensa seguem no Core.'))):null);
    }
    wp.plugins.registerPlugin('ja-reward-studio',{render:Studio,icon:'art'});
})(window.wp);
