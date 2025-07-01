// Chat Manager Module
import { DOMUtils } from '../utils/dom-utils.js';
import { APIUtils } from '../utils/api-utils.js';
import { MessageUtils } from '../utils/message-utils.js';
import { CONFIG } from '../config.js';

export class ChatManager {
    constructor() {
        this.conversationHistory = [];
        this.currentConversationId = null;
        this.isInputDisabled = false;
        this.elements = this.initializeElements();
        this.setupEventListeners();
    }

    initializeElements() {
        return {
            initialView: DOMUtils.getElementById('initialView'),
            chatContainer: DOMUtils.getElementById('chatContainer'),
            chatInput: DOMUtils.getElementById('chatInput'),
            initialInput: DOMUtils.getElementById('initialInput'),
            messageInput: DOMUtils.getElementById('messageInput'),
            chatForm: DOMUtils.getElementById('chatForm')
        };
    }

    setupEventListeners() {
        // Initial input handler
        this.elements.initialInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleInitialInput();
            }
        });

        // Chat form handler
        this.elements.chatForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleChatInput();
        });
    }

    async handleInitialInput() {
        const message = this.elements.initialInput.value.trim();
        if (!message) return;

        this.elements.initialInput.value = '';
        this.currentConversationId = null;
        this.conversationHistory = [];

        await this.switchToChat();
        await this.sendMessage(message);
        this.elements.messageInput.focus();
    }

    async handleChatInput() {
        const message = this.elements.messageInput.value.trim();
        if (!message) return;

        this.elements.messageInput.value = '';
        await this.sendMessage(message);
    }

    async switchToChat() {
        await DOMUtils.fadeOut(this.elements.initialView);
        DOMUtils.removeClass(this.elements.chatContainer, 'hidden');
        DOMUtils.removeClass(this.elements.chatInput, 'hidden');
        await DOMUtils.fadeIn(this.elements.chatContainer);
        await DOMUtils.fadeIn(this.elements.chatInput);
    }

    async sendMessage(message) {
        this.addMessage('user', message);
        this.conversationHistory.push({ role: "user", content: message });

        this.disableInput();
        const loadingId = Date.now();
        this.showThinkingMessage(loadingId);

        try {
            await this.sendStreamingRequest(message, loadingId);
        } catch (error) {
            this.handleError(error, loadingId);
        } finally {
            this.enableInput();
        }
    }

    async sendStreamingRequest(message, loadingId) {
        const data = {
            prompt: message,
            conversation_id: this.currentConversationId,
            history: this.conversationHistory
        };

        let aiMessageElement = null;
        let fullResponse = '';

        return new Promise((resolve, reject) => {
            APIUtils.streamRequest(
                CONFIG.API.GENERATE_RECIPES_STREAM,
                data,
                (streamData) => {
                    const result = this.handleStreamData(streamData, aiMessageElement, fullResponse, loadingId);
                    if (result.aiMessageElement) aiMessageElement = result.aiMessageElement;
                    if (result.fullResponse !== undefined) fullResponse = result.fullResponse;
                },
                reject,
                () => {
                    this.loadConversations();
                    resolve({ response: fullResponse, conversation_id: this.currentConversationId });
                }
            );
        });
    }

    handleStreamData(data, aiMessageElement, fullResponse, loadingId) {
        if (data.type === 'conversation_id') {
            this.currentConversationId = data.conversation_id;
        } else if (data.type === 'content') {
            if (!aiMessageElement) {
                aiMessageElement = this.createStreamingMessage(loadingId);
            }
            fullResponse += data.content;
            MessageUtils.updateStreamingContent(aiMessageElement, fullResponse);
            DOMUtils.scrollToBottom(this.elements.chatContainer);
        } else if (data.type === 'done') {
            this.conversationHistory.push({ role: "assistant", content: fullResponse });
            if (aiMessageElement) {
                MessageUtils.updateStreamingContent(aiMessageElement, fullResponse, true);
            }
        } else if (data.type === 'error') {
            throw new Error(data.error);
        }

        return { aiMessageElement, fullResponse };
    }

    addMessage(sender, text, messageId = null) {
        // Remove 'latest' class from all messages
        this.elements.chatContainer.querySelectorAll('.latest').forEach(el =>
            DOMUtils.removeClass(el, 'latest')
        );

        const messageHTML = MessageUtils.createMessageHTML(sender, text, messageId);
        this.elements.chatContainer.insertAdjacentHTML('beforeend', messageHTML);

        const newMessage = this.elements.chatContainer.lastElementChild;
        DOMUtils.scrollIntoView(newMessage);
    }

    showThinkingMessage(loadingId) {
        const thinkingHTML = MessageUtils.createThinkingHTML(loadingId);
        this.elements.chatContainer.insertAdjacentHTML('beforeend', thinkingHTML);
    }

    createStreamingMessage(loadingId) {
        // Remove loading message
        const loadingMessage = DOMUtils.querySelector(`[data-message-id="${loadingId}"]`);
        if (loadingMessage) {
            loadingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-4 streaming';
        messageDiv.innerHTML = MessageUtils.createStreamingMessageHTML();

        this.elements.chatContainer.appendChild(messageDiv);
        DOMUtils.scrollToBottom(this.elements.chatContainer);

        return messageDiv;
    }

    disableInput() {
        this.isInputDisabled = true;
        [this.elements.messageInput, this.elements.initialInput].forEach(input => {
            if (input) {
                input.disabled = true;
                DOMUtils.addClass(input, 'input-disabled');
            }
        });
        if (this.elements.chatForm) {
            DOMUtils.addClass(this.elements.chatForm, 'input-disabled');
        }
    }

    enableInput() {
        this.isInputDisabled = false;
        [this.elements.messageInput, this.elements.initialInput].forEach(input => {
            if (input) {
                input.disabled = false;
                DOMUtils.removeClass(input, 'input-disabled');
            }
        });
        if (this.elements.chatForm) {
            DOMUtils.removeClass(this.elements.chatForm, 'input-disabled');
        }
    }

    handleError(error, loadingId) {
        console.error('Error:', error);
        const loadingMessage = DOMUtils.querySelector(`[data-message-id="${loadingId}"]`);
        if (loadingMessage) loadingMessage.remove();
        this.addMessage('ai', CONFIG.MESSAGES.ERROR_GENERAL);
    }

    resetToInitialView() {
        this.currentConversationId = null;
        this.conversationHistory = [];
        this.elements.chatContainer.innerHTML = '';

        this.elements.initialInput.value = '';
        this.elements.messageInput.value = '';

        DOMUtils.removeClass(this.elements.chatContainer, 'visible');
        DOMUtils.removeClass(this.elements.chatInput, 'visible');

        setTimeout(() => {
            DOMUtils.addClass(this.elements.chatContainer, 'hidden');
            DOMUtils.addClass(this.elements.chatInput, 'hidden');
            DOMUtils.removeClass(this.elements.initialView, 'hidden');
            DOMUtils.removeClass(this.elements.initialView, 'fade-out');

            // Focus on initial input
            this.elements.initialInput.focus();
        }, 300);
    }

    async loadConversations() {
        // This will be implemented by ConversationManager
        console.log('Loading conversations...');
    }
}
