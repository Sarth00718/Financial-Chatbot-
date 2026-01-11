"""
API Routes
Defines all HTTP endpoints for the service
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.schemas import (
    ProcessDocumentRequest,
    ProcessDocumentResponse,
    QueryRequest,
    QueryResponse,
    DeleteDocumentRequest,
    HealthResponse
)
from app.services.document_processor import document_processor
from app.services.rag_service import rag_service
from app.services.vector_store import vector_store
import os

# Create API router
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint
    Verifies the service is running
    """
    return HealthResponse(
        status="healthy",
        message="FinChatBot Python AI Service is running"
    )


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks
):
    """
    Process a document endpoint
    Receives document info from Node.js backend and starts processing
    
    Processing happens in background:
    1. Extract text and images from PDF
    2. Generate embeddings
    3. Store in local vector database (FAISS)
    4. Notify Node.js backend when complete
    """
    try:
        print(f"\n[REQUEST] Received document processing request")
        print(f"Document ID: {request.documentId}")
        print(f"File: {request.fileName}")
        
        # Verify file exists
        if not os.path.exists(request.filePath):
            raise HTTPException(
                status_code=404,
                detail=f"File not found: {request.filePath}"
            )
        
        # Add processing task to background
        background_tasks.add_task(
            document_processor.process_document_pipeline,
            request.documentId,
            request.filePath,
            request.fileName,
            request.vectorNamespace
        )
        
        return ProcessDocumentResponse(
            message="Document processing started successfully",
            documentId=request.documentId
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error starting document processing: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start processing: {str(e)}"
        )


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    """
    Query endpoint
    Receives a question and returns an AI-generated answer
    
    Process:
    1. Retrieve relevant document chunks from vector store
    2. Format context and chat history
    3. Generate answer using LLM
    4. Return answer to user
    """
    try:
        print(f"\n[REQUEST] Received query request")
        print(f"Question: {request.question[:100]}...")
        
        # Validate input
        if not request.question or not request.question.strip():
            raise HTTPException(
                status_code=400,
                detail="Question cannot be empty"
            )
        
        # Get answer from RAG service
        answer = await rag_service.get_answer(
            question=request.question,
            chat_history=request.chatHistory,
            namespaces=request.vectorNamespaces,
            feature_mode=request.featureUsed
        )
        
        return QueryResponse(answer=answer)
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error processing query: {e}")
        raise HTTPException(
            status_code=500,
            detail="An error occurred while processing your question"
        )


@router.post("/delete-document")
async def delete_document(request: DeleteDocumentRequest):
    """
    Delete document endpoint
    Removes document file and vector store
    
    Called by Node.js backend when a document is deleted
    """
    try:
        print(f"\n[DELETE] Received document deletion request")
        print(f"Namespace: {request.vectorNamespace}")
        
        # Delete vector store
        vector_deleted = vector_store.delete_vector_store(request.vectorNamespace)
        
        # Delete file if it exists
        file_deleted = False
        if os.path.exists(request.filePath):
            try:
                os.remove(request.filePath)
                file_deleted = True
                print(f"[OK] File deleted: {request.filePath}")
            except Exception as e:
                print(f"[WARNING] Could not delete file: {e}")
        
        return {
            "message": "Document deletion completed",
            "vectorStoreDeleted": vector_deleted,
            "fileDeleted": file_deleted
        }
        
    except Exception as e:
        print(f"[ERROR] Error deleting document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/delete-documents")
async def delete_multiple_documents(documents: list):
    """
    Delete multiple documents endpoint
    Batch deletion for conversation cleanup
    
    Called by Node.js backend when a conversation is deleted
    """
    try:
        print(f"\n[DELETE] Received batch deletion request for {len(documents)} documents")
        
        results = []
        for doc in documents:
            try:
                # Delete vector store
                vector_deleted = vector_store.delete_vector_store(
                    doc.get("vectorNamespace", "")
                )
                
                # Delete file
                file_path = doc.get("filePath", "")
                file_deleted = False
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    file_deleted = True
                
                results.append({
                    "namespace": doc.get("vectorNamespace"),
                    "success": True,
                    "vectorStoreDeleted": vector_deleted,
                    "fileDeleted": file_deleted
                })
                
            except Exception as e:
                print(f"[WARNING] Error deleting document: {e}")
                results.append({
                    "namespace": doc.get("vectorNamespace"),
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "message": f"Processed {len(documents)} deletions",
            "results": results
        }
        
    except Exception as e:
        print(f"[ERROR] Error in batch deletion: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete documents: {str(e)}"
        )
