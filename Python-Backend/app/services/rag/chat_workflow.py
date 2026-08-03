from typing import List, Dict
import traceback
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.services.rag.core import RAGCore
from app.core.prompts import (
    SMART_CHAT_PROMPT,
    DOCUMENT_ANALYSIS_PROMPT,
    ANALYTICAL_INSIGHTS_PROMPT,
    GENERAL_CONVERSATION_PROMPT,
)


class RAGChatService(RAGCore):
    """
    RAG Service for standard chat and general queries.
    """

    async def smart_chat(
        self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]
    ) -> Dict:
        print("\n[MODE] Smart Chat Mode")

        if not namespaces:
            return {
                "answer": (
                    "I need documents to answer your question. "
                    "Please upload a document first."
                ),
                "citations": [],
            }

        relevant_docs = self._retrieve_context(question, namespaces)

        if not relevant_docs:
            return {
                "answer": "I searched the uploaded document but couldn't find information about that topic.",
                "citations": [],
            }

        context = self._format_documents(relevant_docs)
        history = self._format_chat_history(chat_history)

        return self._run_rag_chain(
            SMART_CHAT_PROMPT,
            {"context": context, "chat_history": history, "question": question},
            relevant_docs,
        )

    async def document_analysis(
        self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]
    ) -> Dict:
        print("\n[MODE] Document Analysis Mode")

        if not namespaces:
            return {"answer": "Please upload a document to analyze.", "citations": []}

        relevant_docs = self._retrieve_context(question, namespaces)

        if not relevant_docs:
            return {
                "answer": "I searched the uploaded document but couldn't find information about that topic.",
                "citations": [],
            }

        context = self._format_documents(relevant_docs)

        return self._run_rag_chain(
            DOCUMENT_ANALYSIS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )

    async def analytical_insights(
        self, question: str, chat_history: List[Dict[str, str]], namespaces: List[str]
    ) -> Dict:
        print("\n[MODE] Analytical Insights Mode")

        if not namespaces:
            return {
                "answer": "Please upload financial documents to analyze.",
                "citations": [],
            }

        relevant_docs = self._retrieve_context(question, namespaces)

        if not relevant_docs:
            return {
                "answer": "I searched the uploaded document but couldn't find information about that topic.",
                "citations": [],
            }

        context = self._format_documents(relevant_docs)

        return self._run_rag_chain(
            ANALYTICAL_INSIGHTS_PROMPT,
            {"context": context, "question": question},
            relevant_docs,
        )

    async def general_conversation(
        self, question: str, chat_history: List[Dict[str, str]]
    ) -> Dict:
        print("\n[MODE] General Conversation Mode")

        history = self._format_chat_history(chat_history)
        prompt = PromptTemplate.from_template(GENERAL_CONVERSATION_PROMPT)
        chain = prompt | self.llm | StrOutputParser()

        raw_answer = chain.invoke({"chat_history": history, "question": question})

        import json

        try:
            cleaned = raw_answer.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            elif cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            parsed = json.loads(cleaned)
            return {
                "answer": parsed.get("answer", raw_answer),
                "citations": [],
                "documents": parsed.get("documents", {}),
                "insights": (
                    parsed.get("insights", [])
                    if isinstance(parsed.get("insights"), list)
                    else []
                ),
                "general": parsed.get("general", {}),
                "visualizations": parsed.get("visualizations", []),
            }
        except Exception:
            return {
                "answer": raw_answer,
                "citations": [],
                "documents": {},
                "insights": {},
                "general": {},
                "visualizations": [],
            }

    async def get_answer(
        self,
        question: str,
        chat_history: List[Dict[str, str]],
        namespaces: List[str],
        feature_mode: str,
    ) -> Dict:
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
                result = await self.document_analysis(
                    question, chat_history, namespaces
                )
            elif feature_mode == "Analytical_Insights":
                result = await self.analytical_insights(
                    question, chat_history, namespaces
                )
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


chat_service = RAGChatService()
