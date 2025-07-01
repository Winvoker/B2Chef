// Application Configuration
export const CONFIG = {
    // API endpoints
    API: {
        GENERATE_RECIPES_STREAM: '/generate_recipes_stream',
        GENERATE_RECIPES: '/generate_recipes',
        CONVERSATIONS: '/conversations',
        SAVE_CONVERSATION: '/save_conversation',
        CONVERSATION_DELETE: (id) => `/conversations/${id}/delete`,
        CONVERSATION_RENAME: (id) => `/conversations/${id}/rename`,
        CONVERSATION_DETAIL: (id) => `/conversations/${id}`
    },

    // UI settings
    UI: {
        SIDEBAR_MIN_WIDTH: 200,
        SIDEBAR_MAX_WIDTH: 500,
        ANIMATION_DURATION: 300,
        TYPING_SPEED: 50
    },

    // Messages
    MESSAGES: {
        ERROR_GENERAL: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
        ERROR_NETWORK: 'Bağlantı hatası. Lütfen internet bağlantınızı kontrol edin.',
        CONFIRM_DELETE: 'Are you sure you want to hide this chat?',
        LOADING: 'Yükleniyor...',
        THINKING: 'Düşünüyor...'
    },

    // Default prompts
    PROMPTS: {
        KITCHEN_COMMAND: (cuisine, recipeType) => `${cuisine} ${recipeType} önerir misin?`
    }
};
