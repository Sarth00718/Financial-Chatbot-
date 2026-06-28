"""
RAG (Retrieval Augmented Generation) Service
Handles question answering using document context
Simplified version with clear logic flow
"""

from typing import List, Dict
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
    
    def _run_rag_chain(
        self,
        prompt_template: str,
        variables: Dict,
        relevant_docs: List[Document]
    ) -> Dict:
        """Execute a RAG chain and return answer with citations."""
        prompt = PromptTemplate.from_template(prompt_template)
        chain = prompt | self.llm | StrOutputParser()

        print("[LLM] Generating answer...")
        answer = chain.invoke(variables)
        citations = self._build_citations(relevant_docs)

        print("[OK] Answer generated")
        return {"answer": answer, "citations": citations}
    
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
        
        answer = chain.invoke({"chat_history": history, "question": question})
        return {"answer": answer, "citations": []}
    
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

        variables = {"context": context, "question": effective_question}
        if analysis_type == "explain_mode":
            variables["chat_history"] = self._format_chat_history(chat_history)

        result = self._run_rag_chain(prompt_template, variables, relevant_docs)
        result["metadata"] = {
            "analysisType": analysis_type,
            "documentsAnalyzed": len(namespaces),
            "chunksRetrieved": len(relevant_docs),
        }
        return result

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
        # If documents are uploaded, default/upgrade mode to Smart_Chat instead of skipping retrieval
        if namespaces and feature_mode == "General_Conversation":
            print("[INFO] Documents exist, upgrading General_Conversation to Smart_Chat")
            feature_mode = "Smart_Chat"

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
