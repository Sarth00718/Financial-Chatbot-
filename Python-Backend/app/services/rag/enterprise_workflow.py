from typing import List, Dict

from app.services.rag.core import RAGCore
from app.core.prompts import ENTERPRISE_PROMPTS, ENTERPRISE_CHARTS_PROMPT


class RAGEnterpriseService(RAGCore):
    """
    RAG Service specifically for complex enterprise financial analysis.
    """

    async def run_enterprise_analysis(
        self,
        analysis_type: str,
        namespaces: List[str],
        question: str = "",
        chat_history: List[Dict[str, str]] = None,
    ) -> Dict:
        chat_history = chat_history or []
        analysis_type = analysis_type.lower().strip()

        if analysis_type not in ENTERPRISE_PROMPTS:
            return {
                "answer": f"Unknown analysis type: {analysis_type}. "
                f"Supported: {', '.join(ENTERPRISE_PROMPTS.keys())}",
                "citations": [],
                "metadata": {"error": "invalid_analysis_type"},
            }

        if not namespaces:
            return {
                "answer": "Please upload financial documents before running this analysis.",
                "citations": [],
                "metadata": {"error": "no_documents"},
            }

        default_questions = {
            "executive_summary": "Provide a comprehensive executive summary of the financial documents.",
            "financial_ratios": "Calculate and interpret all available financial ratios.",
            "swot_analysis": "Perform a complete SWOT analysis based on the documents.",
            "risk_analysis": "Identify and assess all financial and operational risks.",
            "company_comparison": "Compare financial performance across companies or periods in the documents.",
            "multi_document_comparison": "Compare data across all uploaded documents and highlight discrepancies.",
            "kpi_extraction": "Extract all key financial KPIs from the documents.",
            "explain_mode": question
            or "Explain the key financial concepts in these documents.",
            "trend_analysis": "Analyze financial trends across all available time periods.",
            "report_generator": "Generate a comprehensive financial analysis report.",
        }

        effective_question = question.strip() or default_questions.get(
            analysis_type, "Analyze the uploaded financial documents."
        )

        retrieval_queries = {
            "executive_summary": "revenue profit income assets liabilities cash flow overview summary",
            "financial_ratios": "revenue gross profit operating income net income assets liabilities equity margins",
            "swot_analysis": "strengths weaknesses opportunities threats competitive advantage risk strategy",
            "risk_analysis": "risk uncertainty volatility debt compliance regulatory market credit liquidity",
            "company_comparison": "revenue profit comparison segment performance year over year",
            "multi_document_comparison": "revenue income assets comparison period financial data",
            "kpi_extraction": "revenue EBITDA EPS margin ROE ROA cash flow KPI metric",
            "trend_analysis": "quarterly annual revenue income trend growth decline period",
            "report_generator": "financial performance revenue income balance sheet cash flow",
        }

        search_query = retrieval_queries.get(analysis_type, effective_question)
        relevant_docs = self._retrieve_context(search_query, namespaces)

        if not relevant_docs:
            return {
                "answer": "No relevant financial data found in the uploaded documents for this analysis.",
                "citations": [],
                "metadata": {"analysisType": analysis_type},
            }

        context = self._format_documents(relevant_docs)
        prompt_template = ENTERPRISE_PROMPTS[analysis_type]

        variables = {
            "context": context,
            "question": effective_question,
            "analysis_type": analysis_type,
        }
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = self._run_rag_chain(
            prompt_template, variables, relevant_docs, strict_json=True
        )
        result["metadata"] = {
            "analysisType": analysis_type,
            "documentsAnalyzed": len(namespaces),
            "chunksRetrieved": len(relevant_docs),
        }
        result["analysisType"] = analysis_type
        return result

    async def run_enterprise_charts(
        self,
        analysis_type: str,
        namespaces: List[str],
        question: str = "",
        chat_history: List[Dict[str, str]] = None,
    ) -> Dict:
        chat_history = chat_history or []
        analysis_type = analysis_type.lower().strip()

        if analysis_type not in ENTERPRISE_PROMPTS:
            return {
                "analysisType": analysis_type,
                "visualizations": [],
                "metadata": {"error": "invalid_analysis_type"},
                "citations": [],
            }

        if not namespaces:
            return {
                "analysisType": analysis_type,
                "visualizations": [],
                "metadata": {"error": "no_documents"},
                "citations": [],
            }

        effective_question = (
            question.strip() or "Generate visualization payloads for this analysis."
        )
        relevant_docs = self._retrieve_context(effective_question, namespaces)

        if not relevant_docs:
            return {
                "analysisType": analysis_type,
                "visualizations": [],
                "metadata": {"analysisType": analysis_type},
                "citations": [],
            }

        context = self._format_documents(relevant_docs)
        variables = {
            "context": context,
            "question": effective_question,
            "analysis_type": analysis_type,
        }
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = self._run_rag_chain(
            ENTERPRISE_CHARTS_PROMPT, variables, relevant_docs, strict_json=True
        )
        result["metadata"] = {
            "analysisType": analysis_type,
            "documentsAnalyzed": len(namespaces),
            "chunksRetrieved": len(relevant_docs),
        }
        result["analysisType"] = analysis_type
        return {
            "analysisType": analysis_type,
            "visualizations": result.get("visualizations", []),
            "metadata": result.get("metadata", {}),
            "citations": result.get("citations", []),
        }


enterprise_service = RAGEnterpriseService()
