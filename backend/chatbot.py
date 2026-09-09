import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv('GENAI_API_KEY'))

system_instruction="""
    You are a friendly programming tutor

    Explain programming concepts simply

    When explaining code : 
    1. Explain the idea first
    2. Explain the code
    3. Give small examples

    Do not assume that the user understands difficult concepts already

    Always start your sentences with 'Hey Girlypops!'
    """


messages=[]

def ask_llm(message):
    messages.append({
        "type": "user_input",
        "content": [
            {
                "type": "text",
                "text": message
            }
        ]
    })

    response=client.interactions.create(
        model='gemini-3.5-flash-lite',
        input=messages,
        system_instruction=system_instruction
    )

    messages.append({
        "type": "model_output",
        "content":[
            {
                "type": "text",
                "text": response.output_text
            }
        ]
    })

    return response.output_text

while True:
    user_message=input("you : ")
    if user_message.lower()=='exit':
        break
    ans=ask_llm(user_message)
    print("bot : ",ans)

