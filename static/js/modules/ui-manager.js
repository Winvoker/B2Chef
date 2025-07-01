// UI Manager Module
import { DOMUtils } from '../utils/dom-utils.js';
import { CONFIG } from '../config.js';

export class UIManager {
    constructor() {
        this.elements = this.initializeElements();
        this.setupEventListeners();
        this.setupResizing();
    }

    initializeElements() {
        return {
            moreButton: DOMUtils.getElementById('moreButton'),
            moreDropdown: DOMUtils.getElementById('moreDropdown'),
            leftPane: DOMUtils.getElementById('leftPane'),
            resizableHandle: DOMUtils.getElementById('resizableHandle')
        };
    }

    setupEventListeners() {
        // Dropdown functionality
        this.elements.moreButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            DOMUtils.toggleClass(this.elements.moreDropdown, 'hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            DOMUtils.addClass(this.elements.moreDropdown, 'hidden');
        });

        // Prevent dropdown from closing when clicking inside it
        this.elements.moreDropdown?.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    setupResizing() {
        let isResizing = false;

        this.elements.resizableHandle?.addEventListener('mousedown', (e) => {
            isResizing = true;
            DOMUtils.addClass(document.body, 'resizing');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing || !this.elements.leftPane) return;

            const minWidth = CONFIG.UI.SIDEBAR_MIN_WIDTH;
            const maxWidth = CONFIG.UI.SIDEBAR_MAX_WIDTH;
            let newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX));

            // Update sidebar width
            DOMUtils.setStyle(this.elements.leftPane, 'width', `${newWidth}px`);
            DOMUtils.setStyle(this.elements.leftPane, 'minWidth', `${newWidth}px`);
            DOMUtils.setStyle(this.elements.leftPane, 'maxWidth', `${Math.max(newWidth, maxWidth)}px`);
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                DOMUtils.removeClass(document.body, 'resizing');
            }
        });
    }
}
