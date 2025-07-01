let conversationHistory = [];
let currentConversationId = null;

document.addEventListener('DOMContentLoaded', function () {
    const moreButton = document.getElementById('moreButton');
    const moreDropdown = document.getElementById('moreDropdown');

    // Toggle dropdown
    moreButton.addEventListener('click', (e) => {
        e.stopPropagation();
        moreDropdown.classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        moreDropdown.classList.add('hidden');
    });

    // Prevent dropdown from closing when clicking inside it
    moreDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    const leftPane = document.getElementById('leftPane');
    const resizableHandle = document.getElementById('resizableHandle');
    let isResizing = false;

    resizableHandle.addEventListener('mousedown', function (e) {
        isResizing = true;
        document.body.classList.add('resizing');
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isResizing) return;

        const minWidth = 200;
        const maxWidth = 500;
        let newWidth = e.clientX;

        // Constrain width between min and max
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

        // Update sidebar width with all CSS properties
        leftPane.style.width = `${newWidth}px`;
        leftPane.style.minWidth = `${newWidth}px`;
        leftPane.style.maxWidth = `${Math.max(newWidth, 500)}px`;
    });

    document.addEventListener('mouseup', function () {
        isResizing = false;
        document.body.classList.remove('resizing');
    });
});

// Initial input handler
document.getElementById('initialInput').addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const message = this.value.trim();
        if (message) {
            this.value = '';
            // Ensure we start a new conversation
            currentConversationId = null;
            conversationHistory = [];
            const initialView = document.getElementById('initialView');
            const chatContainer = document.getElementById('chatContainer');
            const chatInput = document.getElementById('chatInput');
            initialView.classList.add('fade-out');
            setTimeout(async () => {
                handleInitialMessage(message, initialView, chatContainer, chatInput);
            }, 300);
        }
    }
});

document.getElementById('chatForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    if (message) {
        input.value = '';
        await handleChatMessage(message);
    }
});

function disableInput() {
    const messageInput = document.getElementById('messageInput');
    const initialInput = document.getElementById('initialInput');
    const chatForm = document.getElementById('chatForm');

    messageInput.disabled = true;
    initialInput.disabled = true;
    messageInput.classList.add('input-disabled');
    initialInput.classList.add('input-disabled');
    chatForm.classList.add('input-disabled');
}

function enableInput() {
    const messageInput = document.getElementById('messageInput');
    const initialInput = document.getElementById('initialInput');
    const chatForm = document.getElementById('chatForm');

    messageInput.disabled = false;
    initialInput.disabled = false;
    messageInput.classList.remove('input-disabled');
    initialInput.classList.remove('input-disabled');
    chatForm.classList.remove('input-disabled');
}

function addThinkingMessage(loadingId) {
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

async function handleInitialMessage(message, initialView, chatContainer, chatInput) {
    initialView.classList.add('hidden');
    chatContainer.classList.remove('hidden');
    chatInput.classList.remove('hidden');
    void chatContainer.offsetWidth;
    void chatInput.offsetWidth;
    chatContainer.classList.add('visible');
    chatInput.classList.add('visible');
    addMessage('user', message);
    conversationHistory.push({ role: "user", content: message });
    disableInput();
    const loadingId = Date.now();
    chatContainer.insertAdjacentHTML('beforeend', addThinkingMessage(loadingId));
    try {
        const response = await sendRequest(message);
        handleApiResponse(response, loadingId);
    } catch (error) {
        handleApiError(error, loadingId);
    } finally {
        enableInput();
    }
    document.getElementById('messageInput').focus();
}

async function handleChatMessage(message) {
    addMessage('user', message);
    conversationHistory.push({ role: "user", content: message });
    disableInput();
    const loadingId = Date.now();
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.insertAdjacentHTML('beforeend', addThinkingMessage(loadingId));
    try {
        const response = await sendRequest(message);
        handleApiResponse(response, loadingId);
    } catch (error) {
        handleApiError(error, loadingId);
    } finally {
        enableInput();
    }
}

async function sendRequest(message) {
    // Use streaming instead of regular request
    return await sendStreamingRequest(message);
}

async function sendStreamingRequest(message) {
    return new Promise((resolve, reject) => {
        fetch('/generate_recipes_stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: message,
                conversation_id: currentConversationId,
                history: conversationHistory
            })
        }).then(response => {
            if (!response.ok) throw new Error('Network response was not ok');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let aiMessageElement = null;
            let fullResponse = '';

            function readStream() {
                reader.read().then(({ done, value }) => {
                    if (done) {
                        loadConversations();
                        resolve({ response: fullResponse, conversation_id: currentConversationId });
                        return;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                if (data.type === 'conversation_id') {
                                    currentConversationId = data.conversation_id;
                                } else if (data.type === 'content') {
                                    if (!aiMessageElement) {
                                        // Create AI message element on first content
                                        aiMessageElement = createStreamingAIMessage();
                                    }
                                    fullResponse += data.content;
                                    updateStreamingMessage(aiMessageElement, fullResponse);
                                } else if (data.type === 'done') {
                                    conversationHistory.push({ role: "assistant", content: fullResponse });
                                    if (aiMessageElement) {
                                        aiMessageElement.classList.remove('streaming');
                                        // Remove the cursor when streaming is done
                                        const cursor = aiMessageElement.querySelector('.cursor');
                                        if (cursor) {
                                            cursor.remove();
                                        }
                                        // Now parse markdown for the final content
                                        updateStreamingMessage(aiMessageElement, fullResponse);
                                    }
                                } else if (data.type === 'error') {
                                    reject(new Error(data.error));
                                    return;
                                }
                            } catch (e) {
                                console.error('Error parsing SSE data:', e);
                            }
                        }
                    }

                    readStream();
                }).catch(reject);
            }

            readStream();
        }).catch(reject);
    });
}

async function sendRequestWithHistory(previousMessages) {
    try {
        const response = await fetch('/generate_recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversation_id: currentConversationId,
                history: previousMessages
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        currentConversationId = data.conversation_id;
        loadConversations();
        return data;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

async function sendKitchenCommand(cuisine, recipeType) {
    try {
        const userMessage = `${cuisine} ${recipeType} önerir misin?`;
        const isInitialView = !document.getElementById('initialView').classList.contains('hidden');

        if (isInitialView) {
            // If we're in initial view, start a new conversation
            currentConversationId = null;
            conversationHistory = [];
            switchToChat();
        }

        addMessage('user', userMessage);
        conversationHistory.push({ role: "user", content: userMessage });
        disableInput();
        const loadingId = Date.now();
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.insertAdjacentHTML('beforeend', addThinkingMessage(loadingId));

        // Use streaming request instead of regular fetch
        const response = await sendStreamingRequest(userMessage);
        currentConversationId = response.conversation_id;
        await loadConversations(); // Ensure chat history is updated
    } catch (error) {
        console.error('Error:', error);
        addMessage('ai', 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
        enableInput();
    }
}

function handleApiResponse(data, loadingId) {
    // For streaming, the loading message is already removed and content is already added
    // This function now mainly handles non-streaming responses (if any)
    const loadingMessage = document.querySelector(`[data-message-id="${loadingId}"]`);
    if (loadingMessage) {
        loadingMessage.remove();
        // Only add message if it wasn't already handled by streaming
        if (data.response && !document.querySelector('.streaming')) {
            conversationHistory.push({ role: "assistant", content: data.response });
            addMessage('ai', data.response);
        }
    }
}

function handleApiError(error, loadingId) {
    console.error('Error:', error);
    const loadingMessage = document.querySelector(`[data-message-id="${loadingId}"]`);
    if (loadingMessage) loadingMessage.remove();
    addMessage('ai', 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
}

function switchToChat() {
    const initialView = document.getElementById('initialView');
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');

    // Reset conversation state
    currentConversationId = null;
    conversationHistory = [];

    // If we're already in chat view, reset to initial view
    if (!initialView.classList.contains('hidden')) {
        initialView.classList.add('fade-out');
        setTimeout(() => {
            initialView.classList.add('hidden');
            chatContainer.classList.remove('hidden');
            chatInput.classList.remove('hidden');
            chatContainer.classList.add('visible');
            chatInput.classList.add('visible');
        }, 300);
    } else {
        resetToInitialView();
    }
}

function resetToInitialView() {
    const initialView = document.getElementById('initialView');
    const chatContainer = document.getElementById('chatContainer');
    const chatInput = document.getElementById('chatInput');

    // Clear current conversation ID to ensure new conversation is created
    currentConversationId = null;

    // Clear conversation history
    conversationHistory = [];

    // Clear chat container
    chatContainer.innerHTML = '';

    // Reset input
    document.getElementById('initialInput').value = '';
    document.getElementById('messageInput').value = '';

    // Fade out chat view
    chatContainer.classList.remove('visible');
    chatInput.classList.remove('visible');

    setTimeout(() => {
        chatContainer.classList.add('hidden');
        chatInput.classList.add('hidden');
        initialView.classList.remove('hidden', 'fade-out');

        // Trigger reflow for animation
        void initialView.offsetWidth;

        // Focus on initial input
        document.getElementById('initialInput').focus();
    }, 300);
}

async function saveConversationState() {
    try {
        await fetch('/save_conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversation_id: currentConversationId,
                history: conversationHistory
            })
        });
    } catch (error) {
        console.error('Error saving conversation:', error);
    }
}

function addMessage(sender, text, messageId = null) {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.querySelectorAll('.latest').forEach(el => el.classList.remove('latest'));
    const messageDiv = document.createElement('div');
    if (messageId) {
        messageDiv.setAttribute('data-message-id', messageId);
    }
    const formattedText = marked.parse(text); // Always use marked.parse to render markdown
    if (sender === 'user') {
        messageDiv.innerHTML = `
            <div class="flex justify-end">
                <div class="user-message">
                    ${formattedText}
                </div>
            </div>
        `;
    } else {
        messageDiv.innerHTML = `
            <div class="flex items-start space-x-4">
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
    chatContainer.appendChild(messageDiv);
    messageDiv.scrollIntoView({ behavior: 'smooth' });
}

async function loadConversations() {
    try {
        const response = await fetch('/conversations');
        const conversations = await response.json();
        const chatHistory = document.getElementById('chatHistory');
        chatHistory.innerHTML = '';

        conversations.forEach(conv => {
            const listItem = document.createElement('li');
            listItem.className = 'p-2 hover:bg-gray-700 rounded cursor-pointer chat-history-item';
            if (conv.is_deleted) {
                listItem.classList.add('hidden-chat');
            }

            // Create container for icon and title
            const leftContent = document.createElement('div');
            leftContent.className = 'flex items-center flex-grow';

            // Add chat icon
            const icon = document.createElement('i');
            icon.className = 'fas fa-comment-alt mr-2 text-gray-400';
            leftContent.appendChild(icon);

            const titleSpan = document.createElement('span');
            titleSpan.textContent = conv.title;
            leftContent.appendChild(titleSpan);

            leftContent.onclick = () => loadConversation(conv.id);

            const controls = document.createElement('div');
            controls.className = 'chat-history-controls';

            const renameBtn = document.createElement('button');
            renameBtn.innerHTML = '<i class="fas fa-edit"></i>';
            renameBtn.onclick = (e) => {
                e.stopPropagation();
                renameChat(conv.id, titleSpan);
            };

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteChat(conv.id, listItem);
            };

            controls.appendChild(renameBtn);
            controls.appendChild(deleteBtn);

            listItem.appendChild(leftContent);
            listItem.appendChild(controls);
            chatHistory.appendChild(listItem);
        });
    } catch (error) {
        console.error('Error loading conversations:', error);
    }
}

async function deleteChat(chatId, listItem) {
    if (confirm('Are you sure you want to hide this chat?')) {
        try {
            const response = await fetch(`/conversations/${chatId}/delete`, {
                method: 'POST',
            });
            if (response.ok) {
                listItem.classList.add('hidden-chat');
                if (currentConversationId === chatId) {
                    resetToInitialView();
                }
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    }
}

function renameChat(chatId, titleElement) {
    const currentTitle = titleElement.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTitle;
    input.className = 'bg-gray-700 text-white px-2 py-1 rounded w-full';

    async function updateTitle(newTitle) {
        try {
            const response = await fetch(`/conversations/${chatId}/rename`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title: newTitle })
            });
            if (!response.ok) {
                throw new Error('Failed to rename chat');
            }
        } catch (error) {
            console.error('Error renaming chat:', error);
            // Revert to original title on error
            input.value = currentTitle;
        }
    }

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

async function loadConversation(conversationId) {
    try {
        const response = await fetch(`/conversations/${conversationId}`);
        const conversation = await response.json();
        if (!document.getElementById('initialView').classList.contains('hidden')) {
            switchToChat();
        }
        const chatContainer = document.getElementById('chatContainer');
        chatContainer.innerHTML = '';
        conversation.messages.forEach(msg => {
            addMessage(msg.role, msg.content);
        });
        currentConversationId = conversationId;

        // Save the conversation state
        saveConversationState();
    } catch (error) {
        console.error('Error loading conversation:', error);
    }
}

function retryMessage(element) {
    const messageContainer = element.closest('.message-container');
    const messageContent = messageContainer.querySelector('.ai-message').innerText;
    const messageIndex = Array.from(messageContainer.parentNode.children).indexOf(messageContainer);
    const previousMessages = conversationHistory.slice(0, messageIndex + 1);
    handleRetryMessage(previousMessages);
}

async function handleRetryMessage(previousMessages) {
    disableInput();
    const loadingId = Date.now();
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.insertAdjacentHTML('beforeend', addThinkingMessage(loadingId));
    try {
        const response = await sendRequestWithHistory(previousMessages);
        handleApiResponse(response, loadingId);
    } catch (error) {
        handleApiError(error, loadingId);
    } finally {
        enableInput();
    }
}

function createStreamingAIMessage() {
    const chatContainer = document.getElementById('chatContainer');

    // Remove any existing loading message
    const existingLoading = chatContainer.querySelector('[data-message-id]');
    if (existingLoading) {
        existingLoading.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'flex items-start space-x-4 streaming';
    messageDiv.innerHTML = `
        <div class="w-8 h-8 rounded-full bg-gray-500 flex-shrink-0"></div>
        <div class="message-container ai-message-container latest">
            <div class="ai-message markdown-content">
                <span class="streaming-content"></span><span class="cursor">|</span>
            </div>
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    return messageDiv;
}

function updateStreamingMessage(messageElement, content) {
    const contentSpan = messageElement.querySelector('.streaming-content');
    const cursor = messageElement.querySelector('.cursor');

    if (contentSpan) {
        // For streaming, just use plain text to avoid markdown parsing issues
        // We'll parse markdown when streaming is complete
        if (messageElement.classList.contains('streaming')) {
            contentSpan.textContent = content;
        } else {
            // Parse markdown only when streaming is complete
            if (typeof marked !== 'undefined') {
                contentSpan.innerHTML = marked.parse(content);
            } else {
                contentSpan.textContent = content;
            }
        }
    }

    // Auto-scroll to bottom
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

document.addEventListener('DOMContentLoaded', loadConversations);
