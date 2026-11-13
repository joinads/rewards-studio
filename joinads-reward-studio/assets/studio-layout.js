(function () {
    'use strict';
    const hasClass = (attributes, name) => (attributes.className || '').split(/\s+/).includes(name);
    function isRow(block) { return !!block && block.name === 'core/group' && block.attributes.layout?.type === 'flex' && block.attributes.layout.orientation !== 'vertical'; }
    function read(attributes) {
        const gap = attributes.style?.spacing?.blockGap;
        const number = parseFloat(typeof gap === 'object' ? gap.left : gap);
        return {
            justify:attributes.layout?.justifyContent || 'left', align:attributes.layout?.verticalAlignment || 'center',
            gap:Number.isFinite(number) ? Math.max(0, Math.min(64, number)) : 12,
            mobile:hasClass(attributes,'ja-row-mobile-stack') ? 'stack' : hasClass(attributes,'ja-row-mobile-nowrap') ? 'nowrap' : 'wrap',
            sizing:hasClass(attributes,'ja-row-equal') ? 'equal' : 'auto'
        };
    }
    function update(attributes, values) {
        const next = { ...read(attributes), ...values };
        const classes = (attributes.className || '').split(/\s+/).filter(name => name && !/^ja-row-(mobile-(stack|nowrap|wrap)|equal)$/.test(name));
        if (!classes.includes('ja-studio-row')) classes.push('ja-studio-row');
        classes.push('ja-row-mobile-' + (['wrap','stack','nowrap'].includes(next.mobile) ? next.mobile : 'wrap'));
        if (next.sizing === 'equal') classes.push('ja-row-equal');
        const layout = { ...attributes.layout, type:'flex', orientation:'horizontal', flexWrap:'wrap' };
        if (['left','center','right','space-between'].includes(next.justify)) layout.justifyContent = next.justify;
        if (['top','center','bottom','stretch'].includes(next.align)) layout.verticalAlignment = next.align;
        const result = { ...attributes, className:classes.join(' '), layout };
        // Only replace spacing when explicitly changed: preserve theme tokens and user styles.
        if (Object.hasOwn(values,'gap')) result.style = { ...attributes.style, spacing:{ ...attributes.style?.spacing, blockGap:Math.max(0,Math.min(64,Number(values.gap) || 0)) + 'px' } };
        return result;
    }
    function groupPlan(blocks, sourceId, partnerId) {
        const items = window.JoinAdsRewardStudioOrder.flatten(blocks);
        const source = items.find(block => block.clientId === sourceId), partner = items.find(block => block.clientId === partnerId);
        if (!source || !partner || source === partner || window.JoinAdsRewardStudioOrder.flatten(source.innerBlocks || []).some(block=>block.clientId===partnerId) || window.JoinAdsRewardStudioOrder.flatten(partner.innerBlocks || []).some(block=>block.clientId===sourceId)) return null;
        // Use the original block objects, preserving their IDs, content and all attributes.
        const siblings = source.rootClientId ? items.find(block => block.clientId === source.rootClientId).innerBlocks : blocks;
        const partnerSiblings = partner.rootClientId ? items.find(block=>block.clientId===partner.rootClientId).innerBlocks : blocks;
        const selected = [siblings.find(block => block.clientId === sourceId),partnerSiblings.find(block => block.clientId === partnerId)];
        return {
            clientIds:[source,partner].sort((a,b)=>a.index-b.index).map(block=>block.clientId), rootClientId:source.rootClientId, partnerRootClientId:partner.rootClientId, innerBlocks:selected,
            attributes:update({metadata:{name:'Linha do reward'},style:{spacing:{blockGap:'12px'}}},{justify:'space-between',align:'center'})
        };
    }
    window.JoinAdsRewardStudioLayout = { isRow, read, update, groupPlan };
})();
