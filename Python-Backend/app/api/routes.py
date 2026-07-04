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
    HealthResponse,
    EnterpriseAnalysisRequest,
    EnterpriseAnalysisResponse,
    EnterpriseChartRequest,
    EnterpriseChartResponse,
)
from app.services.document_processor import document_processor
from app.services.rag_service import rag_service
from app.services.vector_store import vector_store
import os

# Create API router
router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        message="Financial Analysis Python Service is running"
    )


@router.post("/process-document", response_model=ProcessDocumentResponse)
async def process_document(
    request: ProcessDocumentRequest,
    background_tasks: BackgroundTasks
):
    
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
        result = await rag_service.get_answer(
            question=request.question,
            chat_history=request.chatHistory,
            namespaces=request.vectorNamespaces,
            feature_mode=request.featureUsed
        )
        
        return QueryResponse(
            answer=result.get("answer", ""),
            citations=result.get("citations", []),
            documents=result.get("documents", {}),
            insights=result.get("insights", []),
            general=result.get("general", {}),
            visualizations=result.get("visualizations", []),
            analysisType=result.get("analysisType", None),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error processing query: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error: {str(e)}"  # Show actual error for debugging
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
async def delete_multiple_documents(request: dict):
    """
    Delete multiple documents endpoint
    Batch deletion for conversation cleanup
    
    Called by Node.js backend when a conversation is deleted
    """
    try:
        documents = request.get("documents", [])
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


@router.post("/audit-summary")
async def audit_summary(request: dict):
    """
    Structured financial data extraction endpoint.
    Returns key financial metrics as a JSON object,
    extracted strictly from the uploaded documents.

    Body: { "vectorNamespaces": ["ns1", "ns2", ...] }
    """
    try:
        namespaces = request.get("vectorNamespaces", [])
        if not namespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(f"\n[AUDIT] Extracting structured financials from {len(namespaces)} document(s)")

        json_str = await rag_service.get_audit_summary(namespaces)

        import json
        try:
            parsed = json.loads(json_str)
        except Exception:
            parsed = {"raw": json_str, "parse_error": "LLM returned non-JSON output"}

        return {"status": "ok", "data": parsed}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Audit summary endpoint failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Audit summary failed: {str(e)}"
        )


@router.post("/enterprise/analyze", response_model=EnterpriseAnalysisResponse)
async def enterprise_analyze(request: EnterpriseAnalysisRequest):
    """
    Enterprise financial analysis endpoint.
    Supports: executive_summary, financial_ratios, swot_analysis,
    risk_analysis, company_comparison, multi_document_comparison,
    kpi_extraction, explain_mode, trend_analysis, report_generator
    """
    try:
        if not request.vectorNamespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(f"\n[ENTERPRISE] {request.analysisType} on {len(request.vectorNamespaces)} document(s)")

        result = await rag_service.run_enterprise_analysis(
            analysis_type=request.analysisType,
            namespaces=request.vectorNamespaces,
            question=request.question,
            chat_history=request.chatHistory,
        )

        return EnterpriseAnalysisResponse(
            analysisType=result.get("analysisType", request.analysisType),
            answer=result.get("answer", ""),
            citations=result.get("citations", []),
            documents=result.get("documents", {}),
            insights=result.get("insights", []),
            general=result.get("general", {}),
            visualizations=result.get("visualizations", []),
            metadata=result.get("metadata", {}),
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Enterprise analysis failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enterprise analysis failed: {str(e)}")


@router.post("/enterprise/charts", response_model=EnterpriseChartResponse)
async def enterprise_charts(request: EnterpriseChartRequest):
    """
    Enterprise chart extraction endpoint.
    Returns only visualization payloads for mode-specific enterprise analysis.
    """
    try:
        if not request.vectorNamespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(f"\n[ENTERPRISE CHARTS] {request.analysisType} on {len(request.vectorNamespaces)} document(s)")

        result = await rag_service.run_enterprise_charts(
            analysis_type=request.analysisType,
            namespaces=request.vectorNamespaces,
            question=request.question,
            chat_history=request.chatHistory,
        )

        return EnterpriseChartResponse(
            analysisType=request.analysisType,
            visualizations=result.get("visualizations", []),
            metadata=result.get("metadata", {}),
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Enterprise chart extraction failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Enterprise chart extraction failed: {str(e)}")


@router.get("/enterprise/analysis-types")
async def get_analysis_types():
    """Return supported enterprise analysis types."""
    from app.config.prompts import ENTERPRISE_PROMPTS
    return {
        "analysisTypes": list(ENTERPRISE_PROMPTS.keys()),
        "descriptions": {
            "executive_summary": "Board-ready executive summary",
            "financial_ratios": "Financial ratio calculation and interpretation",
            "swot_analysis": "Document-grounded SWOT analysis",
            "risk_analysis": "Financial and operational risk assessment",
            "company_comparison": "Compare companies or periods",
            "multi_document_comparison": "Cross-document comparison",
            "kpi_extraction": "Extract key financial KPIs",
            "explain_mode": "Plain-language financial explanations",
            "trend_analysis": "Time-series trend identification",
            "report_generator": "Comprehensive analysis report",
        },
    }

