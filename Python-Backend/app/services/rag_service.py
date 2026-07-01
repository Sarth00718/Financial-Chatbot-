"""
RAG (Retrieval Augmented Generation) Service
Handles question answering using document context
Simplified version with clear logic flow
"""

from typing import List, Dict
import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

from app.config.settings import settings
from app.config.prompts import (
    SMART_CHAT_PROMPT,
    DOCUMENT_ANALYSIS_PROMPT,
    ANALYTICAL_INSIGHTS_PROMPT,
    GENERAL_CONVERSATION_PROMPT,
    AUDIT_SUMMARY_PROMPT,
    ENTERPRISE_PROMPTS,
    ENTERPRISE_RESPONSE_INSTRUCTIONS,
    ENTERPRISE_CHARTS_PROMPT,
)
from app.services.vector_store import vector_store
import traceback


class RAGService:
    """
    Retrieval Augmented Generation Service
    Answers questions using relevant document context
    """
    
    def __init__(self):
        """Initialize RAG service with LLM"""
        self.llm = ChatOpenAI(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=2000,  # Limit response length to save credits
            openai_api_key=settings.GROQ_API_KEY,
            openai_api_base="https://api.groq.com/openai/v1",
        )
    
    def _format_documents(self, docs: List[Document]) -> str:
        """
        Format retrieved documents into a single context string.
        Includes page type metadata so the LLM knows whether content
        came from plain text, OCR, vision description, or table extraction.
        """
        if not docs:
            return "No relevant context was found in the uploaded documents."

        parts = []
        for doc in docs:
            meta  = doc.metadata or {}
            page  = meta.get("page", "N/A")
            dtype = meta.get("type", "text")     # text / image / scanned_page
            src   = meta.get("source", "")

            # Build a context header that helps the LLM understand origin
            if dtype == "image":
                header = f"[Page {page} — Chart/Image Description]"
            elif dtype == "scanned_page":
                header = f"[Page {page} — Scanned Page (Vision-extracted)]"
            elif "table" in src.lower() or "[TABLE" in doc.page_content:
                header = f"[Page {page} — Table Extraction]"
            else:
                header = f"[Page {page}]"

            parts.append(f"{header}\n{doc.page_content}")

        return "\n\n---\n\n".join(parts)

    def _build_citations(self, docs: List[Document]) -> List[Dict]:
        """Build deduplicated citation objects from retrieved document chunks."""
        citations = []
        seen = set()

        for doc in docs:
            meta = doc.metadata or {}
            page = str(meta.get("page", "N/A"))
            source = meta.get("source", "")
            dtype = meta.get("type", "text")
            namespace = meta.get("namespace", "")
            key = (page, source, namespace)

            if key in seen:
                continue
            seen.add(key)

            content = doc.page_content or ""
            snippet = content[:300] + "..." if len(content) > 300 else content

            citations.append({
                "page": page,
                "source": source,
                "type": dtype,
                "snippet": snippet,
                "namespace": namespace,
            })

        return citations
    
    def _format_chat_history(self, chat_history: List[Dict[str, str]]) -> str:
        """
        Format chat history into a readable string
        
        Args:
            chat_history: List of previous messages
            
        Returns:
            Formatted chat history string
        """
        if not chat_history:
            return "No previous conversation."
        
        # Format each message
        formatted = "\n".join([
            f"{msg.get('role', 'unknown').capitalize()}: {msg.get('content', '')}"
            for msg in chat_history
        ])
        
        return formatted

    def _clean_json_text(self, text: str) -> str:
        if not isinstance(text, str):
            return text
        cleaned = text.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[len('```json'):].strip()
        if cleaned.startswith('```'):
            cleaned = cleaned[3:].strip()
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3].strip()
        return cleaned

    def _extract_json_segment(self, text: str):
        if not isinstance(text, str):
            return None

        cleaned = text.strip()
        braces = ['{', '[']
        for start in range(len(cleaned)):
            if cleaned[start] not in braces:
                continue
            segment = self._extract_balanced_segment(cleaned, start)
            if not segment:
                continue
            try:
                return json.loads(segment)
            except Exception:
                continue
        return None

    def _extract_balanced_segment(self, text: str, start_index: int):
        open_char = text[start_index]
        close_char = '}' if open_char == '{' else ']'
        stack = []
        in_string = False
        escape = False

        for i in range(start_index, len(text)):
            char = text[i]
            if escape:
                escape = False
                continue
            if char == '\\':
                escape = True
                continue
            if char == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if char == open_char:
                stack.append(close_char)
            elif char == close_char:
                if not stack:
                    return None
                stack.pop()
                if not stack:
                    return text[start_index:i + 1]
        return None

    def _parse_json_output(self, raw_answer: str):
        cleaned = self._clean_json_text(raw_answer)
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try to extract a raw JSON object or array from the text
        segment = self._extract_json_segment(cleaned)
        if segment is not None:
            return segment

        return None
    
    def _expand_query(self, query: str) -> str:
        """
        Simplify / expand query by removing common conversational fillers
        to improve similarity search matching in vector DB.
        """
        stop_words = {
            "what", "is", "are", "the", "a", "an", "of", "in", "on", "for", 
            "to", "with", "about", "describe", "summarize", "list", "show", 
            "give", "me", "how", "why", "where", "when", "who", "please", 
            "can", "you", "tell", "explain", "info", "information", "find",
            "document", "documents", "pdf", "file", "files", "uploaded"
        }
        words = [w for w in query.lower().split() if w.strip() and w not in stop_words]
        if words:
            return " ".join(words)
        return query

    def _retrieve_context(
        self,
        question: str,
        namespaces: List[str]
    ) -> List[Document]:
        """
        Retrieve relevant documents from vector store
        
        Args:
            question: User's question
            namespaces: List of document namespaces to search
            
        Returns:
            List of relevant documents
        """
        if not namespaces:
            print("[WARNING] No namespaces provided for retrieval")
            return []
        
        print(f"[SEARCH] Searching {len(namespaces)} document(s) for query: '{question}'...")
        
        # Search vector store
        results = vector_store.search(
            query=question,
            namespaces=namespaces,
            k=settings.TOP_K_RESULTS
        )

        # If no results found, expand/simplify query and try again
        if not results:
            expanded = self._expand_query(question)
            if expanded != question:
                print(f"[SEARCH] No results for original query. Retrying with expanded query: '{expanded}'")
                results = vector_store.search(
                    query=expanded,
                    namespaces=namespaces,
                    k=settings.TOP_K_RESULTS
                )
        
        print(f"[OK] Retrieved {len(results)} relevant chunks")

        # Attach namespace to metadata for citation tracking
        for doc in results:
            if doc.metadata is None:
                doc.metadata = {}
            if "namespace" not in doc.metadata:
                doc.metadata["namespace"] = doc.metadata.get("vector_namespace", "")

        return results
    
    def _extract_answer_from_raw(self, raw_text: str) -> str:
        """
        Last-resort extraction of just the 'answer' value from a raw JSON string
        when full JSON parsing has failed. Uses regex to grab the answer field value.
        Falls back to the raw text only if it doesn't look like JSON.
        """
        if not raw_text or not isinstance(raw_text, str):
            return ""
        stripped = raw_text.strip()
        # Try regex: "answer": "...(escaped string)..."
        import re
        m = re.search(r'"answer"\s*:\s*"((?:[^"\\]|\\.)*)\"', stripped, re.DOTALL)
        if m:
            val = m.group(1)
            # Unescape basic JSON escapes
            val = val.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
            return val.strip()
        # If raw text doesn't start with { it's plain text — return as-is
        if not stripped.startswith('{'):
            return stripped
        # Whole thing is JSON we couldn't parse — return empty rather than dumping JSON
        return ""

    def _run_rag_chain(
        self,
        prompt_template: str,
        variables: Dict,
        relevant_docs: List[Document],
        strict_json: bool = False
    ) -> Dict:
        """Execute a RAG chain and return answer with citations."""
        if strict_json:
            json_instruction = """
\n\nCRITICAL INSTRUCTION: You MUST format your entire response as a single valid JSON object. Do not wrap the JSON in Markdown block quotes, just return the raw JSON object.

The JSON object must have exactly this structure:
{{
  "answer": "Your detailed answer in markdown format. For charts, provide explanations here, but put the chart data in the visualization field.",
  "documents": {{
    "referenced_documents": [],
    "pages_used": [],
    "matching_text": [],
    "confidence_score": "High/Medium/Low"
  }},
  "insights": {{
    "executive_summary": "Short summary",
    "key_findings": []
  }},
  "general": {{
    "entities": [],
    "dates": [],
    "companies": [],
    "currency": [],
    "keywords": []
  }},
  "visualizations": [
    {{
      "title": "Chart Title",
      "type": "line|bar|pie|area|radar|composed",
      "xAxis": ["label1", "label2"],
      "series": [
        {{
          "name": "Series Name",
          "data": [10, 20]
        }}
      ]
    }}
  ]
}}

If you do not have data for a specific field, leave it empty or null. But always return this exact JSON structure. Do NOT include markdown code blocks (```json) around your response, just the raw JSON text. Do NOT generate Python scripts, Plotly, or Matplotlib code. Only generate this JSON format.
"""
            if "CRITICAL INSTRUCTION: You MUST format your entire response as a single valid JSON object" not in prompt_template:
                prompt_template += json_instruction

        prompt = PromptTemplate.from_template(prompt_template)
        chain = prompt | self.llm | StrOutputParser()

        print("[LLM] Generating answer...")
        raw_answer = chain.invoke(variables)
        citations = self._build_citations(relevant_docs)

        print("[OK] Answer generated")
        
        def _normalize_insights(raw):
            """Ensure insights is always a list of dicts."""
            if isinstance(raw, list):
                return raw
            if isinstance(raw, dict):
                # Some fields like executive_summary/key_findings are insight-like
                items = []
                if raw.get("key_findings"):
                    for f in (raw["key_findings"] if isinstance(raw["key_findings"], list) else [raw["key_findings"]]):
                        items.append({"title": "Key Finding", "description": str(f)})
                if raw.get("executive_summary"):
                    items.insert(0, {"title": "Executive Summary", "description": str(raw["executive_summary"])})
                return items
            return []

        parsed = self._parse_json_output(raw_answer) if strict_json else None
        if strict_json and isinstance(parsed, dict):
            raw_answer_text = parsed.get("answer", "")
            # If answer is empty or the LLM embedded the whole JSON inside answer, extract it
            if not raw_answer_text or str(raw_answer_text).strip().startswith("{"):
                # Try to parse nested JSON inside answer
                nested = self._parse_json_output(str(raw_answer_text))
                if isinstance(nested, dict) and nested.get("answer"):
                    raw_answer_text = nested["answer"]
                else:
                    raw_answer_text = self._extract_answer_from_raw(raw_answer)
            return {
                "analysisType": parsed.get("analysisType", variables.get("analysis_type")),
                "answer": raw_answer_text,
                "citations": citations,
                "documents": parsed.get("documents", {}),
                "insights": _normalize_insights(parsed.get("insights", [])),
                "general": parsed.get("general", {}),
                "visualizations": parsed.get("visualizations", []),
                "metadata": parsed.get("metadata", {}),
            }

        if strict_json:
            print("[WARNING] Strict JSON mode failed to parse LLM output, falling back to raw string")
            answer_only = self._extract_answer_from_raw(raw_answer)
            return {
                "analysisType": variables.get("analysis_type"),
                "answer": answer_only,
                "citations": citations,
                "documents": {},
                "insights": [],
                "general": {},
                "visualizations": [],
                "metadata": {},
            }

        # Non-strict mode: return raw text and best-effort parsed sections
        parsed = self._parse_json_output(raw_answer)
        if isinstance(parsed, dict):
            raw_answer_text = parsed.get("answer", "")
            # If answer is empty, missing, or the LLM put the whole JSON back in answer
            if not raw_answer_text or str(raw_answer_text).strip().startswith("{"):
                raw_answer_text = raw_answer
            return {
                "answer": raw_answer_text,
                "analysisType": parsed.get("analysisType", variables.get("analysis_type")),
                "citations": citations,
                "documents": parsed.get("documents", {}),
                "insights": _normalize_insights(parsed.get("insights", [])),
                "general": parsed.get("general", {}),
                "visualizations": parsed.get("visualizations", []),
                "metadata": parsed.get("metadata", {}),
            }

        # Parsing completely failed — extract just the answer field from raw text
        # to avoid dumping the whole JSON payload into the chat
        answer_only = self._extract_answer_from_raw(raw_answer)
        return {
            "answer": answer_only,
            "citations": citations,
            "documents": {},
            "insights": [],
            "general": {},
            "visualizations": [],
            "metadata": {},
        }
    
    async def smart_chat(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> Dict:
        """
        Smart Chat mode: Multi-modal RAG with document context
        
        Returns:
            Dict with answer and citations
        """
        print("\n[MODE] Smart Chat Mode")
        
        # Check if documents are available
        if not namespaces:
            return {
                "answer": (
                    "I need documents to answer your question. "
                    "Please upload a document first."
                ),
                "citations": [],
            }
        
        # Retrieve relevant context
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return {
                "answer": "I searched the uploaded document but couldn't find information about that topic.",
                "citations": [],
            }
        
        # Format context and history
        context = self._format_documents(relevant_docs)
        history = self._format_chat_history(chat_history)
        
        return self._run_rag_chain(
            SMART_CHAT_PROMPT,
            {"context": context, "chat_history": history, "question": question},
            relevant_docs,
        )
    
    async def document_analysis(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> Dict:
        """
        Document Analysis mode: Focus on specific document details
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            namespaces: Document namespaces to search
            
        Returns:
            AI-generated answer
        """
        print("\n[MODE] Document Analysis Mode")
        
        if not namespaces:
            return {"answer": "Please upload a document to analyze.", "citations": []}
        
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return {"answer": "I searched the uploaded document but couldn't find information about that topic.", "citations": []}
        
        context = self._format_documents(relevant_docs)
        
        return self._run_rag_chain(
            DOCUMENT_ANALYSIS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )
    
    async def analytical_insights(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> Dict:
        """
        Analytical Insights mode: Financial calculations and trends
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            namespaces: Document namespaces to search
            
        Returns:
            AI-generated answer with analysis
        """
        print("\n[MODE] Analytical Insights Mode")
        
        if not namespaces:
            return {"answer": "Please upload financial documents to analyze.", "citations": []}
        
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return {"answer": "I searched the uploaded document but couldn't find information about that topic.", "citations": []}
        
        context = self._format_documents(relevant_docs)
        
        return self._run_rag_chain(
            ANALYTICAL_INSIGHTS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )
    
    async def general_conversation(
        self,
        question: str,
        chat_history: List[Dict[str, str]]
    ) -> Dict:
        """
        General Conversation mode: No document context
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            
        Returns:
            AI-generated answer
        """
        print("\n[MODE] General Conversation Mode")
        
        history = self._format_chat_history(chat_history)
        prompt = PromptTemplate.from_template(GENERAL_CONVERSATION_PROMPT)
        chain = prompt | self.llm | StrOutputParser()
        
        raw_answer = chain.invoke({"chat_history": history, "question": question})
        
        import json
        try:
            cleaned = raw_answer.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            parsed = json.loads(cleaned)
            return {
                "answer": parsed.get("answer", raw_answer),
                "citations": [],
                "documents": parsed.get("documents", {}),
                "insights": parsed.get("insights", {}),
                "general": parsed.get("general", {}),
                "visualizations": parsed.get("visualizations", [])
            }
        except Exception:
            return {
                "answer": raw_answer, 
                "citations": [],
                "documents": {},
                "insights": {},
                "general": {},
                "visualizations": []
            }
    
    async def run_enterprise_analysis(
        self,
        analysis_type: str,
        namespaces: List[str],
        question: str = "",
        chat_history: List[Dict[str, str]] = None,
    ) -> Dict:
        """
        Run enterprise-grade financial analysis using specialized prompts.
        """
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
        relevant_docs = self._retrieve_context(search_query, namespaces)

        if not relevant_docs:
            return {
                "answer": "No relevant financial data found in the uploaded documents for this analysis.",
                "citations": [],
                "metadata": {"analysisType": analysis_type},
            }

        context = self._format_documents(relevant_docs)
        prompt_template = ENTERPRISE_PROMPTS[analysis_type]

        variables = {"context": context, "question": effective_question, "analysis_type": analysis_type}
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = self._run_rag_chain(prompt_template, variables, relevant_docs, strict_json=True)
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
        """
        Run enterprise chart extraction as a separate endpoint.
        """
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

        effective_question = question.strip() or "Generate visualization payloads for this analysis."
        relevant_docs = self._retrieve_context(effective_question, namespaces)

        if not relevant_docs:
            return {
                "analysisType": analysis_type,
                "visualizations": [],
                "metadata": {"analysisType": analysis_type},
                "citations": [],
            }

        context = self._format_documents(relevant_docs)
        variables = {"context": context, "question": effective_question, "analysis_type": analysis_type}
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = self._run_rag_chain(ENTERPRISE_CHARTS_PROMPT, variables, relevant_docs, strict_json=True)
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

    async def get_answer(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str],
        feature_mode: str
    ) -> Dict:
        """
        Main entry point for RAG service
        Routes to appropriate mode based on feature_mode
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            namespaces: Document namespaces to search
            feature_mode: Conversation mode
            
        Returns:
            Dict with answer and citations
        """
        print(f"\n{'='*60}")
        print(f"[QUERY] New Request")
        print(f"  Mode: {feature_mode}")
        print(f"  Question: {question[:100]}...")
        print(f"  Documents: {len(namespaces)}")
        print(f"{'='*60}")
        
        try:
            if feature_mode == "Smart_Chat":
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
                "answer": (
                    "I encountered an error while processing your question. "
                    "Please try again or rephrase your question."
                ),
                "citations": [],
            }
            
    async def get_audit_summary(
        self,
        namespaces: List[str]
    ) -> str:
        """
        Extract structured JSON financial summary from documents.
        Uses the AUDIT_SUMMARY_PROMPT to get a JSON object with key metrics.
        
        Returns:
            JSON string with financial metrics, or error message
        """
        print("\n[MODE] Audit Summary (structured JSON extraction)")

        if not namespaces:
            return '{"error": "No documents uploaded."}'

        docs = self._retrieve_context(
            "revenue operating income net income margins EPS assets liabilities cash",
            namespaces
        )

        if not docs:
            return '{"error": "No financial data found in the documents."}'

        context = self._format_documents(docs)
        prompt  = PromptTemplate.from_template(AUDIT_SUMMARY_PROMPT)
        chain   = prompt | self.llm | StrOutputParser()

        try:
            raw = chain.invoke({"context": context})
            # Strip any accidental markdown code fences
            raw = raw.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
            return raw
        except Exception as e:
            print(f"[ERROR] Audit summary failed: {e}")
            return f'{{"error": "Extraction failed: {str(e)}"}}'


# Create global RAG service instance
rag_service = RAGService()
