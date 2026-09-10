import os

from google import genai
from dotenv import load_dotenv

load_dotenv()

class Chatbot:
    def __init__(self):
        self.client=genai.Client(api_key=os.getenv('GENAI_API_KEY'))
        self.system_instruction="""
        You are a friendly programming tutor
        Explain concepts clearly and give examples whenever needed.
        Always start your sentences with 'Hey Girlypops!'
        """
        self.messages=[]
    
    def chat(self,message):
        self.messages.append({
            "type": "user_input",
            "content": [
                {
                    "type": "text",
                    "text": message
                }
            ]
        })

        response=self.client.interactions.create(
            model='gemini-3.5-flash-lite',
            input=self.messages,
            system_instruction=self.system_instruction
        )

        self.messages.append({
            "type": "model_output",
            "content": [
                {
                    "type": "text",
                    "text": response.output_text
                }
            ]
        })

        return response.output_text