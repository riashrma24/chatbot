from fastapi import FastAPI,Depends
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chatbot import Chatbot
from database import engine, Base, get_db
import models

app = FastAPI()
chatbot=Chatbot()

Base.metadata.create_all(
    bind=engine
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    conversation_id: int | None = None
    message: str

@app.get('/')
def home():
    return {
        "message": "AI chatbot is running"
    }

@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if request.conversation_id is None:
        conversation = models.Conversation(title=request.message[:50])
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    else:
        conversation=db.query(models.Conversation).get(request.conversation_id)

    db.add(models.Message(
        conversation_id=conversation.id,
        role="user",
        content=request.message
    ))
    db.commit()

    history_rows = (
        db.query(models.Message)
        .filter(models.Message.conversation_id==conversation.id)
        .order_by(models.Message.id)
        .all()
    )
    history=[
        {"type": "user_input" if m.role=="user" else "model_output",
        "content": [{"type": "text", "text": m.content}]}
        for m in history_rows
    ]
    answer=chatbot.chat(history)

    db.add(models.Message(
        conversation_id=conversation.id,
        role="model",
        content=answer
    ))
    db.commit()
    return {
        "conversation_id": conversation.id,"response": answer
    }

@app.get("/conversations")
def list_conversations(db: Session = Depends(get_db)):
    rows = db.query(models.Conversation).order_by(models.Conversation.id.desc()).all()
    return [{"id": c.id, "title": c.title} for c in rows]

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
            "role": "user" if m.role=='user' else "assistant","content":m.content
        }for m in rows
    ]