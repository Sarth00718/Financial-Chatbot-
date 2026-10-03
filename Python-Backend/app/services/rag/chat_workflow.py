from typing import List, Dict
import traceback
import json
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.services.rag.core import RAGCore
from app.core.prompts import (
    SMART_CHAT_PROMPT,
    DOCUMENT_ANALYSIS_PROMPT,
    ANALYTICAL_INSIGHTS_PROMPT,
    GENERAL_CONVERSATION_PROMPT,
    INTENT_CLASSIFICATION_PROMPT,
    GENERAL_FINANCE_PROMPT,
    FINANCIAL_TEMPLATE_PROMPT,
    ENTERPRISE_PROMPTS
)

class RAGChatService(RAGCore):
    """
    RAG Service for standard chat, routing, and enterprise analysis.
    """

    async def _classify_intent(self, question: str) -> dict:
        prompt = PromptTemplate.from_template(INTENT_CLASSIFICATION_PROMPT)
        chain = prompt | self.llm | StrOutputParser()
        raw_answer = chain.invoke({"question": question})
        parsed = self._parse_json_output(raw_answer)
        if isinstance(parsed, dict) and "intent" in parsed:
            return parsed
        return {"intent": "general_conversation", "requires_document_context": False}

    async def smart_chat(self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]) -> Dict:
        print("\n[MODE] Smart Chat Mode -> Intent Classification")
        intent_data = await self._classify_intent(question)
        intent = intent_data.get("intent", "general_conversation")
        requires_rag = intent_data.get("requires_document_context", True)

        print(f"  [INTENT] {intent} (Requires RAG: {requires_rag})")

        # Route Enterprise Intents directly
        if intent in ENTERPRISE_PROMPTS:
            return await self.enterprise_analysis(intent, question, chat_history, namespaces)

        # Route Non-RAG Intents
        if not requires_rag:
            if intent == "general_finance":
                return await self.general_finance(question, chat_history)
            if intent == "financial_template":
                return await self.financial_template(question, chat_history)
            return await self.general_conversation(question, chat_history)

        # Fallback to standard Smart Chat Document Q&A
        relevant_docs, context, error_resp = self._get_document_context(question, namespaces)
        if error_resp:
            return error_resp

        history = self._format_chat_history(chat_history)
        return await self._run_rag_chain(
            SMART_CHAT_PROMPT,
            {"context": context, "chat_history": history, "question": question},
            relevant_docs,
        )

    async def document_analysis(self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]) -> Dict:
        relevant_docs, context, error_resp = self._get_document_context(question, namespaces)
        if error_resp:
            return error_resp

        return await self._run_rag_chain(
            DOCUMENT_ANALYSIS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )

    async def analytical_insights(self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]) -> Dict:
        relevant_docs, context, error_resp = self._get_document_context(question, namespaces)
        if error_resp:
            return error_resp

        return await self._run_rag_chain(
            ANALYTICAL_INSIGHTS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )

    async def enterprise_analysis(self, analysis_type: str, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]) -> Dict:
        print(f"\n[MODE] Enterprise Analysis: {analysis_type}")
        
        default_questions = {
            "executive_summary": "Provide a comprehensive executive summary of the financial documents.",
            "financial_ratios": "Calculate and interpret all available financial ratios.",
            "swot_analysis": "Perform a complete SWOT analysis based on the documents.",
            "risk_analysis": "Identify and assess all financial and operational risks.",
            "company_comparison": "Compare financial performance across companies or periods in the documents.",
            "multi_document_comparison": "Compare data across all uploaded documents and highlight discrepancies.",
            "kpi_extraction": "Extract all key financial KPIs from the documents.",
            "explain_mode": question or "Explain the key financial concepts in these documents.",
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
        relevant_docs, context, error_resp = self._get_document_context(search_query, namespaces)
        if error_resp:
            error_resp["metadata"] = {"analysisType": analysis_type}
            return error_resp

        prompt_template = ENTERPRISE_PROMPTS[analysis_type]
        variables = {
            "context": context,
            "question": effective_question,
            "analysis_type": analysis_type,
        }
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = await self._run_rag_chain(prompt_template, variables, relevant_docs, strict_json=True)
        result["metadata"] = {
            "analysisType": analysis_type,
            "documentsAnalyzed": len(namespaces),
            "chunksRetrieved": len(relevant_docs),
        }
        result["analysisType"] = analysis_type
        return result

    async def enterprise_charts(self, analysis_type: str, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]) -> Dict:
        from app.core.prompts import ENTERPRISE_CHARTS_PROMPT
        if not namespaces:
            return {"analysisType": analysis_type, "visualizations": [], "metadata": {"error": "no_documents"}, "citations": []}

        effective_question = question.strip() or "Generate visualization payloads for this analysis."
        relevant_docs, context, error_resp = self._get_document_context(effective_question, namespaces)
        if error_resp:
            return {"analysisType": analysis_type, "visualizations": [], "metadata": error_resp, "citations": []}

        variables = {
            "context": context,
            "question": effective_question,
            "analysis_type": analysis_type,
        }
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = await self._run_rag_chain(ENTERPRISE_CHARTS_PROMPT, variables, relevant_docs, strict_json=True)
        return {
            "analysisType": analysis_type,
            "visualizations": result.get("visualizations", []),
            "metadata": result.get("metadata", {}),
            "citations": result.get("citations", []),
        }

    async def _run_non_rag(self, prompt_template: str, question: str, chat_history: List[Dict[str, str]]) -> Dict:
        history = self._format_chat_history(chat_history)
        prompt = PromptTemplate.from_template(prompt_template)
        chain = prompt | self.llm | StrOutputParser()
        raw_answer = await chain.ainvoke({"chat_history": history, "question": question})

        parsed = self._parse_json_output(raw_answer)
        if isinstance(parsed, dict):
            return {
                "answer": parsed.get("answer", raw_answer),
                "citations": [],
                "documents": parsed.get("documents", {}),
                "insights": parsed.get("insights", {}),
                "general": parsed.get("general", {}),
                "visualizations": parsed.get("visualizations", []),
            }
        
        return {
            "answer": raw_answer,
            "citations": [],
            "documents": {},
            "insights": {},
            "general": {},
            "visualizations": [],
        }

    async def general_conversation(self, question: str, chat_history: List[Dict[str, str]]) -> Dict:
        print("\n[MODE] General Conversation Mode")
        return await self._run_non_rag(GENERAL_CONVERSATION_PROMPT, question, chat_history)

    async def general_finance(self, question: str, chat_history: List[Dict[str, str]]) -> Dict:
        print("\n[MODE] General Finance Mode")
        return await self._run_non_rag(GENERAL_FINANCE_PROMPT, question, chat_history)

    async def financial_template(self, question: str, chat_history: List[Dict[str, str]]) -> Dict:
        print("\n[MODE] Financial Template Mode")
        return await self._run_non_rag(FINANCIAL_TEMPLATE_PROMPT, question, chat_history)

    async def get_answer(self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str], feature_mode: str) -> Dict:
        print(f"\n{'='*60}")
        print(f"[QUERY] New Request")
        print(f"  Mode: {feature_mode}")
        print(f"  Question: {question[:100]}...")
        print(f"  Documents: {len(namespaces)}")
        print(f"{'='*60}")

        try:
            # Check if it's an enterprise feature directly
            if feature_mode in ENTERPRISE_PROMPTS:
                result = await self.enterprise_analysis(feature_mode, question, chat_history, namespaces)
            elif feature_mode == "Smart_Chat":
                result = await self.smart_chat(question, chat_history, namespaces)
            elif feature_mode == "Document_Analysis":
                result = await self.document_analysis(question, chat_history, namespaces)
            elif feature_mode == "Analytical_Insights":
                result = await self.analytical_insights(question, chat_history, namespaces)
            elif feature_mode == "General_Conversation":
                result = await self.general_conversation(question, chat_history)
            else:
                print(f"[WARNING] Unknown mode '{feature_mode}', using Smart Chat")
                result = await self.smart_chat(question, chat_history, namespaces)

            print(f"\n{'='*60}")
            print(f"[OK] Query completed successfully")
            print(f"{'='*60}\n")
            return result

        except Exception as e:
            print(f"\n[ERROR] Error generating answer: {e}")
            traceback.print_exc()
            return {
                "answer": "I encountered an error while processing your question. Please try again or rephrase your question.",
                "citations": [],
            }

chat_service = RAGChatService()
