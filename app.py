from flask import Flask, request, jsonify, render_template, Response, stream_template
from flask_cors import CORS
from models import db, Conversation, Message
from generation import (
    generate_chat_response,
    fetch_fridge_items,
    generate_chat_response_stream,
)
import os
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")
CORS(app)

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    db.create_all()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/conversations", methods=["GET"])
def get_conversations():
    # Add filter for non-deleted conversations
    conversations = (
        Conversation.query.filter_by(is_deleted=False)
        .order_by(Conversation.created_at.desc())
        .all()
    )
    return jsonify(
        [
            {
                "id": conv.id,
                "title": conv.title,
                "created_at": conv.created_at.isoformat(),
            }
            for conv in conversations
        ]
    )


@app.route("/conversations/<int:conversation_id>", methods=["GET"])
def get_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    messages = [
        {"role": msg.role, "content": msg.content} for msg in conversation.messages
    ]
    return jsonify(
        {"id": conversation.id, "title": conversation.title, "messages": messages}
    )


@app.route("/generate_recipes", methods=["POST"])
def generate():
    data = request.json
    prompt = data.get("prompt", "")
    conversation_id = data.get("conversation_id")
    history = data.get("history", [])

    try:
        fridge_items = fetch_fridge_items()

        # Get or create conversation
        if conversation_id:
            conversation = Conversation.query.get(conversation_id)
        else:
            # Create new conversation with first message as title
            conversation = Conversation(title=prompt[:100])
            db.session.add(conversation)
            db.session.commit()

        # Save user message
        user_message = Message(
            conversation_id=conversation.id, role="user", content=prompt
        )
        db.session.add(user_message)
        db.session.commit()

        # Generate response
        conversation_history = history + [
            {"role": msg.role, "content": msg.content} for msg in conversation.messages
        ]
        response = generate_chat_response(prompt, fridge_items, conversation_history)

        # Save assistant message
        assistant_message = Message(
            conversation_id=conversation.id, role="assistant", content=response
        )
        db.session.add(assistant_message)
        db.session.commit()

        return jsonify({"conversation_id": conversation.id, "response": response})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/generate_recipes_stream", methods=["POST"])
def generate_stream():
    # Extract request data outside the generator to avoid context issues
    data = request.json
    prompt = data.get("prompt", "")
    conversation_id = data.get("conversation_id")
    history = data.get("history", [])

    def stream_response():
        with app.app_context():
            try:
                fridge_items = fetch_fridge_items()

                # Get or create conversation
                if conversation_id:
                    conversation = Conversation.query.get(conversation_id)
                else:
                    # Create new conversation with first message as title
                    conversation = Conversation(title=prompt[:100])
                    db.session.add(conversation)
                    db.session.commit()

                # Save user message
                user_message = Message(
                    conversation_id=conversation.id, role="user", content=prompt
                )
                db.session.add(user_message)
                db.session.commit()

                # Send conversation_id first
                yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation.id})}\n\n"

                # Generate streaming response
                conversation_history = history + [
                    {"role": msg.role, "content": msg.content}
                    for msg in conversation.messages
                ]

                full_response = ""
                for chunk in generate_chat_response_stream(
                    prompt, fridge_items, conversation_history
                ):
                    full_response += chunk
                    # Send each chunk as SSE
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"

                # Save complete assistant message to database
                assistant_message = Message(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=full_response,
                )
                db.session.add(assistant_message)
                db.session.commit()

                # Send completion signal
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                try:
                    db.session.rollback()
                except:
                    pass  # Ignore rollback errors if context is lost
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"

    return Response(
        stream_response(),
        mimetype="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# Add new endpoint for soft delete
@app.route("/conversations/<int:conversation_id>/delete", methods=["POST"])
def delete_conversation(conversation_id):
    conversation = Conversation.query.get_or_404(conversation_id)
    conversation.is_deleted = True
    db.session.commit()
    return jsonify({"success": True})


# Add new endpoint for rename
@app.route("/conversations/<int:conversation_id>/rename", methods=["POST"])
def rename_conversation(conversation_id):
    data = request.json
    new_title = data.get("title")
    if not new_title:
        return jsonify({"error": "Title is required"}), 400

    conversation = Conversation.query.get_or_404(conversation_id)
    conversation.title = new_title
    db.session.commit()
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True)
