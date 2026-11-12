(function () {
    'use strict';
    const bounded = (value, min, max, fallback) => { const n = Number(value); return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.floor(n))) : fallback; };
    function nextAudience(current, min, max, step) {
        if (min === max) return min;
        const direction = current <= min ? 1 : current >= max ? -1 : Math.random() < .5 ? -1 : 1;
        return Math.max(min, Math.min(max, current + direction * (1 + Math.floor(Math.random() * step))));
    }
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
                const formatted = (days ? days + 'd ' : '') + [hours, minutes, seconds].map(n => String(n).padStart(2, '0')).join(' : ');
                if (clock) clock.textContent = formatted;
                const timer = block.querySelector('[role="timer"]');
                if (timer) timer.setAttribute('aria-label', 'Tempo restante: ' + formatted);
                const parts = { days, hours, minutes, seconds };
                block.querySelectorAll('[data-ja-unit]').forEach(unit => {
                    const key = unit.dataset.jaUnit;
                    const value = unit.querySelector('[data-ja-unit-value]');
                    if (value && key in parts) value.textContent = String(parts[key]).padStart(2, '0');
                    if (key === 'days') unit.hidden = days === 0 && block.dataset.showDays !== 'true';
                });
                const urgent = total > 0 && total <= bounded(block.dataset.urgentSeconds, 0, 3600, 0);
                block.dataset.urgent = urgent ? 'true' : 'false';
                const urgentCopy = block.querySelector('[data-ja-countdown-urgent]');
                if (urgentCopy) urgentCopy.hidden = !urgent || !urgentCopy.textContent.trim();
                if (total > 0) return true;
                block.dataset.expired = 'true';
                if (block.dataset.expiry === 'hide') block.hidden = true;
                else if (status) { status.textContent = expiredMessage; status.hidden = false; }
                if (interval) clearInterval(interval);
                return false;
            }
            if (render()) { interval = setInterval(render, 1000); timers.push(interval); }
        });
        face.querySelectorAll('[data-ja-audience]').forEach(block => {
            const minimum = bounded(block.dataset.minimum, 0, 1000000, 300);
            const maximum = bounded(block.dataset.maximum, minimum, 1000000, Math.max(minimum, 360));
            const step = bounded(block.dataset.step, 1, 100, 5);
            let count = bounded(block.dataset.initial, minimum, maximum, minimum);
            let formatter;
            try { formatter = new Intl.NumberFormat(document.documentElement.lang || undefined); } catch (_) { formatter = { format: n => String(n) }; }
            const render = () => block.querySelectorAll('[data-ja-audience-value]').forEach(value => { value.textContent = formatter.format(count); });
            render();
            if (minimum !== maximum) timers.push(setInterval(() => {
                if (document.hidden || !face.isConnected) return;
                count = nextAudience(count, minimum, maximum, step); render();
            }, bounded(block.dataset.interval, 1000, 60000, 4000)));
        });
        let stopped = false;
        return () => { if (stopped) return; stopped = true; timers.forEach(interval => clearInterval(interval)); };
    }
    window.JoinAdsRewardUrgency = { mount, nextAudience };
})();
