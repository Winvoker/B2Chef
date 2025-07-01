// Conversation Manager Module
import { DOMUtils } from '../utils/dom-utils.js';
import { APIUtils } from '../utils/api-utils.js';
import { CONFIG } from '../config.js';

export class ConversationManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.conversationsCache = [];
        this.elements = {
            chatHistory: DOMUtils.getElementById('chatHistory')
        };
    }

    async loadConversations() {
        try {
            const conversations = await APIUtils.get(CONFIG.API.CONVERSATIONS);
            this.conversationsCache = conversations;
            this.renderConversations();
        } catch (error) {
            console.error('Error loading conversations:', error);
        }
    }

    renderConversations() {
        if (!this.elements.chatHistory) return;

        this.elements.chatHistory.innerHTML = '';

        this.conversationsCache.forEach(conv => {
            const listItem = this.createConversationItem(conv);
            this.elements.chatHistory.appendChild(listItem);
        });
    }

    createConversationItem(conversation) {
        const listItem = document.createElement('li');
        listItem.className = 'p-2 hover:bg-gray-700 rounded cursor-pointer chat-history-item';

        if (conversation.is_deleted) {
            DOMUtils.addClass(listItem, 'hidden-chat');
        }

        // Create container for icon and title
        const leftContent = document.createElement('div');
        leftContent.className = 'flex items-center flex-grow';

        // Add chat icon
        const icon = document.createElement('i');
        icon.className = 'fas fa-comment-alt mr-2 text-gray-400';
        leftContent.appendChild(icon);

        const titleSpan = document.createElement('span');
        titleSpan.textContent = conversation.title;
        leftContent.appendChild(titleSpan);

        leftContent.onclick = () => this.loadConversation(conversation.id);

        // Create controls
        const controls = this.createConversationControls(conversation.id, titleSpan, listItem);

        listItem.appendChild(leftContent);
        listItem.appendChild(controls);

        return listItem;
    }

    createConversationControls(conversationId, titleSpan, listItem) {
        const controls = document.createElement('div');
        controls.className = 'chat-history-controls';

        const renameBtn = document.createElement('button');
        renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
        renameBtn.onclick = (e) => {
            e.stopPropagation();
            this.renameConversation(conversationId, titleSpan);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteConversation(conversationId, listItem);
        };

        controls.appendChild(renameBtn);
        controls.appendChild(deleteBtn);

        return controls;
    } async loadConversation(conversationId) {
        try {
            const conversation = await APIUtils.get(CONFIG.API.CONVERSATION_DETAIL(conversationId));

            // Switch to chat view if needed
            if (!DOMUtils.hasClass(this.chatManager.elements.initialView, 'hidden')) {
                await this.chatManager.switchToChat();
            }

            // Clear current chat
            this.chatManager.elements.chatContainer.innerHTML = '';

            // Load messages
            conversation.messages.forEach(msg => {
                this.chatManager.addMessage(msg.role, msg.content);
            });

            this.chatManager.currentConversationId = conversationId;
            await this.saveConversationState();
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    } async deleteConversation(conversationId, listItem) {
        if (!confirm(CONFIG.MESSAGES.CONFIRM_DELETE)) return;

        try {
            const response = await fetch(CONFIG.API.CONVERSATION_DELETE(conversationId), {
                method: 'POST',
            });

            if (response.ok) {
                DOMUtils.addClass(listItem, 'hidden-chat');
                if (this.chatManager.currentConversationId === conversationId) {
                    this.chatManager.resetToInitialView();
                }
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    }

    async renameConversation(conversationId, titleElement) {
        const currentTitle = titleElement.textContent;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentTitle;
        input.className = 'bg-gray-700 text-white px-2 py-1 rounded w-full';

        const updateTitle = async (newTitle) => {
            try {
                await APIUtils.post(CONFIG.API.CONVERSATION_RENAME(conversationId), { title: newTitle });
            } catch (error) {
                console.error('Error renaming chat:', error);
                input.value = currentTitle;
            }
        };

        input.onblur = () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== currentTitle) {
                updateTitle(newTitle);
            }
            titleElement.textContent = input.value;
            input.parentElement.replaceChild(titleElement, input);
        };

        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            }
        };

        titleElement.parentElement.replaceChild(input, titleElement);
        input.focus();
    }

    async saveConversationState() {
        if (!this.chatManager.currentConversationId) return;

        try {
            await APIUtils.post(CONFIG.API.SAVE_CONVERSATION, {
                conversation_id: this.chatManager.currentConversationId,
                history: this.chatManager.conversationHistory
            });
        } catch (error) {
            console.error('Error saving conversation:', error);
        }
    }
}
