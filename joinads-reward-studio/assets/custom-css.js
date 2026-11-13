(function () {
    'use strict';
    let sequence = 0;
    const LIMIT = 20000;
    // Split only at the top level, respecting comments, escapes, strings and functions.
    function scan(text, selectors = false) {
        const parts = [], stack = [];
        let quote = '', comment = false, start = 0;
        for (let i = 0; i < text.length; i++) {
            const c = text[i], next = text[i + 1];
            if (comment) { if (c === '*' && next === '/') { comment = false; i++; } continue; }
            if (c === '\\') { i++; continue; }
            if (quote) { if (c === quote) quote = ''; continue; }
            if (c === '/' && next === '*') { comment = true; i++; continue; }
            if (c === '"' || c === "'") { quote = c; continue; }
            if ('([{'.includes(c)) stack.push(c);
            if (')]}'.includes(c)) {
                if (stack.pop() !== {')':'(',']':'[','}':'{'}[c]) throw new Error('Confira as chaves, os parênteses e os colchetes do CSS.');
                if (!selectors && !stack.length && c === '}') { parts.push(text.slice(start, i + 1)); start = i + 1; }
            }
            if (!stack.length && ((selectors && c === ',') || (!selectors && c === ';'))) { parts.push(text.slice(start, i + (selectors ? 0 : 1))); start = i + 1; }
        }
        if (quote || comment || stack.length) throw new Error('Feche as aspas, os comentários e as chaves do CSS.');
        const tail = text.slice(start);
        if (tail.replace(/\/\*[\s\S]*?\*\//g, '').trim()) parts.push(tail);
        return parts.filter(part => part.replace(/\/\*[\s\S]*?\*\//g, '').trim());
    }
    function scopedSelector(selector, guard) {
        // The subject guard contains sibling combinators too; pseudo-elements stay last.
        let quote = '', depth = 0, square = 0;
        for (let i = 0; i < selector.length; i++) {
            const c = selector[i];
            if (c === '\\') { i++; continue; }
            if (quote) { if (c === quote) quote = ''; continue; }
            if (c === '"' || c === "'") { quote = c; continue; }
            if (c === '[') square++;
            if (c === ']') square--;
            if (square) continue;
            if (c === '(') depth++;
            if (c === ')') depth--;
            if (!depth && c === ':' && (selector[i + 1] === ':' || /^:(before|after|first-line|first-letter)\b/.test(selector.slice(i)))) return selector.slice(0, i) + guard + selector.slice(i);
        }
        return selector + guard;
    }
    function compile(input, id = 'check') {
        try {
            if (typeof input !== 'string' || input.length > LIMIT) throw new Error('Use até 20.000 caracteres de CSS.');
            const sheet = new CSSStyleSheet();
            for (const part of scan(input)) sheet.insertRule(part, sheet.cssRules.length);
            const scope = '[data-ja-css-scope="' + id + '"]';
            // One ID of specificity lets custom declarations override the standard
            // class-based appearance rules without forcing !important on every field.
            const guard = ':is(' + scope + ', ' + scope + ' .ja-face, ' + scope + ' .ja-face *):not(#ja-css-reserved-' + id + ')';
            const names = new Map();
            function collect(rules) {
                for (const rule of rules) {
                    if (rule.type === 7) {
                        if (!/^[-_a-zA-Z][\w-]*$/.test(rule.name)) throw new Error('Use nomes simples, sem aspas, em @keyframes.');
                        names.set(rule.name, 'ja-css-' + id + '-' + rule.name);
                    } else if (rule.type === 4 || rule.type === 12) collect(rule.cssRules);
                }
            }
            collect(sheet.cssRules);
            function declarations(style) {
                return Array.from({ length:style.length }, (_, i) => {
                    const property = style[i];
                    let value = style.getPropertyValue(property);
                    if (/^(?:-webkit-)?animation(?:-name)?$/.test(property)) value = value.replace(/"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|[-_a-zA-Z][\w-]*/g, token => names.get(token) || token);
                    return property + ':' + value + (style.getPropertyPriority(property) ? '!important' : '') + ';';
                }).join('');
            }
            function rulesText(rules) {
                return Array.from(rules, rule => {
                    if (rule.type === 1) {
                        if (rule.cssRules && rule.cssRules.length) throw new Error('Escreva os seletores separados, sem aninhar regras dentro de outras regras.');
                        const selectors = scan(rule.selectorText, true).map(selector => scopedSelector(selector.trim(), guard));
                        return selectors.join(',') + '{' + declarations(rule.style) + '}';
                    }
                    if (rule.type === 4 || rule.type === 12) return (rule.type === 4 ? '@media ' : '@supports ') + rule.conditionText + '{' + rulesText(rule.cssRules) + '}';
                    if (rule.type === 7) return '@keyframes ' + names.get(rule.name) + '{' + Array.from(rule.cssRules, frame => frame.keyText + '{' + declarations(frame.style) + '}').join('') + '}';
                    throw new Error('Use regras CSS, @media, @supports ou @keyframes. Importações e regras globais não são aplicadas.');
                }).join('\n');
            }
            return { css:rulesText(sheet.cssRules), error:'' };
        } catch (error) {
            return { css:'', error:error.message && /[áàãâéêíóôõúç]/i.test(error.message) ? error.message : 'CSS inválido. Confira os seletores e as declarações.' };
        }
    }
    function apply(root, face, nodes, input) {
        if (!input || !input.trim()) return () => {};
        const id = 'face' + (++sequence), result = compile(input, id);
        if (result.error || !result.css) return () => {};
        const targets = [...new Set([root, ...nodes].filter(node => node && node !== document.body && node !== document.documentElement))];
        const previous = targets.map(node => [node, node.getAttribute('data-ja-css-scope')]);
        targets.forEach(node => node.setAttribute('data-ja-css-scope', id));
        const style = document.createElement('style');
        style.dataset.jaCustomStyle = id;
        style.textContent = result.css;
        document.head.appendChild(style);
        let cleaned = false;
        return () => {
            if (cleaned) return;
            cleaned = true; style.remove();
            for (const [node, value] of previous) if (node.getAttribute('data-ja-css-scope') === id) {
                if (value === null) node.removeAttribute('data-ja-css-scope'); else node.setAttribute('data-ja-css-scope', value);
            }
        };
    }
    window.JoinAdsRewardCustomCSS = { compile, apply, limit:LIMIT };
})();
