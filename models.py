from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class Conversation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_deleted = db.Column(db.Boolean, default=False)  # Add this line
    messages = db.relationship(
        "Message", backref="conversation", lazy=True, cascade="all, delete-orphan"
    )


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(
        db.Integer, db.ForeignKey("conversation.id"), nullable=False
    )
    role = db.Column(db.String(50))  # 'user' or 'assistant'
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
