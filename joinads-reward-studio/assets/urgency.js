(function () {
    'use strict';
    function mount(face, scope) {
        const timers = [];
        face.querySelectorAll('[data-ja-countdown]').forEach((block, index) => {
            let end;
            if (block.dataset.mode === 'duration') {
                const seconds = Math.max(60, Math.min(86400, Number(block.dataset.seconds) || 900));
                const key = 'ja:urgency:v1:' + scope + ':' + (block.dataset.timerId || index) + ':' + seconds;
                const fallback = Date.now() + seconds * 1000;
                try {
                    const stored = localStorage.getItem(key);
                    end = stored !== null && Number.isFinite(Number(stored)) && Number(stored) > 0 && Number(stored) <= fallback ? Number(stored) : fallback;
                    if (end === fallback) localStorage.setItem(key, String(end));
                } catch (_) { end = fallback; }
            } else end = block.dataset.deadline && /^\d{4}-\d{2}-\d{2}T/.test(block.dataset.deadline) ? Date.parse(block.dataset.deadline) : NaN;
            const clock = block.querySelector('[data-ja-countdown-value]');
            const status = block.querySelector('[data-ja-countdown-status]');
            const expiredMessage = (status && status.textContent) || block.dataset.expiredLabel || 'O prazo informado terminou.';
            let interval;
            function render() {
                if (!Number.isFinite(end)) { block.hidden = true; return false; }
                const total = Math.max(0, Math.ceil((end - Date.now()) / 1000));
                const days = Math.floor(total / 86400);
                const hours = Math.floor((total % 86400) / 3600);
                const minutes = Math.floor((total % 3600) / 60);
                const seconds = total % 60;
                if (clock) clock.textContent = (days ? days + 'd ' : '') + [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(' : ');
                if (total > 0) return true;
                block.dataset.expired = 'true';
                if (block.dataset.expiry === 'hide') block.hidden = true;
                else if (status) { status.textContent = expiredMessage; status.hidden = false; }
                if (interval) clearInterval(interval);
                return false;
            }
            if (render()) { interval = setInterval(render, 1000); timers.push(interval); }
        });
        return () => timers.forEach(interval => clearInterval(interval));
    }
    window.JoinAdsRewardUrgency = { mount };
})();
