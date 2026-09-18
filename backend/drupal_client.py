import html
import os
import re

import httpx

DRUPAL_BASE_URL = os.getenv("DRUPAL_BASE_URL", "http://drupal-chatbot.ddev.site:33000")


def _strip_html(markup: str) -> str:
    text = re.sub(r"<[^>]+>", " ", markup or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def fetch_pages():
    """Pull every published `page` node from Drupal's JSON:API and return it
    in the {path, title, body_text} shape content.py syncs into Page/ContentBlock."""
    response = httpx.get(f"{DRUPAL_BASE_URL}/jsonapi/node/page", timeout=10)
    response.raise_for_status()

    pages = []
    for node in response.json().get("data", []):
        attrs = node["attributes"]
        alias = (attrs.get("path") or {}).get("alias")
        nid = attrs.get("drupal_internal__nid")
        pages.append(
            {
                "path": alias or f"/node/{nid}",
                "title": attrs.get("title") or "",
                "body_text": _strip_html((attrs.get("body") or {}).get("value")),
            }
        )
    return pages
