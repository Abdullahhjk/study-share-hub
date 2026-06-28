type DomDebuggerControls = {
    start: () => void;
    stop: () => void;
    status: () => boolean;
};

declare global {
    interface Window {
        __DOM_DEBUGGER__?: DomDebuggerControls;
    }
}

(() => {
    if (window.__DOM_DEBUGGER__) return;

    const STYLE_ID = '__dom_debugger_style__';
    const LABEL_CLASS = '__dom_debugger_label__';
    const ELEMENT_ATTR = 'data-dom-debugger-id';

    const colorCache = new Map<string, string>();
    const labelMap = new Map<string, HTMLDivElement>();

    let mutationObserver: MutationObserver | null = null;
    let rafId: number | null = null;
    let active = false;

    function getColor(tagName: string): string {
        tagName = tagName.toLowerCase();

        if (colorCache.has(tagName)) {
            return colorCache.get(tagName)!;
        }

        let hash = 0;

        for (let i = 0; i < tagName.length; i++) {
            hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
        }

        const hue = Math.abs(hash % 360);
        const color = `hsl(${hue}, 75%, 50%)`;

        colorCache.set(tagName, color);

        return color;
    }

    function injectStyles(): void {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');

        style.id = STYLE_ID;

        style.textContent = `
            .${LABEL_CLASS} {
                position: absolute;
                z-index: 2147483647;
                pointer-events: auto;
                font-family: monospace;
                font-size: 10px;
                line-height: 1;
                padding: 2px 4px;
                border-radius: 3px;
                color: #fff;
                white-space: nowrap;
                transform-origin: top left;
                transition: transform 0.12s ease;
                user-select: none;
            }

            .${LABEL_CLASS}:hover {
                transform: scale(2);
            }
        `;

        document.head.appendChild(style);
    }

    function updateLabelPosition(
        el: HTMLElement,
        label: HTMLDivElement
    ): void {
        if (!document.contains(el)) return;

        const rect = el.getBoundingClientRect();

        label.style.left = `${window.scrollX + rect.left}px`;
        label.style.top = `${window.scrollY + rect.top - 14}px`;
    }

    function removeLabel(el: HTMLElement): void {
        const id = el.getAttribute(ELEMENT_ATTR);

        if (!id) return;

        const label = labelMap.get(id);

        if (label) {
            label.remove();
            labelMap.delete(id);
        }

        el.removeAttribute(ELEMENT_ATTR);
        el.style.outline = '';
        el.style.outlineOffset = '';
    }

    function createLabel(
        el: HTMLElement,
        color: string
    ): void {
        const id = crypto.randomUUID();

        el.setAttribute(ELEMENT_ATTR, id);

        const label = document.createElement('div');

        label.className = LABEL_CLASS;

        label.textContent = el.tagName.toLowerCase();

        label.style.background = color;

        document.body.appendChild(label);

        labelMap.set(id, label);

        updateLabelPosition(el, label);
    }

    function processElement(el: HTMLElement): void {
        if (
            el.classList.contains(LABEL_CLASS) ||
            [
                'SCRIPT',
                'STYLE',
                'META',
                'LINK',
                'NOSCRIPT',
                'TITLE',
                'BR'
            ].includes(el.tagName)
        ) {
            return;
        }

        if (el.hasAttribute(ELEMENT_ATTR)) {
            return;
        }

        const color = getColor(el.tagName);

        el.style.outline = `1px solid ${color}`;
        el.style.outlineOffset = '-1px';

        createLabel(el, color);
    }

    function refreshPositions(): void {
        if (!active) return;

        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            document
                .querySelectorAll<HTMLElement>(`[${ELEMENT_ATTR}]`)
                .forEach(el => {
                    const id = el.getAttribute(ELEMENT_ATTR);

                    if (!id) return;

                    const label = labelMap.get(id);

                    if (!label) return;

                    if (!document.contains(el)) {
                        removeLabel(el);
                        return;
                    }

                    updateLabelPosition(el, label);
                });
        });
    }

    function processAll(): void {
        document
            .querySelectorAll<HTMLElement>('*')
            .forEach(processElement);

        refreshPositions();
    }

    function cleanupRemovedNodes(node: Node): void {
        if (!(node instanceof HTMLElement)) return;

        if (node.hasAttribute(ELEMENT_ATTR)) {
            removeLabel(node);
        }

        node
            .querySelectorAll<HTMLElement>(`[${ELEMENT_ATTR}]`)
            .forEach(removeLabel);
    }

    function setupObserver(): void {
        mutationObserver = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.removedNodes.forEach(cleanupRemovedNodes);

                mutation.addedNodes.forEach(node => {
                    if (!(node instanceof HTMLElement)) return;

                    processElement(node);

                    node
                        .querySelectorAll<HTMLElement>('*')
                        .forEach(processElement);
                });
            });

            refreshPositions();
        });

        mutationObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    function handleScroll(): void {
        refreshPositions();
    }

    function handleResize(): void {
        refreshPositions();
    }

    function start(): void {
        if (active) return;

        active = true;

        injectStyles();

        processAll();

        setupObserver();

        window.addEventListener('scroll', handleScroll, {
            passive: false
        });

        window.addEventListener('resize', handleResize, {
            passive: false
        });
    }

    function status(): boolean {
        return active;
    }

    function stop(): void {
        if (!active) return;

        active = false;

        mutationObserver?.disconnect();

        mutationObserver = null;

        if (rafId) {
            cancelAnimationFrame(rafId);
        }

        window.removeEventListener('scroll', handleScroll);

        window.removeEventListener('resize', handleResize);

        document
            .querySelectorAll(`.${LABEL_CLASS}`)
            .forEach(el => el.remove());

        document
            .querySelectorAll<HTMLElement>(`[${ELEMENT_ATTR}]`)
            .forEach(el => {
                el.removeAttribute(ELEMENT_ATTR);
                el.style.outline = '';
                el.style.outlineOffset = '';
            });

        document.getElementById(STYLE_ID)?.remove();

        labelMap.clear();
    }

    window.__DOM_DEBUGGER__ = {
        start,
        stop,
        status
    };
})();
