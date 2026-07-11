from backend.app.services.qdrant_service import QdrantService
from backend.app.services.document_service import DocumentService
from backend.app.services.llm_service import LlmService

# Singleton instances initialized on import
qdrant_service = QdrantService()
document_service = DocumentService(qdrant_service)
llm_service = LlmService()

def get_qdrant_service() -> QdrantService:
    return qdrant_service

def get_document_service() -> DocumentService:
    return document_service

def get_llm_service() -> LlmService:
    return llm_service
