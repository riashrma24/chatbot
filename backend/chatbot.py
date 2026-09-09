import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client=genai.Client(
    api_key=os.getenv('GENAI_API_KEY')
)

def ask_llm(message):
    response=client.interactions.create(
        model="gemini-3.5-flash-lite",
        input=message
    )

    return response.output_text

while True:
    user_message=input("You : ")
    if user_message.lower() == 'exit':
        break
    answer=ask_llm(user_message)
    print("Bot : ",answer)
