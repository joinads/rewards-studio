(function () {
    'use strict';
    const pending = new Map();
    const active = new WeakSet();
    const handledNative = new WeakSet();
    const status = window.JoinAdsRewardStudioStatus = { state: 'waiting', integration: null, reason: 'awaiting-reward' };
    const report = (state, reason, extra = {}) => Object.assign(status, { state, reason }, extra);
    const textParam = (params, key, fallback) => (params.get(key) || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160) || fallback;

    function mount(detail) {
        const { root, button, close, rewardId, version } = detail || {};
        if (version !== 1 || !(root instanceof HTMLElement) || !root.isConnected || !(button instanceof HTMLButtonElement) || !root.contains(button) || active.has(root)) return;
        const params = new URLSearchParams(location.search);
        const campaign = textParam(params, 'type', '');
        const candidates = Array.from(document.querySelectorAll('template[data-ja-face]')).filter(t => t.dataset.rewardId === String(rewardId));
        const template = candidates.find(t => t.dataset.campaignType === campaign && campaign) || candidates.find(t => !t.dataset.campaignType);
        if (!template) { report('skipped', 'no-matching-face', { rewardId: String(rewardId) }); return; }
        const face = document.createElement('div');
        face.className = 'ja-face';
        face.appendChild(template.content.cloneNode(true));
        const values = {
            person: textParam(params, 'person', template.dataset.personFallback || 'Visitante'),
            type: textParam(params, 'type', template.dataset.typeFallback || 'seu interesse')
        };
        // Only text nodes: query parameters can never become markup, URLs, CSS or event handlers.
        const walker = document.createTreeWalker(face, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) node.nodeValue = node.nodeValue.replace(/\{\{\s*(person|type)\s*\}\}/g, (_, key) => values[key]);
        const watches = Array.from(face.querySelectorAll('[data-ja-action="watch"]'));
        if (!watches.length) return; // Keep the original if the authored face cannot start the reward.
        const closers = Array.from(face.querySelectorAll('[data-ja-action="close"]'));
        for (const control of watches) control.addEventListener('click', () => {
            if (!button.disabled && button.isConnected) { cleanup(); button.click(); }
        });
        for (const control of closers) {
            control.hidden = !close;
            control.addEventListener('click', () => { if (close && close.isConnected && !close.disabled) { cleanup(); close.click(); } });
        }
        let appearance = {};
        try { appearance = JSON.parse(template.dataset.appearance || '{}'); } catch (_) { /* Defaults. */ }
        const design = window.JoinAdsRewardDesign;
        const settings = design ? design.sanitize(appearance) : {};
        for (const control of watches) {
            const label = control.querySelector('[data-ja-label]');
            if (label) {
                const loading = document.createElement('span');
                loading.dataset.jaLoadingLabel = ''; loading.textContent = settings.loadingLabel || 'Preparando anúncio…';
                loading.hidden = true; control.appendChild(loading);
            }
        }
        const sync = () => {
            for (const control of watches) {
                control.disabled = button.disabled;
                control.setAttribute('aria-busy', button.disabled ? 'true' : 'false');
                const label = control.querySelector('[data-ja-label]');
                const loading = control.querySelector('[data-ja-loading-label]');
                if (label && loading) { label.hidden = button.disabled; loading.hidden = !button.disabled; }
            }
        };
        sync();
        const originals = Array.from(root.children);
        const previousTabindex = root.getAttribute('tabindex');
        const previousLabel = root.getAttribute('aria-label');
        const previousLabelledby = root.getAttribute('aria-labelledby');
        const label = face.querySelector('h1,h2,h3,h4,h5,h6');
        const hadFocus = root.contains(document.activeElement);
        originals.forEach(child => child.classList.add('ja-native-hidden'));
        const restoreDesign = design ? design.apply(root, face, settings, template.dataset.customCss || '') : () => {};
        root.classList.add('ja-face-active');
        root.appendChild(face);
        root.removeAttribute('aria-labelledby');
        root.setAttribute('aria-label', label ? label.textContent : 'Conteúdo patrocinado');
        active.add(root);
        handledNative.add(root);
        report('mounted', null, { integration: detail.source === 'native-dom' ? 'native-dom' : 'bridge', rewardId: String(rewardId), faceId: template.dataset.faceId || null });
        root.setAttribute('tabindex', '-1');
        if (hadFocus) (watches.find(control => !control.disabled) || root).focus();

        const stopUrgency = window.JoinAdsRewardUrgency ? window.JoinAdsRewardUrgency.mount(face, String(rewardId) + ':' + (template.dataset.faceId || '') + ':' + campaign) : () => {};
        let cleaned = false;
        function cleanup() {
            if (cleaned) return;
            cleaned = true;
            stateObserver.disconnect();
            drawerObserver.disconnect();
            lifecycleObserver.disconnect();
            rootObserver.disconnect();
            window.removeEventListener('pagehide', cleanup);
            stopUrgency();
            restoreDesign();
            face.remove();
            originals.forEach(child => child.classList.remove('ja-native-hidden'));
            root.classList.remove('ja-face-active');
            root.removeAttribute('tabindex');
            if (previousTabindex !== null) root.setAttribute('tabindex', previousTabindex);
            root.removeAttribute('aria-label');
            if (previousLabel !== null) root.setAttribute('aria-label', previousLabel);
            if (previousLabelledby !== null) root.setAttribute('aria-labelledby', previousLabelledby);
            active.delete(root);
            report('released', 'native-lifecycle');
        }
        const drawer = root.closest('#ja-drawer');
        const drawerObserver = new MutationObserver(records => {
            if (records.some(record => (record.oldValue || '').split(/\s+/).includes('ja-open')) && !drawer.classList.contains('ja-open')) cleanup();
        });
        if (drawer) drawerObserver.observe(drawer, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
        const stateObserver = new MutationObserver(sync);
        stateObserver.observe(button, { attributes: true, attributeFilter: ['disabled'] });
        // Native delivery replaces content. Stop skinning as soon as the original CTA goes away.
        const rootObserver = new MutationObserver(() => { if (!root.contains(button) || !root.contains(face)) cleanup(); });
        rootObserver.observe(root, { childList: true, subtree: true });
        const lifecycleObserver = new MutationObserver(() => { if (!root.isConnected) cleanup(); });
        lifecycleObserver.observe(document.body, { childList: true });
        window.addEventListener('pagehide', cleanup, { once: true });
    }
    function receive(event) {
        const detail = event.detail;
        if (!detail || !(detail.root instanceof HTMLElement)) return;
        if (document.readyState === 'loading') {
            if (detail.source !== 'native-dom' || !pending.has(detail.root)) pending.set(detail.root, detail);
        }
        else { try { mount(detail); } catch (_) { /* Keep native UI. */ } }
    }
    // Compatibility for the deployed Core 1.0.57, which has no renderer bridge.
    // Read-only identification: never wrap fetch, queue.push, GPT or reward callbacks.
    const nativeRoots = '.reward-modal-backdrop[data-ja-reward-blocker="1"] .reward-modal, #ja-drawer.ja-open #ja-paper';
    function discoverNativeReward() {
        try {
            const queue = window.JoinAdsRewards;
            if (!Array.isArray(queue)) return; // The standalone uses an object; do not interfere.
            const ids = [...new Set(queue.map(entry => typeof entry?.rewardId === 'string' ? entry.rewardId.trim() : '').filter(Boolean))];
            if (ids.length !== 1) { if (ids.length > 1) report('skipped', 'ambiguous-reward-selection'); return; }
            // HTML-triggered rewards can coexist with the snippet and have a different ID.
            if (document.querySelector('[joinadscode="AdRewarded"]')) { report('skipped', 'mixed-reward-triggers'); return; }
            const config = window.wrapper?.config?.rewards;
            if (!Array.isArray(config)) return;
            const selected = config.filter(reward => String(reward?.rewardId) === ids[0]);
            if (selected.length !== 1) { report('skipped', 'reward-not-confirmed-by-tag'); return; }
            const type = selected[0].type;
            if (!['normal', 'block_modal', 'block_drawer'].includes(type)) { report('skipped', 'unsupported-native-format'); return; }
            const roots = Array.from(document.querySelectorAll(nativeRoots)).filter(root => root.isConnected);
            if (roots.length !== 1) { if (roots.length > 1) report('skipped', 'multiple-native-dialogs'); return; }
            const root = roots[0];
            if (active.has(root) || handledNative.has(root)) return;
            // Keep native quiz, lead and push forms intact, even if a tag is misconfigured.
            if (root.querySelector('input, select, textarea, form, .quiz-question, .quiz-options, .lead-capture-form, .push-card, .ja-face')) return;
            let button;
            if (type === 'normal' && !root.closest('#paywall, #ja-drawer')) button = root.querySelector('#show_rewarded_ad');
            if (type === 'block_modal' && root.closest('#paywall')) button = root.querySelector('.reward-dock .reward-button');
            if (type === 'block_drawer' && root.closest('#ja-drawer')) button = root.querySelector('#ja-confirm');
            if (!(button instanceof HTMLButtonElement)) return;
            receive({ detail: { version: 1, rewardId: ids[0], root, button, close: root.querySelector('.reward-close, #ja-close'), source: 'native-dom' } });
        } catch (_) { report('skipped', 'native-detection-unavailable'); }
    }
    let discoveryScheduled = false;
    function scheduleNativeDiscovery() {
        if (discoveryScheduled) return;
        discoveryScheduled = true;
        // Run after the native renderer has attached its handlers and gate.
        queueMicrotask(() => { discoveryScheduled = false; discoverNativeReward(); });
    }
    const nativeObserver = new MutationObserver(records => {
        for (const record of records) {
            if (record.type === 'attributes') {
                if (record.target.id === 'ja-drawer') { scheduleNativeDiscovery(); break; }
                continue;
            }
            if (Array.from(record.addedNodes).some(node => node.nodeType === 1 && !node.closest('.ja-face') && (node.matches('.reward-modal, #ja-drawer, #ja-paper, template[data-ja-face]') || node.querySelector('.reward-modal, #ja-paper') || node.closest('.reward-modal, #ja-paper')))) {
                scheduleNativeDiscovery(); break;
            }
        }
    });
    nativeObserver.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('DOMContentLoaded', scheduleNativeDiscovery, { once: true });
    window.addEventListener('pagehide', () => nativeObserver.disconnect(), { once: true });
    window.addEventListener('pageshow', event => {
        if (event.persisted) { nativeObserver.observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] }); scheduleNativeDiscovery(); }
    });
    scheduleNativeDiscovery();
    window.addEventListener('joinads:reward-face', receive);
    document.addEventListener('DOMContentLoaded', () => {
        pending.forEach(detail => { try { mount(detail); } catch (_) { /* Keep native UI. */ } });
        pending.clear();
    }, { once: true });
})();
