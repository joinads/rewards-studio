(function (wp) {
    'use strict';
    const el=wp.element.createElement;
    const {SelectControl,RangeControl,TextControl,ToggleControl}=wp.components;
    const layouts=[{label:'Digital',value:'classic'},{label:'Blocos separados',value:'cards'},{label:'Compacto',value:'compact'},{label:'Faixa de destaque',value:'ribbon'}];
    const variants=[{label:'Texto em linha',value:'inline'},{label:'Selo',value:'badge'},{label:'Cartão',value:'card'}];
    function controls(name,a,patch) {
        const range=(key,label,min,max,step=1,value=a[key])=>el(RangeControl,{key,label,min,max,step,value,onChange:value=>patch({[key]:value===undefined?min:value})});
        const text=(key,label,help)=>el(TextControl,{key,label,help,value:a[key] || '',onChange:value=>patch({[key]:value})});
        const color=(key,label,fallback)=>el('label',{key,className:'ja-editor-color'},el('span',null,label),el('input',{type:'color',value:a[key] || fallback,onChange:event=>patch({[key]:event.target.value})}));
        const more=(title,children)=>el('details',{key:title,className:'ja-studio-disclosure'},el('summary',null,title),el('div',null,children));
        if(name==='joinads/reward-action')return el('div',{className:'ja-trigger-controls'},
            el(SelectControl,{label:'Pulsação do botão',value:a.pulse || 'none',options:[{label:'Sem pulsação',value:'none'},{label:'Suave',value:'soft'},{label:'Mais forte',value:'strong'}],onChange:pulse=>patch({pulse})}),
            a.pulse&&a.pulse!=='none'?el(RangeControl,{label:'Velocidade da pulsação (segundos)',value:(a.pulseDuration || 1800)/1000,min:.8,max:5,step:.1,onChange:value=>patch({pulseDuration:Math.round((value || 1.8)*1000)})}):null,
            el('p',{className:'ja-help'},'O efeito começa quando o anúncio fica pronto. Não altera o clique nem a espera.'));
        if(name==='joinads/reward-countdown')return el('div',{className:'ja-trigger-controls'},
            el(SelectControl,{label:'Layout do contador',value:a.layout || 'classic',options:layouts,onChange:layout=>patch({layout})}),
            range('digitSize','Tamanho dos números (px)',18,72,1,a.digitSize ?? 34),
            more('Cores e cantos do relógio',[color('accentColor','Cor de destaque','#ef4444'),color('unitBackground','Fundo dos blocos','#ffffff'),color('unitColor','Texto dos blocos','#172033'),range('clockRadius','Arredondamento do relógio (px)',0,40,1,a.clockRadius ?? 12)]),
            more('Nomes das unidades',[el(ToggleControl,{key:'showDays',label:'Mostrar dias mesmo quando forem zero',checked:!!a.showDays,onChange:showDays=>patch({showDays})}),text('daysLabel','Dias'),text('hoursLabel','Horas'),text('minutesLabel','Minutos'),text('secondsLabel','Segundos')]),
            more('Destaque nos últimos segundos',[range('urgentSeconds','Destacar quando faltarem (segundos)',0,3600,10,a.urgentSeconds ?? 0),text('urgentLabel','Mensagem de urgência','Deixe vazio para não mostrar mensagem.'),el(ToggleControl,{key:'urgentPulse',label:'Pulsar a borda durante o destaque',checked:!!a.urgentPulse,onChange:urgentPulse=>patch({urgentPulse})})]));
        if(name==='joinads/reward-audience')return el('div',{className:'ja-trigger-controls'},
            el('p',{className:'ja-help'},'Contagem simulada: os números variam localmente e não medem visitantes reais.'),
            text('label','Texto da contagem','Use {count} na posição do número. Ex.: {count} watching now'),
            el(SelectControl,{label:'Layout da audiência',value:a.layout || 'badge',options:variants,onChange:layout=>patch({layout})}),
            el(RangeControl,{key:'minimum',label:'Número mínimo',min:0,max:10000,value:a.minimum ?? 300,onChange:value=>{value=value ?? 0;patch({minimum:value,maximum:Math.max(value,a.maximum ?? 360),initial:Math.max(value,a.initial ?? 328)});}}),
            el(RangeControl,{key:'maximum',label:'Número máximo',min:a.minimum ?? 300,max:10000,value:Math.max(a.minimum ?? 300,a.maximum ?? 360),onChange:value=>{value=value ?? 360;patch({maximum:value,initial:Math.min(value,a.initial ?? 328)});}}),
            range('initial','Número inicial',a.minimum ?? 300,Math.max(a.minimum ?? 300,a.maximum ?? 360),1,Math.max(a.minimum ?? 300,Math.min(a.maximum ?? 360,a.initial ?? 328))),
            range('step','Variação máxima por mudança',1,100,1,a.step ?? 5),
            el(RangeControl,{label:'Mudar a cada (segundos)',min:1,max:60,step:1,value:(a.interval || 4000)/1000,onChange:value=>patch({interval:(value || 4)*1000})}),
            el(ToggleControl,{label:'Mostrar indicador de atividade',checked:a.indicator!==false,onChange:indicator=>patch({indicator})}),color('accentColor','Cor do indicador','#16a34a'));
        return null;
    }
    window.JoinAdsRewardTriggerControls={controls};
})(window.wp);
