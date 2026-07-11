import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.app.database import engine, Base
from backend.app.routers import auth, documents, chat

load_dotenv()

app = FastAPI(
    title="College FAQ Chatbot API",
    description="Full-stack production RAG API using Qdrant, Supabase PostgreSQL, and LLMs.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production, allow all for local development & pairing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)

@app.on_event("startup")
async def on_startup():
    # Initialize SQLAlchemy models asynchronously on startup
    print("Database: Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database: Tables initialized successfully.")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "College FAQ Chatbot API is running",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
