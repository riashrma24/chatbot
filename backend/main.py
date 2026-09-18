import asyncio

from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chatbot import Chatbot
from database import engine, Base, get_db, SessionLocal
import content
import models

app = FastAPI()
chatbot = Chatbot()

Base.metadata.create_all(bind=engine)

with SessionLocal() as _db:
    if not content.sync_from_drupal(_db):
        content.seed_if_empty(_db)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str


def _get_or_create_conversation(db: Session, conversation_id, first_message: str):
    conversation = None
    if conversation_id is not None:
        conversation = db.get(models.Conversation, conversation_id)

    if conversation is None:
        conversation = models.Conversation(title=first_message[:50])
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    return conversation


def _assistant_turn_text(text, navigated_to):
    if text:
        return text
    if navigated_to:
        return f"(Navigated the visitor to {navigated_to}.)"
    return "(No response.)"


def _history_for_model(rows):
    return [
        {
            "role": "user" if m.role == "user" else "model",
            "parts": [{"text": m.content}],
        }
        for m in rows
    ]


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    db = SessionLocal()
    site_name = "Chat"

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")
            print("Received:", data)

            if msg_type == "init":
                site_name = (data.get("site") or {}).get("siteName", site_name)
                continue

            message = (data.get("message") or "").strip()
            if not message:
                continue

            site_context = {
                "siteName": site_name,
                "currentPath": data.get("currentPath"),
                "pages": content.build_knowledge_pages(db),
            }

            conversation = _get_or_create_conversation(
                db, data.get("conversation_id"), message
            )

            db.add(
                models.Message(
                    conversation_id=conversation.id,
                    role="user",
                    content=message,
                )
            )
            db.commit()

            history_rows = (
                db.query(models.Message)
                .filter(models.Message.conversation_id == conversation.id)
                .order_by(models.Message.id)
                .all()
            )
            history = _history_for_model(history_rows)

            await websocket.send_json(
                {"type": "conversation_id", "conversation_id": conversation.id}
            )

            full_response = ""
            navigated_to = None
            try:
                async for event in chatbot.chat_stream(history, site_context, message):
                    if event["type"] == "text":
                        full_response += event["content"]
                        await websocket.send_json(
                            {"type": "chunk", "content": event["content"]}
                        )
                    elif event["type"] == "navigate":
                        navigated_to = event["path"]
                        await websocket.send_json(
                            {"type": "navigate", "path": event["path"]}
                        )
            except Exception as exc:
                print(f"chat_stream failed: {exc}")
                await websocket.send_json(
                    {
                        "type": "error",
                        "message": "Sorry, something went wrong answering that. Please try again.",
                    }
                )
                continue

            db.add(
                models.Message(
                    conversation_id=conversation.id,
                    role="model",
                    content=_assistant_turn_text(full_response, navigated_to),
                )
            )
            db.commit()

            await websocket.send_json({"type": "done"})

    except WebSocketDisconnect:
        print("Client disconnected")
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "AI chatbot is running"}


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    """Non-streaming fallback endpoint, kept for simple integrations that
    can't use WebSockets."""
    conversation = _get_or_create_conversation(
        db, request.conversation_id, request.message
    )

    db.add(
        models.Message(
            conversation_id=conversation.id, role="user", content=request.message
        )
    )
    db.commit()

    history_rows = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation.id)
        .order_by(models.Message.id)
        .all()
    )
    history = _history_for_model(history_rows)

    site_context = {"pages": content.build_knowledge_pages(db)}
    answer = ""
    navigate_to = None

    async def _collect():
        nonlocal answer, navigate_to
        async for event in chatbot.chat_stream(history, site_context, request.message):
            if event["type"] == "text":
                answer += event["content"]
            elif event["type"] == "navigate":
                navigate_to = event["path"]

    asyncio.run(_collect())

    db.add(
        models.Message(
            conversation_id=conversation.id,
            role="model",
            content=_assistant_turn_text(answer, navigate_to),
        )
    )
    db.commit()

    return {
        "conversation_id": conversation.id,
        "response": answer,
        "navigate": navigate_to,
    }


@app.get("/pages")
def get_pages(db: Session = Depends(get_db)):
    return [
        {"path": p.path, "title": p.title, "navLabel": p.nav_label}
        for p in content.get_pages(db)
    ]


_CONTENT_PATHS = {
    "home": "/",
    "about": "about",
    "pricing": "pricing",
    "contact-us": "contact-us",
}


@app.get("/content/{slug}")
def get_page_content(slug: str, db: Session = Depends(get_db)):
    if slug not in _CONTENT_PATHS:
        return {"blocks": []}

    path = "/" + _CONTENT_PATHS[slug] if slug != "home" else "/"
    blocks = content.get_content_blocks(db, path)
    response = {
        "blocks": [{"heading": b.heading, "body": b.body} for b in blocks]
    }

    if path == "/pricing":
        response["plans"] = [
            {
                "name": p.name,
                "priceCents": p.price_cents,
                "billingPeriod": p.billing_period,
                "messagesPerMonth": p.messages_per_month,
                "features": p.features,
                "isCustomPricing": p.is_custom_pricing,
            }
            for p in content.get_pricing_plans(db)
        ]

    if path == "/contact-us":
        info = content.get_contact_info(db)
        response["contact"] = (
            {"email": info.email, "phone": info.phone, "hours": info.hours}
            if info
            else None
        )

    return response


@app.get("/conversations")
def list_conversations(db: Session = Depends(get_db)):
    rows = db.query(models.Conversation).order_by(models.Conversation.id.desc()).all()
    return [{"id": c.id, "title": c.title} for c in rows]


def _display_content(stored_content: str) -> str:
    if stored_content.startswith("(Navigated the visitor to ") or stored_content == "(No response.)":
        return ""
    return stored_content


@app.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conversation_id)
        .order_by(models.Message.id)
        .all()
    )
    return [
        {
            "role": "user" if m.role == "user" else "assistant",
            "content": m.content if m.role == "user" else _display_content(m.content),
        }
        for m in rows
    ]
