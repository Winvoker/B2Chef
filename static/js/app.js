// Main Application - Modular Architecture
import { ChatManager } from './modules/chat-manager.js';
import { ConversationManager } from './modules/conversation-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { KitchenCommands } from './modules/kitchen-commands.js';
import { DOMUtils } from './utils/dom-utils.js';
import { CONFIG } from './config.js';
// Development utilities (only in dev mode)
import ModuleValidator from './dev-utils.js';

class B2ChefApp {
    constructor() {
        this.chatManager = null;
        this.conversationManager = null;
        this.uiManager = null;
        this.kitchenCommands = null;
    }

    async init() {
        // Initialize all modules
        this.chatManager = new ChatManager();
        this.conversationManager = new ConversationManager(this.chatManager);
        this.uiManager = new UIManager();
        this.kitchenCommands = new KitchenCommands(this.chatManager);

        // Connect chat manager with conversation manager
        this.chatManager.loadConversations = () => this.conversationManager.loadConversations();

        // Setup global functions for backwards compatibility
        this.setupGlobalFunctions();

        // Load initial data
        await this.conversationManager.loadConversations();

        console.log('B2Chef App initialized successfully');
    }

    setupGlobalFunctions() {
        // Make reset function available globally
        window.resetToInitialView = () => {
            this.chatManager.resetToInitialView();
        };

        // Make retry function available globally for onclick handlers
        window.retryMessage = (element) => {
            this.handleRetryMessage(element);
        };
    }

    async handleRetryMessage(element) {
        const messageContainer = element.closest('.message-container');
        if (!messageContainer) return;

        const messageIndex = Array.from(messageContainer.parentNode.children)
            .indexOf(messageContainer.parentNode);
        const previousMessages = this.chatManager.conversationHistory.slice(0, messageIndex + 1);

        this.chatManager.disableInput();
        const loadingId = Date.now();
        this.chatManager.showThinkingMessage(loadingId);

        try {
            await this.chatManager.sendStreamingRequest('', loadingId); // Retry with history
        } catch (error) {
            this.chatManager.handleError(error, loadingId);
        } finally {
            this.chatManager.enableInput();
        }
    }
}

// Initialize the application when the DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new B2ChefApp();
    await app.init();
});

// Export for potential external use
export default B2ChefApp;
