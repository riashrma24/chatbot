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