// Kitchen Commands Module
import { DOMUtils } from '../utils/dom-utils.js';
import { CONFIG } from '../config.js';

export class KitchenCommands {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.setupGlobalFunction();
    }

    setupGlobalFunction() {
        // Make sendKitchenCommand available globally for onclick handlers
        window.sendKitchenCommand = (cuisine, recipeType) => {
            this.sendKitchenCommand(cuisine, recipeType);
        };
    }

    async sendKitchenCommand(cuisine, recipeType) {
        try {
            const userMessage = CONFIG.PROMPTS.KITCHEN_COMMAND(cuisine, recipeType);
            const isInitialView = !DOMUtils.hasClass(this.chatManager.elements.initialView, 'hidden');

            if (isInitialView) {
                // Start a new conversation
                this.chatManager.currentConversationId = null;
                this.chatManager.conversationHistory = [];
                await this.chatManager.switchToChat();
            }

            await this.chatManager.sendMessage(userMessage);
        } catch (error) {
            console.error('Error sending kitchen command:', error);
            this.chatManager.addMessage('ai', CONFIG.MESSAGES.ERROR_GENERAL);
        }
    }
}
