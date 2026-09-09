# Phase 1

Your Python program
       ↓
OpenAI API
       ↓
GPT model
       ↓
response
       ↓
Your Python program

# Phase 2 - giving it memory
You are sending the previous conversation to the model every time.

messages
    ↓
user message
    ↓
LLM
    ↓
assistant message
    ↓
messages

# Phase 3 - giving the chatbot a usecase
System instructions
        +
Conversation history
        +
User question
        ↓
       LLM
        ↓
    Response

# Phase 4 - creating api for this

React
  ↓
HTTP
  ↓
FastAPI
  ↓
Chatbot
  ↓
OpenAI


# Phase 5 - test the fast api

# Phase 6 - create the React Frontend