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
    function flatten(blocks) { return blocks.flatMap(block => [block, ...flatten(block.innerBlocks || [])]); }
    function plain(html) { const template=document.createElement('template'); template.innerHTML=html || ''; return template.content.textContent; }
    function formatIcon(id) { return el('span', { className:'ja-format-icon is-' + id, 'aria-hidden':true }, el('span', {className:'ja-format-window'}, el('i'),el('i'),el('b'))); }
    function section(title, help, children) { return el('section', {className:'ja-studio-section'}, el('h3',null,title),help ? el('p',{className:'ja-help'},help) : null,children); }
    function disclosure(title, children) { return el('details',{className:'ja-studio-disclosure'},el('summary',null,title),el('div',null,children)); }

    function Preview({ content, settings, person, campaign, mobile, revision, onSelect }) {
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
                const values={action:'ja_reward_preview',face:config.postId,_wpnonce:config.nonce,content,appearance:JSON.stringify(settings),embedded:'1',person,type:campaign,editor_preview:'1'};
                for(const [name,value] of Object.entries(values)){const input=doc.createElement('input');input.type='hidden';input.name=name;input.value=String(value);form.appendChild(input);}
                doc.body.appendChild(form);form.submit();form.remove();
            },280);
            return ()=>clearTimeout(timeout);
        },[content,JSON.stringify(settings),person,campaign,revision,frameName]);
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
            const editor=select('core/editor');
            return {postType:editor.getCurrentPostType(),meta:editor.getEditedPostAttribute('meta') || {},content:editor.getEditedPostContent(),blocks:select('core/block-editor').getBlocks()};
        },[]);
        const { editPost }=wp.data.useDispatch('core/editor');
        const blockActions=wp.data.useDispatch('core/block-editor');
        const [open,setOpen]=useState(false),[tab,setTab]=useState('format'),[mobile,setMobile]=useState(false);
        const [person,setPerson]=useState('Maria'),[campaign,setCampaign]=useState('sua campanha');
        const [selected,setSelected]=useState(''),[query,setQuery]=useState(''),[reset,setReset]=useState(false);
        const [revision,setRevision]=useState(0),[undoCount,setUndoCount]=useState(0);
        const history=useRef([]);
        if(state.postType!=='ja_reward_face')return null;
        const settings=design.sanitize(state.meta[metaKey]);
        const current=design.currentFormat(settings);
        const blocks=flatten(state.blocks);
        const editable=blocks.filter(block=>blockNames[block.name]);
        const active=editable.find(block=>block.clientId===selected) || editable[0];
        const hasWatch=blocks.some(block=>block.name==='joinads/reward-action' && block.attributes.action!=='close');
        function update(values){
            history.current=[...history.current.slice(-29),settings];setUndoCount(history.current.length);
            editPost({meta:{...state.meta,[metaKey]:design.sanitize({...settings,...values})}});
        }
        function undo(){const last=history.current.pop();if(last)editPost({meta:{...state.meta,[metaKey]:last}});setUndoCount(history.current.length);}
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
                controls.push(el('p',{key:'tip',className:'ja-help'},'Use {{person}} para o nome e {{type}} para a campanha.'));
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
                section('Conteúdo da sua face','Clique na lista ou em um elemento da prévia para editar.',el('div',{className:'ja-content-list'},editable.map((block,index)=>el('button',{type:'button',key:block.clientId,className:'ja-content-row '+(active&&active.clientId===block.clientId?'is-selected':''),onClick:()=>setSelected(block.clientId)},el('span',{className:'ja-content-index'},String(index+1).padStart(2,'0')),el('span',null,el('strong',null,blockNames[block.name]),el('small',null,plain(block.attributes.content || block.attributes.label || block.attributes.alt || 'Escolher imagem').slice(0,64))))))),
                contentEditor(),
                section('Adicionar elemento',null,el('div',{className:'ja-add-grid'},Object.entries(blockNames).map(([name,label])=>el(Button,{key:name,variant:'secondary',onClick:()=>addBlock(name)},'+ '+label)))),
                el('p',{className:'ja-help'},'Para arrastar, reordenar ou criar colunas, volte ao editor de blocos.'));
            const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
            return el(wp.element.Fragment,null,
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
                        el(Preview,{content:state.content,settings,person,campaign,mobile,revision,onSelect:selectPreview}),
                        el('div',{className:'ja-preview-options'},
                            el('details',null,el('summary',null,'Testar nome e campanha'),el('div',null,el(TextControl,{label:'Nome do visitante',value:person,onChange:setPerson,maxLength:160}),el(TextControl,{label:'Tipo / campanha',value:campaign,onChange:setCampaign,maxLength:160}))),
                            el(Button,{variant:'tertiary',onClick:()=>setRevision(revision+1)},'Reabrir prévia')))),
                el('footer',{className:'ja-studio-footer'},el('span',null,'As alterações ficam no editor. Salve no WordPress para atualizar a face.'),el('span',null,'Anúncio e recompensa seguem no Core.'))):null);
    }
    wp.plugins.registerPlugin('ja-reward-studio',{render:Studio,icon:'art'});
})(window.wp);
