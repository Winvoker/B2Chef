CREATE TABLE IF NOT EXISTS conversation (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE  -- Add this line
);

CREATE TABLE IF NOT EXISTS message (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversation(id) ON DELETE CASCADE,
    role VARCHAR(50),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversation_created_at ON conversation(created_at DESC);
CREATE INDEX idx_message_conversation_id ON message(conversation_id);
CREATE INDEX idx_conversation_is_deleted ON conversation(is_deleted);  -- Add this index
