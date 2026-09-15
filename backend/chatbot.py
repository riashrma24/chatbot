import os

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

MODEL_NAME = "gemini-3.6-flash"

NAVIGATE_FUNCTION = types.FunctionDeclaration(
    name="navigate_to_page",
    description=(
        "Navigate the visitor's browser to a page of the current website. "
        "Call this ONLY when the visitor gives an explicit navigation "
        "command — 'take me to X', 'go to X', 'open X', 'show me X' — and "
        "that page's path is present in the website pages list you were "
        "given. Do NOT call this for questions that merely relate to a "
        "page's topic (e.g. 'when was the company founded', 'how much is "
        "the Growth plan') — those are answered with text using the "
        "provided page content, even though that content lives on some "
        "page. Only call this when the visitor wants to move there "
        "themselves, not when they want information from it."
    ),
    parameters=types.Schema(
        type="OBJECT",
        properties={
            "path": types.Schema(
                type="STRING",
                description="The exact path to navigate to, e.g. /contact-us",
            )
        },
        required=["path"],
    ),
)


class Chatbot:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GENAI_API_KEY"))

    def _build_system_instruction(self, site_context):
        instruction = (
            "You are the AI support assistant embedded directly on this "
            "website. Answer questions about the website and its content "
            "using ONLY the information provided below. If the answer "
            "isn't in the provided information, say you're not sure and "
            "suggest the visitor use the contact page, rather than making "
            "something up.\n\n"
            "When the visitor gives an explicit navigation command (e.g. "
            "'take me to the pricing page', 'open the about page'), call "
            "the navigate_to_page function with its exact path instead of "
            "just describing it in text. Only navigate to paths that "
            "appear in the page list below.\n\n"
            "Any other question — including ones about the same topic as a "
            "page, like pricing, contact details, or company history — "
            "should be answered directly with text using the page content "
            "below. Do not navigate just because a recent turn navigated; "
            "decide each message on its own, based only on what THIS "
            "message is asking for.\n"
        )

        pages = (site_context or {}).get("pages") or []
        if not pages:
            instruction += (
                "\nNo page information has been provided for this website."
            )
            return instruction

        pages_desc = "\n".join(
            f"- path: {p.get('path')} | title: {p.get('title', '')} | "
            f"summary: {p.get('description', '')}"
            for p in pages
        )
        instruction += f"\nWebsite pages:\n{pages_desc}\n"

        current_path = (site_context or {}).get("currentPath")
        if current_path:
            instruction += f"\nThe visitor is currently viewing: {current_path}\n"

        return instruction

    def _relevant_page_content(self, site_context, message, max_pages=3):
        """Lightweight keyword-overlap retrieval: pulls the page bodies most
        relevant to the visitor's question into context, instead of dumping
        every page's full content into every request."""
        pages = (site_context or {}).get("pages") or []
        if not pages or not message:
            return ""

        words = {w.strip(".,!?").lower() for w in message.split() if len(w) > 2}
        if not words:
            return ""

        def score(page):
            haystack = " ".join(
                [
                    page.get("title", ""),
                    page.get("description", ""),
                    " ".join(page.get("keywords", []) or []),
                    page.get("content", ""),
                ]
            ).lower()
            return sum(1 for w in words if w in haystack)

        ranked = sorted(pages, key=score, reverse=True)
        top = [p for p in ranked if score(p) > 0][:max_pages]
        if not top:
            return ""

        blocks = "\n\n".join(
            f"### {p.get('title', p.get('path'))} ({p.get('path')})\n"
            f"{p.get('content') or p.get('description', '')}"
            for p in top
        )
        return f"\nRelevant page content for this question:\n{blocks}\n"

    async def chat_stream(self, history, site_context=None, latest_message=""):
        """Async generator. Yields:
        {"type": "text", "content": str} for streamed answer text
        {"type": "navigate", "path": str} when the model wants to redirect
        """
        system_instruction = self._build_system_instruction(
            site_context
        ) + self._relevant_page_content(site_context, latest_message)

        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[types.Tool(function_declarations=[NAVIGATE_FUNCTION])],
            temperature=0.2,
        )

        stream = await self.client.aio.models.generate_content_stream(
            model=MODEL_NAME,
            contents=history,
            config=config,
        )

        async for chunk in stream:
            if chunk.text:
                yield {"type": "text", "content": chunk.text}

            for call in chunk.function_calls or []:
                if call.name == "navigate_to_page" and call.args:
                    path = call.args.get("path")
                    if path:
                        yield {"type": "navigate", "path": path}
