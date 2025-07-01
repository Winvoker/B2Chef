// Message Utilities
export class MessageUtils {
    static createMessageHTML(sender, text, messageId = null) {
        const formattedText = typeof marked !== 'undefined' ? marked.parse(text) : text;

        if (sender === 'user') {
            return `
                <div class="flex justify-end" ${messageId ? `data-message-id="${messageId}"` : ''}>
                    <div class="user-message">
                        ${formattedText}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="flex items-start space-x-4" ${messageId ? `data-message-id="${messageId}"` : ''}>
                    <div class="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0"></div>
                    <div class="message-container ai-message-container latest">
                        <div class="ai-message markdown-content">
                            ${formattedText}
                        </div>
                        <div class="flex items-center space-x-2 text-gray-400 text-sm mt-2 message-actions">
                            <i class="fas fa-volume-up cursor-pointer"></i>
                            <i class="fas fa-thumbs-up cursor-pointer"></i>
                            <i class="fas fa-thumbs-down cursor-pointer"></i>
                            <i class="fas fa-sync-alt cursor-pointer"></i>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    static createThinkingHTML(loadingId) {
        return `
            <div class="flex items-start space-x-4" data-message-id="${loadingId}">
                <div class="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0"></div>
                <div class="message-container ai-message-container latest">
                    <div class="ai-message markdown-content">
                        <div class="thinking">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static createStreamingMessageHTML() {
        return `
            <div class="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0"></div>
            <div class="message-container ai-message-container latest">
                <div class="ai-message markdown-content">
                    <span class="streaming-content"></span><span class="cursor">|</span>
                </div>
            </div>
        `;
    }

    static updateStreamingContent(messageElement, content, isComplete = false) {
        const contentSpan = messageElement.querySelector('.streaming-content');
        const cursor = messageElement.querySelector('.cursor');

        if (contentSpan) {
            if (isComplete) {
                // Parse markdown when streaming is complete
                if (typeof marked !== 'undefined') {
                    contentSpan.innerHTML = marked.parse(content);
                } else {
                    contentSpan.textContent = content;
                }
                if (cursor) cursor.remove();
                messageElement.classList.remove('streaming');
            } else {
                // Just use plain text during streaming
                contentSpan.textContent = content;
            }
        }
    }
}
