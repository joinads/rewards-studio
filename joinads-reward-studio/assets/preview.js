(function () {
    const data = window.JoinAdsRewardPreview || {};
    const url = new URL(location.href);
    if (data.person) url.searchParams.set('person', data.person); else url.searchParams.delete('person');
    if (data.type) url.searchParams.set('type', data.type); else url.searchParams.delete('type');
    history.replaceState(null, '', url);
    const root = document.querySelector('.preview-card');
    const button = document.getElementById('native-watch');
    const close = document.getElementById('native-close');
    const status = document.querySelector('output');
    const reopen = () => {
        status.textContent = '';
        window.dispatchEvent(new CustomEvent('joinads:reward-face', { detail: { version: 1, rewardId: 'preview', root, button, close } }));
    };
    button.addEventListener('click', () => { status.textContent = 'Simulação: o clique chegou ao botão nativo do Core. No site, ele abrirá o anúncio pronto.'; });
    close.addEventListener('click', () => { status.textContent = 'Simulação: fechamento solicitado ao Core.'; });
    const gate = document.getElementById('preview-gate');
    if (gate) gate.addEventListener('click', () => { button.disabled = !button.disabled; gate.textContent = button.disabled ? 'Simular anúncio pronto' : 'Simular anúncio carregando'; });
    const again = document.getElementById('preview-reopen');
    if (again) again.addEventListener('click', reopen);
    reopen();
    if (data.interactive) {
        function select(event) {
            const target = event.target.closest('[data-ja-edit-index]');
            if (!event.target.closest('.ja-face')) return;
            event.preventDefault(); event.stopImmediatePropagation();
            if (target) window.parent.postMessage({ type: 'ja-reward-preview-select', index: Number(target.dataset.jaEditIndex) }, location.origin);
        }
        root.addEventListener('click', select, true);
        root.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') select(event); }, true);
        function decorate() {
            root.querySelectorAll('[data-ja-edit-index]').forEach(node => {
                node.classList.add('ja-preview-editable'); node.title = 'Clique para editar';
                if (!node.matches('button, a, input')) node.tabIndex = 0;
            });
        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate, { once: true }); else decorate();
    }
})();
