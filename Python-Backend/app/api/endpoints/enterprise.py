from fastapi import APIRouter, HTTPException
from app.schemas.domain_schemas import (
    EnterpriseAnalysisRequest,
    EnterpriseAnalysisResponse,
    EnterpriseChartRequest,
    EnterpriseChartResponse,
)
from app.services.rag.enterprise_workflow import enterprise_service

router = APIRouter()


@router.post("/analyze", response_model=EnterpriseAnalysisResponse)
async def enterprise_analyze(request: EnterpriseAnalysisRequest):
    try:
        if not request.vectorNamespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(
            f"\n[ENTERPRISE] {request.analysisType} on {len(request.vectorNamespaces)} document(s)"
        )

        result = await enterprise_service.run_enterprise_analysis(
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
        raise HTTPException(
            status_code=500, detail=f"Enterprise analysis failed: {str(e)}"
        )


@router.post("/charts", response_model=EnterpriseChartResponse)
async def enterprise_charts(request: EnterpriseChartRequest):
    try:
        if not request.vectorNamespaces:
            raise HTTPException(status_code=400, detail="No vector namespaces provided")

        print(
            f"\n[ENTERPRISE CHARTS] {request.analysisType} on {len(request.vectorNamespaces)} document(s)"
        )

        result = await enterprise_service.run_enterprise_charts(
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
        raise HTTPException(
            status_code=500, detail=f"Enterprise chart extraction failed: {str(e)}"
        )


@router.get("/analysis-types")
async def get_analysis_types():
    from app.core.prompts import ENTERPRISE_PROMPTS

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
