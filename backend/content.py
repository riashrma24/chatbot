from sqlalchemy.orm import Session

import models


# ---- Per-component reads (each frontend page fetches only its own slice) --

def get_pages(db: Session):
    return db.query(models.Page).order_by(models.Page.nav_order).all()


def get_content_blocks(db: Session, page_path: str):
    return (
        db.query(models.ContentBlock)
        .filter(models.ContentBlock.page_path == page_path)
        .all()
    )


def get_pricing_plans(db: Session):
    return db.query(models.PricingPlan).all()


def get_contact_info(db: Session):
    return db.query(models.ContactInfo).first()


# ---- Chatbot grounding: aggregate every content-bearing table into the -----
# {path, title, description, keywords, content} shape chatbot.py's retrieval
# expects. This is the single place a new table/component gets registered so
# the assistant can answer questions about it — nothing here is specific to
# the chat feature, it's reading the exact same rows the pages render.

def _plan_to_text(plan):
    if plan.is_custom_pricing:
        price = "custom pricing (contact sales)"
    else:
        price = f"${(plan.price_cents or 0) / 100:.0f}/{plan.billing_period}"

    if plan.messages_per_month is None:
        quota = "unlimited messages"
    else:
        quota = f"{plan.messages_per_month} messages/{plan.billing_period}"

    return f"{plan.name} plan: {price}, {quota}. Features: {plan.features}"


def build_knowledge_pages(db: Session):
    pages = get_pages(db)
    knowledge = []

    for page in pages:
        blocks = get_content_blocks(db, page.path)
        content_parts = [f"{b.heading}: {b.body}" if b.heading else b.body for b in blocks]
        keywords = []
        for b in blocks:
            if b.keywords:
                keywords += [k.strip() for k in b.keywords.split(",") if k.strip()]

        if page.path == "/pricing":
            plans = get_pricing_plans(db)
            content_parts += [_plan_to_text(p) for p in plans]
            keywords += ["pricing", "plan", "cost", "price", "subscription", "trial"]

        if page.path == "/contact-us":
            info = get_contact_info(db)
            if info:
                contact_line = f"Support email: {info.email}. Support hours: {info.hours}."
                if info.phone:
                    contact_line += f" Phone: {info.phone}."
                content_parts.append(contact_line)
                keywords += ["contact", "email", "support", "phone", "hours", "reach"]

        knowledge.append(
            {
                "path": page.path,
                "title": page.title,
                "description": page.title,
                "keywords": keywords,
                "content": "\n".join(part for part in content_parts if part),
            }
        )

    return knowledge


# ---- Seed data: run once so the demo has real rows to query instead of an --
# empty database. A real app would populate these tables from an admin UI /
# CMS import instead.

def seed_if_empty(db: Session):
    if db.query(models.Page).count() > 0:
        return

    pages = [
        models.Page(path="/", title="Home", nav_label="Home", nav_order=0),
        models.Page(path="/pricing", title="Pricing", nav_label="Pricing", nav_order=1),
        models.Page(path="/about", title="About", nav_label="About", nav_order=2),
        models.Page(path="/contact-us", title="Contact Us", nav_label="Contact Us", nav_order=3),
    ]
    db.add_all(pages)
    db.flush()  # pages must exist before content_blocks' FK can reference them

    db.add(
        models.ContentBlock(
            page_path="/",
            heading="Acme Widgets",
            body=(
                "Acme Widgets builds embeddable AI chat widgets that any "
                "website can drop in to answer visitor questions and help "
                "them navigate the site, streamed in real time over a "
                "WebSocket connection."
            ),
            keywords="home, welcome, acme, overview, what is",
        )
    )

    db.add(
        models.ContentBlock(
            page_path="/about",
            heading="About Acme Widgets",
            body=(
                "Acme Widgets was founded in 2024. The team is fully remote "
                "and focused on making it easy for any website to add a "
                "helpful, on-brand AI assistant without building the "
                "infrastructure themselves."
            ),
            keywords="about, team, company, mission, who, founded, remote",
        )
    )

    db.add_all(
        [
            models.PricingPlan(
                name="Starter",
                price_cents=0,
                billing_period="month",
                messages_per_month=100,
                features="community support",
                is_custom_pricing=False,
            ),
            models.PricingPlan(
                name="Growth",
                price_cents=4900,
                billing_period="month",
                messages_per_month=5000,
                features="custom branding, 14-day free trial, no credit card required",
                is_custom_pricing=False,
            ),
            models.PricingPlan(
                name="Enterprise",
                price_cents=None,
                billing_period="month",
                messages_per_month=None,
                features="SSO, dedicated support",
                is_custom_pricing=True,
            ),
        ]
    )

    db.add(
        models.ContactInfo(
            email="support@acmewidgets.example",
            phone=None,
            hours="Monday to Friday, 9am-6pm ET",
        )
    )

    db.commit()
