from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.schemas.domain_schemas import (
    ProcessDocumentRequest,
    ProcessDocumentResponse,
    DeleteDocumentRequest,
)
from app.services.document_processor import document_processor
from app.services.vector_store import vector_store
from app.core.logger import logger
import os

router = APIRouter()


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest, background_tasks: BackgroundTasks
):
    try:
        logger.info(f"\n[REQUEST] Received document processing request")
        logger.info(f"Document ID: {request.documentId}")
        logger.info(f"File: {request.fileName}")

        if not os.path.exists(request.filePath):
            raise HTTPException(
                status_code=404, detail=f"File not found: {request.filePath}"
            )

        background_tasks.add_task(
            document_processor.process_document_pipeline,
            request.documentId,
            request.filePath,
            request.fileName,
            request.vectorNamespace,
        )

        return ProcessDocumentResponse(
            message="Document processing started successfully",
            documentId=request.documentId,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.info(f"[ERROR] Error starting document processing: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to start processing: {str(e)}"
        )


@router.post("/delete-document")
async def delete_document(request: DeleteDocumentRequest):
    try:
        print(f"\n[DELETE] Received document deletion request")
        print(f"Namespace: {request.vectorNamespace}")

        vector_deleted = vector_store.delete_vector_store(request.vectorNamespace)

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
            "fileDeleted": file_deleted,
        }

    except Exception as e:
        print(f"[ERROR] Error deleting document: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete document: {str(e)}"
        )


@router.post("/delete-documents")
async def delete_multiple_documents(request: dict):
    try:
        documents = request.get("documents", [])
        print(
            f"\n[DELETE] Received batch deletion request for {len(documents)} documents"
        )

        results = []
        for doc in documents:
            try:
                vector_deleted = vector_store.delete_vector_store(
                    doc.get("vectorNamespace", "")
                )

                file_path = doc.get("filePath", "")
                file_deleted = False
                if file_path and os.path.exists(file_path):
                    os.remove(file_path)
                    file_deleted = True

                results.append(
                    {
                        "namespace": doc.get("vectorNamespace"),
                        "success": True,
                        "vectorStoreDeleted": vector_deleted,
                        "fileDeleted": file_deleted,
                    }
                )

            except Exception as e:
                print(f"[WARNING] Error deleting document: {e}")
                results.append(
                    {
                        "namespace": doc.get("vectorNamespace"),
                        "success": False,
                        "error": str(e),
                    }
                )

        return {"message": f"Processed {len(documents)} deletions", "results": results}

    except Exception as e:
        print(f"[ERROR] Error in batch deletion: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete documents: {str(e)}"
        )
