"""
RAG (Retrieval Augmented Generation) Service
Handles question answering using document context
Strategy: Groq LLM (primary - fast and accurate) → Gemini LLM (fallback)
"""

from typing import List, Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

from app.config.settings import settings
from app.config.prompts import (
    SMART_CHAT_PROMPT,
    DOCUMENT_ANALYSIS_PROMPT,
    ANALYTICAL_INSIGHTS_PROMPT,
    GENERAL_CONVERSATION_PROMPT
)
from app.services.vector_store import vector_store


class RAGService:
    """
    Retrieval Augmented Generation Service
    Answers questions using relevant document context
    Strategy: Groq LLM (primary - fast and accurate) → Gemini LLM (fallback)
    """
    
    def __init__(self):
        """Initialize RAG service with Groq and Gemini LLMs"""
        # Validate API keys
        if not settings.GROQ_API_KEY and not settings.GOOGLE_API_KEY:
            raise ValueError(
                "At least one API key must be set. "
                "Get Groq key from: https://console.groq.com/keys "
                "Get Gemini key from: https://makersuite.google.com/app/apikey"
            )
        
        # Initialize Groq LLM (Primary - Fast and accurate)
        self.groq_llm = None
        if settings.GROQ_API_KEY:
            try:
                self.groq_llm = ChatGroq(
                    model=settings.GROQ_LLM_MODEL,
                    api_key=settings.GROQ_API_KEY,
                    temperature=settings.LLM_TEMPERATURE
                )
                print("[OK] Groq LLM initialized (Primary - Fast and accurate)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Groq LLM: {e}")
        
        # Initialize Gemini LLM (Fallback)
        self.gemini_llm = None
        if settings.GOOGLE_API_KEY:
            try:
                self.gemini_llm = ChatGoogleGenerativeAI(
                    model=settings.GEMINI_LLM_MODEL,
                    temperature=settings.LLM_TEMPERATURE,
                    google_api_key=settings.GOOGLE_API_KEY,
                    convert_system_message_to_human=True
                )
                print("[OK] Gemini LLM initialized (Fallback)")
            except Exception as e:
                print(f"[WARNING] Failed to initialize Gemini LLM: {e}")
        
        if not self.groq_llm and not self.gemini_llm:
            raise RuntimeError("Failed to initialize any LLM")
    
    def _get_llm(self, use_fallback: bool = False):
        """
        Get the appropriate LLM (Groq primary, Gemini fallback)
        
        Args:
            use_fallback: Force use of Gemini for complex reasoning
            
        Returns:
            LLM instance
        """
        if use_fallback and self.gemini_llm:
            return self.gemini_llm
        
        if self.groq_llm:
            return self.groq_llm
        
        if self.gemini_llm:
            return self.gemini_llm
        
        raise RuntimeError("No LLM available")
    
    def _invoke_with_fallback(self, prompt: PromptTemplate, inputs: dict) -> str:
        """
        Invoke LLM with automatic fallback
        Try Groq first → Gemini
        
        Args:
            prompt: Prompt template
            inputs: Input variables for prompt
            
        Returns:
            Generated answer
        """
        # Try Groq first (Primary - Fast and accurate)
        if self.groq_llm:
            try:
                print("[LLM] Using Groq (Primary)...")
                chain = prompt | self.groq_llm | StrOutputParser()
                answer = chain.invoke(inputs)
                print("[OK] Groq succeeded")
                return answer
            except Exception as e:
                print(f"[FALLBACK] Groq failed: {e}, switching to Gemini...")
        
        # Fall back to Gemini
        if self.gemini_llm:
            try:
                print("[LLM] Using Gemini (Fallback)...")
                chain = prompt | self.gemini_llm | StrOutputParser()
                answer = chain.invoke(inputs)
                print("[OK] Gemini succeeded")
                return answer
            except Exception as e:
                print(f"[ERROR] All LLMs failed: {e}")
                raise
        
        raise RuntimeError("No LLM available")
    
    def _format_documents(self, docs: List[Document]) -> str:
        """
        Format retrieved documents into a single context string
        
        Args:
            docs: List of relevant documents
            
        Returns:
            Formatted context string
        """
        if not docs:
            return "No relevant context found."
        
        # Join document contents with separators
        formatted = "\n\n---\n\n".join([
            f"[Page {doc.metadata.get('page', 'N/A')}] {doc.page_content}"
            for doc in docs
        ])
        
        return formatted
    
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
        
        print(f"[SEARCH] Searching {len(namespaces)} document(s)...")
        
        # Search vector store
        results = vector_store.search(
            query=question,
            namespaces=namespaces,
            k=settings.TOP_K_RESULTS
        )
        
        print(f"[OK] Retrieved {len(results)} relevant chunks")
        return results
    
    async def smart_chat(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> str:
        """
        Smart Chat mode: Multi-modal RAG with document context
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            namespaces: Document namespaces to search
            
        Returns:
            AI-generated answer
        """
        print("\n[MODE] Smart Chat Mode")
        
        # Check if documents are available
        if not namespaces:
            return (
                "I need documents to answer your question. "
                "Please upload a document first."
            )
        
        # Retrieve relevant context
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return (
                "I couldn't find relevant information in the uploaded documents "
                "to answer your question."
            )
        
        # Format context and history
        context = self._format_documents(relevant_docs)
        history = self._format_chat_history(chat_history)
        
        # Create prompt
        prompt = PromptTemplate.from_template(SMART_CHAT_PROMPT)
        
        # Generate answer with automatic fallback
        print("[LLM] Generating answer...")
        answer = self._invoke_with_fallback(prompt, {
            "context": context,
            "chat_history": history,
            "question": question
        })
        
        print("[OK] Answer generated")
        return answer
    
    async def document_analysis(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> str:
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
            return "Please upload a document to analyze."
        
        # Retrieve context
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return "No relevant information found in the document."
        
        # Format context
        context = self._format_documents(relevant_docs)
        
        # Create prompt
        prompt = PromptTemplate.from_template(DOCUMENT_ANALYSIS_PROMPT)
        
        # Generate answer with automatic fallback
        answer = self._invoke_with_fallback(prompt, {
            "context": context,
            "question": question
        })
        
        return answer
    
    async def analytical_insights(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str]
    ) -> str:
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
            return "Please upload financial documents to analyze."
        
        # Retrieve context
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return "No relevant financial data found in the documents."
        
        # Format context
        context = self._format_documents(relevant_docs)
        
        # Create prompt
        prompt = PromptTemplate.from_template(ANALYTICAL_INSIGHTS_PROMPT)
        
        # Generate answer with automatic fallback
        answer = self._invoke_with_fallback(prompt, {
            "context": context,
            "question": question
        })
        
        return answer
    
    async def general_conversation(
        self,
        question: str,
        chat_history: List[Dict[str, str]]
    ) -> str:
        """
        General Conversation mode: No document context
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            
        Returns:
            AI-generated answer
        """
        print("\n[MODE] General Conversation Mode")
        
        # Format history
        history = self._format_chat_history(chat_history)
        
        # Create prompt
        prompt = PromptTemplate.from_template(GENERAL_CONVERSATION_PROMPT)
        
        # Generate answer with automatic fallback
        answer = self._invoke_with_fallback(prompt, {
            "chat_history": history,
            "question": question
        })
        
        return answer
    
    async def get_answer(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str],
        feature_mode: str
    ) -> str:
        """
        Main entry point for RAG service
        Routes to appropriate mode based on feature_mode
        
        Args:
            question: User's question
            chat_history: Previous conversation messages
            namespaces: Document namespaces to search
            feature_mode: Conversation mode
            
        Returns:
            AI-generated answer
        """
        print(f"\n{'='*60}")
        print(f"📥 New Query")
        print(f"Mode: {feature_mode}")
        print(f"Question: {question[:100]}...")
        print(f"Documents: {len(namespaces)}")
        print(f"{'='*60}")
        
        try:
            # Route to appropriate mode
            if feature_mode == "Smart_Chat":
                answer = await self.smart_chat(question, chat_history, namespaces)
            
            elif feature_mode == "Document_Analysis":
                answer = await self.document_analysis(question, chat_history, namespaces)
            
            elif feature_mode == "Analytical_Insights":
                answer = await self.analytical_insights(question, chat_history, namespaces)
            
            elif feature_mode == "General_Conversation":
                answer = await self.general_conversation(question, chat_history)
            
            else:
                # Default to Smart Chat
                print(f"[WARNING] Unknown mode '{feature_mode}', using Smart Chat")
                answer = await self.smart_chat(question, chat_history, namespaces)
            
            print(f"\n{'='*60}")
            print(f"[OK] Query completed successfully")
            print(f"{'='*60}\n")
            
            return answer
            
        except Exception as e:
            print(f"\n[ERROR] Error generating answer: {e}")
            return (
                "I encountered an error while processing your question. "
                "Please try again or rephrase your question."
            )


# Create global RAG service instance
rag_service = RAGService()
