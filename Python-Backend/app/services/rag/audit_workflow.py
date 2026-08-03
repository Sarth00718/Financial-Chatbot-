from typing import List
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.services.rag.core import RAGCore
from app.core.prompts import AUDIT_SUMMARY_PROMPT


class RAGAuditService(RAGCore):
    """
    RAG Service specifically for structured JSON audit extraction.
    """

    async def get_audit_summary(self, namespaces: List[str]) -> str:
        print("\n[MODE] Audit Summary (structured JSON extraction)")

        if not namespaces:
            return '{"error": "No documents uploaded."}'

        docs = self._retrieve_context(
            "revenue operating income net income margins EPS assets liabilities cash",
            namespaces,
        )

        if not docs:
            return '{"error": "No financial data found in the documents."}'

        context = self._format_documents(docs)
        prompt = PromptTemplate.from_template(AUDIT_SUMMARY_PROMPT)
        chain = prompt | self.llm | StrOutputParser()

        try:
            raw = chain.invoke({"context": context})
            raw = (
                raw.strip()
                .removeprefix("```json")
                .removeprefix("```")
                .removesuffix("```")
                .strip()
            )
            return raw
        except Exception as e:
            print(f"[ERROR] Audit summary failed: {e}")
            return f'{{"error": "Extraction failed: {str(e)}"}}'


audit_service = RAGAuditService()
