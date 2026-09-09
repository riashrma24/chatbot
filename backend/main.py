from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from chatbot import Chatbot

app = FastAPI()
chatbot=Chatbot()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.get('/')
def home():
    return {
        "message": "AI chatbot is running"
    }

@app.post("/chat")
def chat(request: ChatRequest):
    answer=chatbot.chat(request.message)
    return {
        "response": answer
    }