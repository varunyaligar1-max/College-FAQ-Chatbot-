from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from backend.app.database import get_db
from backend.app.models import User, ChatSession, ChatMessage
from backend.app.schemas import ChatSessionResponse, ChatMessageResponse, ChatQuery, ChatSessionCreate
from backend.app.utils.auth import get_current_user
from backend.app.dependencies import get_qdrant_service, get_llm_service
from backend.app.services.qdrant_service import QdrantService
from backend.app.services.llm_service import LlmService

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    return result.scalars().all()

@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_in: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    db_session = ChatSession(
        user_id=current_user.id,
        title=session_in.title or "New Chat"
    )
    db.add(db_session)
    await db.commit()
    await db.refresh(db_session)
    return db_session

@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def list_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify session exists and belongs to the user
    session_result = await db.execute(
        select(ChatSession).where((ChatSession.id == session_id) & (ChatSession.user_id == current_user.id))
    )
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )
        
    messages_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return messages_result.scalars().all()

@router.post("/query", response_model=ChatMessageResponse)
async def query_chatbot(
    chat_query: ChatQuery,
    current_user: User = Depends(get_current_user),
    qdrant_service: QdrantService = Depends(get_qdrant_service),
    llm_service: LlmService = Depends(get_llm_service),
    db: AsyncSession = Depends(get_db)
):
    # Verify session exists and belongs to the user
    session_result = await db.execute(
        select(ChatSession).where((ChatSession.id == chat_query.session_id) & (ChatSession.user_id == current_user.id))
    )
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found or access denied."
        )

    # 1. Retrieve relevant chunks from Qdrant
    hits = await qdrant_service.search_relevant_chunks(
        query=chat_query.query,
        category=chat_query.category,
        limit=4
    )

    # 2. Call LLM to generate grounded answer
    answer, sources = await llm_service.generate_grounded_answer(
        query=chat_query.query,
        retrieved_chunks=hits
    )

    # Update session title if it was the default "New Chat" and this is the first query
    count_result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == chat_query.session_id)
    )
    is_first_message = len(count_result.scalars().all()) == 0
    if is_first_message and session.title == "New Chat":
        # Truncate query to create a neat title
        session.title = chat_query.query[:40] + "..." if len(chat_query.query) > 40 else chat_query.query
        db.add(session)

    # 3. Save User message to Postgres
    user_message = ChatMessage(
        session_id=chat_query.session_id,
        role="user",
        content=chat_query.query,
        sources=None
    )
    db.add(user_message)

    # 4. Save Assistant message to Postgres
    assistant_message = ChatMessage(
        session_id=chat_query.session_id,
        role="assistant",
        content=answer,
        sources=sources
    )
    db.add(assistant_message)

    await db.commit()
    await db.refresh(assistant_message)
    return assistant_message
