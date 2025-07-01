// DOM Utilities
export class DOMUtils {
    static getElementById(id) {
        return document.getElementById(id);
    }

    static querySelector(selector) {
        return document.querySelector(selector);
    }

    static querySelectorAll(selector) {
        return document.querySelectorAll(selector);
    }

    static addClass(element, className) {
        if (element) {
            element.classList.add(className);
        }
    }

    static removeClass(element, className) {
        if (element) {
            element.classList.remove(className);
        }
    }

    static toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    static hasClass(element, className) {
        return element ? element.classList.contains(className) : false;
    }

    static setStyle(element, property, value) {
        if (element) {
            element.style[property] = value;
        }
    }

    static fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.classList.add('fade-out');
            setTimeout(() => {
                element.classList.add('hidden');
                resolve();
            }, duration);
        });
    }

    static fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.classList.remove('hidden');
            // Trigger reflow
            void element.offsetWidth;
            element.classList.add('visible');
            setTimeout(resolve, duration);
        });
    }

    static scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    static scrollIntoView(element, options = { behavior: 'smooth' }) {
        if (element) {
            element.scrollIntoView(options);
        }
    }
}
