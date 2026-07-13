from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from backend.app.database import get_db
from backend.app.models import User, Document
from backend.app.schemas import DocumentResponse
from backend.app.utils.auth import get_admin_user
from backend.app.dependencies import get_document_service
from backend.app.services.document_service import DocumentService

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form(...),  # "rules", "syllabus", "fees", "hostel"
    branch: str = Form("Common"),
    current_admin: User = Depends(get_admin_user),
    document_service: DocumentService = Depends(get_document_service),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx", "doc", "txt"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, DOCX, DOC and TXT files are allowed."
        )
    
    # Validate category
    category = category.lower()
    if category not in ["rules", "syllabus", "fees", "hostel"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid category. Choose from: rules, syllabus, fees, hostel."
        )
    
    file_bytes = await file.read()
    
    # Ingest document text, chunk it, embed and store in Qdrant
    db_doc = await document_service.ingest_document(
        db=db,
        filename=filename,
        category=category,
        file_bytes=file_bytes,
        user_id=current_admin.id,
        branch=branch
    )
    
    if db_doc.status == "failed":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse, chunk and ingest document."
        )
    
    return db_doc

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    return result.scalars().all()

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_document(
    id: int,
    current_admin: User = Depends(get_admin_user),
    document_service: DocumentService = Depends(get_document_service),
    db: AsyncSession = Depends(get_db)
):
    success = await document_service.delete_document(db, id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or deletion failed."
        )
    return {"detail": "Document and associated vectors successfully deleted."}
