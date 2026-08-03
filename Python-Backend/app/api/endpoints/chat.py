from fastapi import APIRouter, HTTPException
from app.schemas.domain_schemas import QueryRequest, QueryResponse
from app.services.rag.chat_workflow import chat_service
from app.services.rag.audit_workflow import audit_service

router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def query_documents(request: QueryRequest):
    try:
        print(f"\n[REQUEST] Received query request")
        print(f"Question: {request.question[:100]}...")

        if not request.question or not request.question.strip():
            raise HTTPException(status_code=400, detail="Question cannot be empty")

        result = await chat_service.get_answer(
            question=request.question,
            chat_history=request.chatHistory,
            namespaces=request.vectorNamespaces,
            feature_mode=request.featureUsed,
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
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/audit-summary")
async def audit_summary(request: dict):
    try:
        namespaces = request.get("vectorNamespaces", [])
        if not namespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(
            f"\n[AUDIT] Extracting structured financials from {len(namespaces)} document(s)"
        )

        json_str = await audit_service.get_audit_summary(namespaces)

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
        raise HTTPException(status_code=500, detail=f"Audit summary failed: {str(e)}")
