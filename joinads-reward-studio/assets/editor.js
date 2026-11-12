(function (wp) {
    'use strict';
    const el = wp.element.createElement;
    const { InspectorControls, useBlockProps, RichText } = wp.blockEditor;
    const { PanelBody, SelectControl, TextControl, RangeControl, Notice } = wp.components;
    const icons = [{ label:'Sem ícone',value:'none' },{label:'Presente',value:'gift'},{label:'Relógio',value:'clock'},{label:'Confirmado',value:'check'},{label:'Fogo',value:'fire'}];
    const triggers = window.JoinAdsRewardTriggerControls;
    const glyphs = { none:'',gift:'✦',clock:'◷',check:'✓',fire:'🔥',play:'▶',lock:'▣',arrow:'→' };
    wp.blocks.registerBlockType('joinads/reward-action', {
        edit: function (props) {
            return el(wp.element.Fragment, null,
                el(InspectorControls, null, el(PanelBody, { title:'Ação do reward' },
                    el(SelectControl, {label:'Ao clicar',value:props.attributes.action,options:[{label:'Assistir anúncio',value:'watch'},{label:'Fechar (se permitido pelo Core)',value:'close'}],onChange:action=>props.setAttributes({action})}),
                    el(SelectControl,{label:'Ícone',value:props.attributes.icon || 'none',options:[{label:'Sem ícone',value:'none'},{label:'Play',value:'play'},{label:'Cadeado',value:'lock'},{label:'Seta',value:'arrow'},{label:'Presente',value:'gift'}],onChange:icon=>props.setAttributes({icon})}),
                    el(SelectControl,{label:'Estilo do botão',value:props.attributes.variant || 'auto',options:[{label:'Automático',value:'auto'},{label:'Principal',value:'primary'},{label:'Contorno',value:'secondary'},{label:'Somente texto',value:'text'}],onChange:variant=>props.setAttributes({variant})}),
                    triggers.controls('joinads/reward-action',props.attributes,props.setAttributes),
                    el('p',null,'Cores e espaçamento podem ser ajustados no bloco. O carregamento segue o anúncio nativo.'))),
                el('div', useBlockProps({className:'ja-action-editor-preview','data-ja-pulse':props.attributes.action==='close'?'none':props.attributes.pulse,style:{'--ja-pulse-duration':(props.attributes.pulseDuration || 1800)+'ms'}}), el('span',{className:'wp-element-button',style:{display:'block',textAlign:'center'}},
                    glyphs[props.attributes.icon] ? el('span',{'aria-hidden':true},glyphs[props.attributes.icon]+' ') : null,
                    el(RichText,{tagName:'span',value:props.attributes.label,allowedFormats:[],onChange:label=>props.setAttributes({label})}))));
        }, save:function(){return null;}
    });
    wp.blocks.registerBlockType('joinads/reward-badge', {
        edit:function(props){return el(wp.element.Fragment,null,
            el(InspectorControls,null,el(PanelBody,{title:'Destaque'},el(SelectControl,{label:'Ícone',value:props.attributes.icon,options:icons,onChange:icon=>props.setAttributes({icon})}),el('p',null,'Escreva uma informação real da sua campanha. Nenhuma quantidade ou prova social é gerada automaticamente.'))),
            el('div',useBlockProps({className:'ja-badge'}),el('span',{'aria-hidden':true},glyphs[props.attributes.icon]+' '),el(RichText,{tagName:'span',value:props.attributes.label,allowedFormats:[],onChange:label=>props.setAttributes({label})})));},save:function(){return null;}
    });
    wp.blocks.registerBlockType('joinads/reward-countdown', {
        edit:function(props){
            const a=props.attributes;
            wp.element.useEffect(()=>{if(!a.timerId)props.setAttributes({timerId:props.clientId});},[a.timerId,props.clientId]);
            let localDeadline='';
            if(a.deadline && Number.isFinite(Date.parse(a.deadline))){ const d=new Date(a.deadline); localDeadline=new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
            return el(wp.element.Fragment,null,
                el(InspectorControls,null,el(PanelBody,{title:'Prazo da campanha'},
                    el(SelectControl,{label:'Tipo de contagem',value:a.mode,options:[{label:'Data e hora de encerramento',value:'deadline'},{label:'Prazo por visitante',value:'duration'}],onChange:mode=>props.setAttributes({mode})}),
                    a.mode==='duration'?el(RangeControl,{label:'Prazo em minutos',value:a.seconds/60,min:1,max:1440,onChange:value=>props.setAttributes({seconds:Math.round(value*60)})}):el(TextControl,{label:'Data e hora (seu fuso horário)',type:'datetime-local',value:localDeadline,onChange:value=>props.setAttributes({deadline:value&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():''})}),
                    el(TextControl,{label:'Texto acima do relógio',value:a.label,onChange:label=>props.setAttributes({label})}),
                    el(SelectControl,{label:'Quando terminar',value:a.expiry,options:[{label:'Mostrar mensagem',value:'message'},{label:'Ocultar o contador',value:'hide'}],onChange:expiry=>props.setAttributes({expiry})}),
                    a.expiry!=='hide'?el(TextControl,{label:'Mensagem final',value:a.expiredLabel,onChange:expiredLabel=>props.setAttributes({expiredLabel})}):null,
                    triggers.controls('joinads/reward-countdown',a,props.setAttributes),
                    el('p',null,'O contador é visual: não bloqueia a oferta, não libera conteúdo e não altera o anúncio. O prazo por visitante é mantido neste navegador quando o armazenamento está disponível.'))),
                el('div',useBlockProps({className:'ja-countdown','data-layout':a.layout || 'classic',style:{'--ja-clock-size':(a.digitSize || 34)+'px','--ja-clock-radius':(a.clockRadius ?? 12)+'px','--ja-clock-accent':a.accentColor || '#ef4444','--ja-clock-unit-bg':a.unitBackground || '#ffffff','--ja-clock-unit-color':a.unitColor || '#172033'}}),el('p',null,a.label),el('div',{className:'ja-countdown-clock'},el('span',{'data-ja-countdown-value':''},a.mode==='duration'?Math.floor(a.seconds/3600).toString().padStart(2,'0')+' : '+Math.floor(a.seconds%3600/60).toString().padStart(2,'0')+' : 00':'DD : HH : MM : SS'),el('span',{className:'ja-countdown-units'},['days','hours','minutes','seconds'].filter(unit=>unit!=='days'||a.showDays).map(unit=>el('span',{key:unit,className:'ja-countdown-unit'},el('strong',null,String(unit==='minutes'?Math.floor((a.seconds || 900)%3600/60):unit==='hours'?Math.floor((a.seconds || 900)/3600):0).padStart(2,'0')),el('small',null,a[unit+'Label']))))),!a.deadline&&a.mode==='deadline'?el(Notice,{status:'info',isDismissible:false},'Escolha a data de encerramento nos ajustes do bloco.'):null));
        },save:function(){return null;}
    });
    wp.blocks.registerBlockType('joinads/reward-audience', {
        edit:function(props){
            const a=props.attributes;const min=a.minimum ?? 300,max=Math.max(min,a.maximum ?? 360);const initial=Math.max(min,Math.min(max,a.initial ?? 328));
            const rawLabel=typeof a.label==='string'?a.label:'{count} watching now';const label=rawLabel.includes('{count}')?rawLabel:rawLabel+' {count}';
            return el(wp.element.Fragment,null,
                el(InspectorControls,null,el(PanelBody,{title:'Audiência simulada'},triggers.controls('joinads/reward-audience',a,props.setAttributes))),
                el('div',useBlockProps({className:'ja-audience','data-layout':a.layout || 'badge',style:{'--ja-audience-accent':a.accentColor || '#16a34a'}}),a.indicator!==false?el('span',{className:'ja-audience-dot','aria-hidden':true}):null,el('span',null,label.replaceAll('{count}',String(initial)))));
        },save:function(){return null;}
    });
})(window.wp);
