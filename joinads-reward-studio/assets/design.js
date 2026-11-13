(function () {
    'use strict';
    const schema = window.JoinAdsRewardDesignSchema;
    const fields = schema.fields;
    const defaults = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.default]));
    function sanitize(input) {
        const values = { ...defaults };
        if (!input || typeof input !== 'object') return values;
        for (const [key, field] of Object.entries(fields)) {
            const value = input[key];
            if (field.type === 'number') {
                if (typeof value === 'number' && Number.isFinite(value)) values[key] = Math.max(field.min, Math.min(field.max, value));
            } else if (typeof value === 'string') {
                if (field.options) {
                    if (field.options.some(option => option.value === value)) values[key] = value;
                } else if (field.format === 'color') {
                    if (/^#[0-9a-f]{6}$/i.test(value)) values[key] = value;
                } else if (field.format === 'image') {
                    try { const url = new URL(value); if (['https:', 'http:'].includes(url.protocol)) values[key] = url.href; } catch (_) { /* empty or invalid */ }
                } else if (key === 'customFont') {
                    if (/^[\p{L}\p{N} _.-]{1,80}$/u.test(value)) values[key] = value;
                } else values[key] = value.replace(/[<>\u0000-\u001f\u007f]/g, '').slice(0, 120);
            }
        }
        return values;
    }
    const positions = {
        center: ['center', 'center'], top: ['center', 'start'], bottom: ['center', 'end'],
        left: ['start', 'center'], right: ['end', 'center'],
        'top-left': ['start', 'start'], 'top-right': ['end', 'start'],
        'bottom-left': ['start', 'end'], 'bottom-right': ['end', 'end']
    };
    const fonts = { system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', serif: 'Georgia, "Times New Roman", serif', mono: 'ui-monospace, SFMono-Regular, monospace', inherit: 'inherit' };
    function apply(root, face, raw, customCSS = '') {
        const settings = sanitize(raw);
        const overlay = root.closest('.reward-modal-backdrop, #ja-drawer, [data-ja-preview-overlay]') || root.parentElement;
        const external = root.closest('#ja-drawer') ? document.getElementById('ja-backdrop') : null;
        const nodes = [...new Set([root, overlay, external].filter(Boolean))];
        const snapshot = nodes.map(node => ({ node, style: node.getAttribute('style'), classes: node.getAttribute('class') }));
        const css = {
            width: settings.widthMode === 'full' ? '100%' : settings.width + 'px', height: settings.heightMode === 'auto' ? 'auto' : settings.heightMode === 'full' ? '100%' : settings.height + 'px',
            'content-width': settings.contentWidth + 'px', 'content-top': settings.contentAlign === 'top' ? '0px' : 'auto', 'content-bottom': settings.contentAlign === 'bottom' ? '0px' : 'auto',
            'min-height': settings.minHeight + 'px', 'max-height': settings.maxHeight + 'dvh',
            inset: settings.inset + 'px', padding: settings.padding + 'px', radius: settings.radius + 'px',
            background: settings.background, 'border-width': settings.borderWidth + 'px', 'border-color': settings.borderColor,
            'image-position': settings.backgroundPosition, 'image-opacity': settings.imageOpacity,
            'font-family': settings.customFont ? JSON.stringify(settings.customFont) + ', ' + fonts[settings.font] : fonts[settings.font], 'font-size': settings.fontSize + 'px', 'heading-size': settings.headingSize + 'px',
            'line-height': settings.lineHeight, 'text-color': settings.textColor, 'heading-color': settings.headingColor, 'text-align': settings.textAlign,
            'button-background': settings.buttonBackground, 'button-text': settings.buttonText, 'button-hover': settings.buttonHover,
            'button-radius': settings.buttonRadius + 'px', 'button-padding': settings.buttonPadding + 'px', 'button-font-size': settings.buttonFontSize + 'px',
            'button-width': settings.buttonWidth === 'full' ? '100%' : 'fit-content',
            'mobile-width': settings.mobileWidthMode === 'full' ? '100%' : settings.mobileWidth + 'px', 'mobile-inset': settings.mobileInset + 'px', 'mobile-padding': settings.mobilePadding + 'px',
            'mobile-radius': settings.mobileRadius + 'px', 'mobile-font-size': settings.mobileFontSize + 'px', 'mobile-heading-size': settings.mobileHeadingSize + 'px',
            'mobile-height': settings.mobileHeightMode === 'auto' ? 'auto' : settings.mobileHeightMode === 'full' ? '100%' : settings.mobileHeight + 'px',
            'align-x': positions[settings.position][0], 'align-y': positions[settings.position][1],
            'mobile-align-x': positions[settings.mobilePosition][0], 'mobile-align-y': positions[settings.mobilePosition][1],
            shadow: { none: 'none', soft: '0 20px 70px #00000030', strong: '0 28px 100px #00000070' }[settings.shadow],
            'overlay-rgba': 'rgba(' + settings.overlayColor.slice(1).match(/../g).map(channel => parseInt(channel, 16)).join(',') + ',' + settings.overlayOpacity + ')',
            'overlay-color': settings.overlayColor, 'overlay-opacity': settings.overlayOpacity,
            'overlay-blur': settings.overlayBlur + 'px', duration: settings.duration + 'ms'
        };
        // A separate image layer avoids injecting URL strings into stylesheets.
        if (settings.backgroundImage) {
            const image = document.createElement('img');
            image.className = 'ja-face-background-image'; image.alt = ''; image.src = settings.backgroundImage;
            image.setAttribute('aria-hidden', 'true'); root.appendChild(image);
        }
        for (const node of nodes) for (const [key, value] of Object.entries(css)) node.style.setProperty('--ja-' + key, String(value));
        root.classList.add('ja-designed-modal');
        root.dataset.jaAnimation = settings.animation;
        face.dataset.jaButtonEffect = settings.buttonEffect;
        if (overlay && overlay !== root) overlay.classList.add('ja-designed-overlay');
        if (external) { external.classList.add('ja-designed-backdrop'); overlay.classList.add('ja-designed-drawer'); }
        const restoreCSS = window.JoinAdsRewardCustomCSS ? window.JoinAdsRewardCustomCSS.apply(root, face, [root.closest('.reward-modal-backdrop, #ja-drawer, [data-ja-preview-overlay]'), external], customCSS) : () => {};
        let restored = false;
        return () => {
            if (restored) return;
            restored = true;
            restoreCSS();
            root.querySelectorAll(':scope > .ja-face-background-image').forEach(image => image.remove());
            delete root.dataset.jaAnimation;
            for (const entry of snapshot) {
                // Preserve live Core classes (e.g. drawer open/close), restore only this extension's classes.
                entry.node.classList.remove('ja-designed-modal', 'ja-designed-overlay', 'ja-designed-backdrop', 'ja-designed-drawer');
                if (entry.style === null) entry.node.removeAttribute('style'); else entry.node.setAttribute('style', entry.style);
            }
        };
    }
    function applyFormat(current, id) {
        const format = (schema.formats || []).find(item => item.id === id);
        return sanitize({ ...sanitize(current), ...(format ? format.values : {}) });
    }
    function applyPalette(current, id) {
        const palette = (schema.palettes || []).find(item => item.id === id);
        return sanitize({ ...sanitize(current), ...(palette ? palette.values : {}) });
    }
    function currentFormat(raw) {
        const s = sanitize(raw);
        if (s.widthMode === 'full' && s.heightMode === 'full' && s.inset === 0) return 'full';
        if (s.position === 'bottom' && s.heightMode === 'auto' && s.widthMode === 'full') return 'bottom';
        if (s.position === 'right' && s.heightMode === 'full') return 'side';
        if (s.position === 'center' && s.heightMode === 'auto' && s.widthMode === 'fixed') return 'center';
        return 'custom';
    }
    window.JoinAdsRewardDesign = { schema, defaults, sanitize, apply, applyFormat, applyPalette, currentFormat };
})();
