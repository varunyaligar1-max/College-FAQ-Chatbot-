from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# --- User Schemas ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    role: Optional[str] = "student"  # "student" or "admin"

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    filename: str
    category: str
    uploaded_by: int
    uploaded_at: datetime
    status: str

    class Config:
        from_attributes = True


# --- Chat Message Schemas ---
class ChatMessageBase(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: str
    session_id: str
    sources: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Chat Session Schemas ---
class ChatSessionBase(BaseModel):
    title: str

class ChatSessionCreate(BaseModel):
    title: Optional[str] = "New Chat"

class ChatSessionResponse(ChatSessionBase):
    id: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- RAG Query Schema ---
class ChatQuery(BaseModel):
    session_id: str
    query: str
    category: Optional[str] = "all"  # "all", "rules", "syllabus", "fees", "hostel"
