import os
from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(api_key=os.getenv('GENAI_API_KEY'))

messages = []

def ask_llm(message):
    messages.append(
        {
            "type":"user_input",
            "content":[
                {
                    "type": "text",
                    "text":user_message
                }
            ]
        }
    )

    response=client.interactions.create(
        model='gemini-3.5-flash-lite',
        input=messages
    )

    messages.append(
        {
            "type":"model_output",
            "content":[
                {
                    "type": "text",
                    "text":response.output_text
                }
            ]
        }
    )

    return response.output_text


while True:
    user_message=input("you : ")
    if user_message.lower() == 'exit':
        break
    ans=ask_llm(user_message)
    print("bot : ", ans)