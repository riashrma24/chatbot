from sqlalchemy import Boolean
from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import Text
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__="users"
    id=Column(
        Integer,
        primary_key=True
    )
    name=Column(
        String
    )
    email=Column(
        String,
        unique=True
    )

class Conversation(Base):
    __tablename__="conversations"
    id=Column(
        Integer,
        primary_key=True
    )
    user_id=Column(
        Integer,
        ForeignKey("users.id")
    )
    title=Column(
        String
    )

class Message(Base):
    __tablename__="messages"
    id=Column(
        Integer,
        primary_key=True
    )
    conversation_id=Column(
        Integer,
        ForeignKey("conversations.id")
    )
    role=Column(
        String
    )
    content=Column(
        Text
    )


# --- Site content: this is the app's actual data (what real pages render
# from), and it is also what the chatbot is grounded on. There is no
# separate "chatbot config" — the chatbot reads the same tables the pages
# do, live, on every question. See content.py.

class Page(Base):
    __tablename__ = "pages"
    id = Column(Integer, primary_key=True)
    path = Column(String, unique=True)
    title = Column(String)
    nav_label = Column(String)
    nav_order = Column(Integer, default=0)


class ContentBlock(Base):
    """A chunk of body copy belonging to a page, e.g. the Home hero text or
    the About page's mission statement. A page can have several blocks."""

    __tablename__ = "content_blocks"
    id = Column(Integer, primary_key=True)
    page_path = Column(String, ForeignKey("pages.path"))
    heading = Column(String)
    body = Column(Text)
    keywords = Column(String)


class PricingPlan(Base):
    __tablename__ = "pricing_plans"
    id = Column(Integer, primary_key=True)
    name = Column(String)
    price_cents = Column(Integer, nullable=True)
    billing_period = Column(String, default="month")
    messages_per_month = Column(Integer, nullable=True)
    features = Column(String)
    is_custom_pricing = Column(Boolean, default=False)


class ContactInfo(Base):
    __tablename__ = "contact_info"
    id = Column(Integer, primary_key=True)
    email = Column(String)
    phone = Column(String, nullable=True)
    hours = Column(String)