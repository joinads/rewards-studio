(function () {
    'use strict';
    function flatten(blocks, rootClientId = '') {
        return blocks.flatMap((block, index) => [{ ...block, rootClientId, index }, ...flatten(block.innerBlocks || [], block.clientId)]);
    }
    // Destination indices refer to the list after removing the moving block.
    function destination(blocks, sourceId, targetId, after = false) {
        const items = flatten(blocks), source = items.find(b => b.clientId === sourceId), target = items.find(b => b.clientId === targetId);
        if (!source || !target || source === target || flatten(source.innerBlocks || []).some(b => b.clientId === targetId)) return null;
        let index = target.index + (after ? 1 : 0);
        if (source.rootClientId === target.rootClientId && source.index < index) index--;
        if (source.rootClientId === target.rootClientId && source.index === index) return null;
        return { clientIds:[sourceId], fromRootClientId:source.rootClientId, toRootClientId:target.rootClientId, index };
    }
    window.JoinAdsRewardStudioOrder = { flatten, destination };
})();
