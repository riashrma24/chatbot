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
    
    def chat(self,history):
        response=self.client.interactions.create(
            model='gemini-3.5-flash-lite',
            input=history,
            system_instruction=self.system_instruction
        )

        return response.output_text