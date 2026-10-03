from typing import List, Dict
import json
from langchain_groq import ChatGroq
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document

from app.core.settings import settings
from app.services.vector_store import vector_store


class RAGCore:
    """
    Base RAG Core providing LLM initialization, context retrieval, and shared utilities.
    Uses Gemini as the primary LLM with Groq as a fallback provider.
    """

    def __init__(self):
        self.groq_llm = ChatGroq(
            model=settings.LLM_MODEL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=4000,
            timeout=settings.LLM_TIMEOUT,
            api_key=settings.GROQ_API_KEY,
        )

        self.gemini_llm = None
        if settings.GEMINI_API_KEY:
            try:
                try:
                    from langchain_google_genai import ChatGoogleGenerativeAI

                    self.gemini_llm = ChatGoogleGenerativeAI(
                        model=settings.GEMINI_MODEL,
                        google_api_key=settings.GEMINI_API_KEY,
                        temperature=settings.LLM_TEMPERATURE,
                        timeout=settings.LLM_TIMEOUT,
                    )
                except Exception:
                    self.gemini_llm = ChatOpenAI(
                        model=settings.GEMINI_MODEL,
                        api_key=settings.GEMINI_API_KEY,
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                        temperature=settings.LLM_TEMPERATURE,
                        timeout=settings.LLM_TIMEOUT,
                    )
                print(f"[LLM] Primary: Gemini ({settings.GEMINI_MODEL}) | Fallback: Groq ({settings.LLM_MODEL})")
            except Exception as e:
                print(f"[WARNING] Failed to setup Gemini LLM: {e}. Defaulting to Groq.")
                self.gemini_llm = None
        
        # Primary reference for LangChain standard calls
        self.llm = self.gemini_llm if self.gemini_llm else self.groq_llm

    def _format_documents(self, docs: List[Document]) -> str:
        if not docs:
            return "No relevant context was found in the uploaded documents."

        import re

        error_patterns = [
            "does not support image input",
            "vision model not available",
            "vision model unavailable",
            "image could not be processed",
            "cannot read",
            "[VISION]",
            "[WARNING]",
            "[ERROR]",
        ]
        error_re = re.compile("|".join(error_patterns), re.IGNORECASE)

        parts = []
        for doc in docs:
            content = (doc.page_content or "").strip()
            if len(content) < 20 and error_re.search(content):
                continue

            meta = doc.metadata or {}
            page = meta.get("page", "N/A")
            dtype = meta.get("type", "text")
            src = meta.get("source", "")
            filename = meta.get("filename", "")
            doc_identifier = f"Document: {filename}" if filename else "Document"

            if dtype == "image":
                header = f"[{doc_identifier} | Page {page} — Chart/Image Description]"
            elif dtype == "scanned_page":
                header = f"[{doc_identifier} | Page {page} — Scanned Page (Vision-extracted)]"
            elif "table" in src.lower() or "[TABLE" in content:
                header = f"[{doc_identifier} | Page {page} — Table Extraction]"
            else:
                header = f"[{doc_identifier} | Page {page}]"

            parts.append(f"{header}\n{content}")

        if not parts:
            return "No relevant context was found in the uploaded documents."
        return "\n\n---\n\n".join(parts)

    def _build_citations(self, docs: List[Document]) -> List[Dict]:
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

            filename = meta.get("filename", "")

            citations.append(
                {
                    "page": page,
                    "source": source,
                    "type": dtype,
                    "snippet": snippet,
                    "namespace": namespace,
                    "filename": filename,
                }
            )

        return citations

    def _format_chat_history(self, chat_history: List[Dict[str, str]]) -> str:
        if not chat_history:
            return "No previous conversation."

        return "\n".join(
            [
                f"{msg.get('role', 'unknown').capitalize()}: {msg.get('content', '')}"
                for msg in chat_history
            ]
        )

    def _clean_json_text(self, text: str) -> str:
        if not isinstance(text, str):
            return text
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:].strip()
        if cleaned.startswith("```"):
            cleaned = cleaned[3:].strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()
        return cleaned

    def _extract_json_segment(self, text: str):
        if not isinstance(text, str):
            return None
        cleaned = text.strip()
        braces = ["{", "["]
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
        close_char = "}" if open_char == "{" else "]"
        stack = []
        in_string = False
        escape = False

        for i in range(start_index, len(text)):
            char = text[i]
            if escape:
                escape = False
                continue
            if char == "\\":
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
                    return text[start_index : i + 1]
        return None

    def _parse_json_output(self, raw_answer: str):
        cleaned = self._clean_json_text(raw_answer)
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        segment = self._extract_json_segment(cleaned)
        if segment is not None:
            return segment

        return None

    def _expand_query(self, query: str) -> str:
        stop_words = {
            "what",
            "is",
            "are",
            "the",
            "a",
            "an",
            "of",
            "in",
            "on",
            "for",
            "to",
            "with",
            "about",
            "describe",
            "summarize",
            "list",
            "show",
            "give",
            "me",
            "how",
            "why",
            "where",
            "when",
            "who",
            "please",
            "can",
            "you",
            "tell",
            "explain",
            "info",
            "information",
            "find",
            "document",
            "documents",
            "pdf",
            "file",
            "files",
            "uploaded",
        }
        words = [w for w in query.lower().split() if w.strip() and w not in stop_words]
        if words:
            return " ".join(words)
        return query

    def _retrieve_context(self, question: str, namespaces: List[str]) -> List[Document]:
        if not namespaces:
            print("[WARNING] No namespaces provided for retrieval")
            return []

        print(
            f"[SEARCH] Searching {len(namespaces)} document(s) for query: '{question}'..."
        )

        results = vector_store.search(
            query=question, namespaces=namespaces, k=settings.TOP_K_RESULTS
        )

        if not results:
            expanded = self._expand_query(question)
            if expanded != question:
                print(f"[SEARCH] Retrying with expanded query: '{expanded}'")
                results = vector_store.search(
                    query=expanded, namespaces=namespaces, k=settings.TOP_K_RESULTS
                )

        print(f"[OK] Retrieved {len(results)} relevant chunks")

        for doc in results:
            if doc.metadata is None:
                doc.metadata = {}
            if "namespace" not in doc.metadata:
                doc.metadata["namespace"] = doc.metadata.get("vector_namespace", "")

        return results

    def _get_document_context(self, question: str, namespaces: List[str]) -> tuple[List[Document], str, dict]:
        """
        Standardizes document retrieval and formatting.
        Returns: (relevant_docs, context_string, error_dict_if_any)
        """
        if not namespaces:
            return [], "", {
                "answer": "Please upload a document to analyze.",
                "citations": []
            }
        
        relevant_docs = self._retrieve_context(question, namespaces)
        
        if not relevant_docs:
            return [], "", {
                "answer": "I searched the uploaded document but couldn't find information about that topic.",
                "citations": []
            }
            
        context = self._format_documents(relevant_docs)
        return relevant_docs, context, None

    def _extract_answer_from_raw(self, raw_text: str) -> str:
        if not raw_text or not isinstance(raw_text, str):
            return ""
        stripped = raw_text.strip()
        ans_key = '"answer":'
        idx = stripped.find(ans_key)
        if idx != -1:
            after_colon = stripped.find('"', idx + len(ans_key))
            if after_colon != -1:
                i = after_colon + 1
                escaped = False
                while i < len(stripped):
                    ch = stripped[i]
                    if escaped:
                        escaped = False
                        i += 1
                        continue
                    if ch == "\\":
                        escaped = True
                        i += 1
                        continue
                    if ch == '"':
                        break
                    i += 1
                raw = stripped[after_colon + 1 : i]
                raw = (
                    raw.replace("\\n", "\n")
                    .replace("\\t", "\t")
                    .replace('\\"', '"')
                    .replace("\\\\", "\\")
                )
                return raw.strip()
        if not stripped.startswith("{"):
            return stripped
        return ""

    def _clean_answer_text(self, text: str) -> str:
        if not text or not isinstance(text, str):
            return text or ""
        import re

        text = re.sub(
            r'^[\s,]*"(?:insights|general|visualizations|documents|metadata|citations|analysisType)"\s*:\s*',
            "",
            text,
        )
        text = re.sub(r"[\s,]*[\}]+\s*$", "", text)
        text = re.sub(r"\n[\s,]*[\}]+", "", text)
        return text.strip()

    def _filter_real_visualizations(self, vizs) -> list:
        if not isinstance(vizs, list):
            return []
        import re

        placeholder_pattern = re.compile(
            r"^(year|item\s*\d+|label\d*|value|series|data|category\s*\d*)$",
            re.IGNORECASE,
        )
        real = []
        for v in vizs:
            if not isinstance(v, dict):
                continue
            xaxis = v.get("xAxis", [])
            if not xaxis:
                continue
            non_placeholder = [
                x for x in xaxis if not placeholder_pattern.match(str(x).strip())
            ]
            if not non_placeholder:
                continue
            series = v.get("series", [])
            if not series:
                continue
            all_data = []
            for s in series:
                all_data.extend(s.get("data", []))
            if not all_data:
                continue
            try:
                numeric = [float(d) for d in all_data]
                if numeric == list(range(len(numeric))):
                    continue
            except (TypeError, ValueError):
                pass
            real.append(v)
        return real

    async def _run_rag_chain(
        self,
        prompt_template: str,
        variables: Dict,
        relevant_docs: List[Document],
        strict_json: bool = False,
    ) -> Dict:
        if strict_json:
            json_instruction = """

CRITICAL INSTRUCTION: You MUST format your entire response as a single valid JSON object. Do not wrap the JSON in Markdown block quotes, just return the raw JSON object.

ABSOLUTELY FORBIDDEN: The "answer" field MUST contain ONLY plain markdown text and natural language. Never include raw JSON syntax inside the answer field. Put all chart/visualization data exclusively in the separate "visualizations" array. Use markdown tables for tabular data.

The JSON object must have exactly this structure:
{{
  "answer": "Your detailed answer in markdown format.",
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

If you do not have data for a specific field, leave it empty or null. But always return this exact JSON structure. Do NOT include markdown code blocks around your response, just the raw JSON text. Do NOT generate Python scripts, Plotly, or Matplotlib code. Only generate this JSON format.

VISUALIZATION RULE: ONLY populate visualizations if the document contains ACTUAL explicit numerical data (specific figures, percentages, or counts stated verbatim in the document). Do NOT invent or estimate numbers. If no chartable data exists, set visualizations to [].

CRITICAL: You are a document-grounded AI. Your ONLY knowledge source is the document context provided. If you cannot find the answer, set "answer" to "I searched the uploaded document but couldn't find information about that topic."
"""
            if (
                "CRITICAL INSTRUCTION: You MUST format your entire response as a single valid JSON object"
                not in prompt_template
            ):
                prompt_template += json_instruction

        prompt = PromptTemplate.from_template(prompt_template)
        print("[LLM] Generating answer...")

        raw_answer = None
        if self.gemini_llm:
            try:
                chain = prompt | self.gemini_llm | StrOutputParser()
                raw_answer = await chain.ainvoke(variables)
                print("[LLM] Answer generated via Gemini")
            except Exception as e:
                print(f"[LLM WARNING] Gemini failed ({e}). Falling back to Groq...")

        if raw_answer is None:
            chain = prompt | self.groq_llm | StrOutputParser()
            raw_answer = await chain.ainvoke(variables)
            print("[LLM] Answer generated via Groq (Fallback)")

        citations = self._build_citations(relevant_docs)

        print("[OK] Answer generated")

        def _normalize_insights(raw):
            """Normalize insights to always return a list for enterprise responses."""
            if isinstance(raw, list):
                return raw
            if isinstance(raw, dict):
                # Convert dict format to list format
                items = []
                if raw.get("executive_summary"):
                    items.append({
                        "title": "Executive Summary",
                        "description": str(raw["executive_summary"]),
                        "category": "Summary"
                    })
                if raw.get("key_findings"):
                    for finding in (raw["key_findings"] if isinstance(raw["key_findings"], list) else [raw["key_findings"]]):
                        items.append({
                            "title": "Key Finding",
                            "description": str(finding),
                            "category": "Finding"
                        })
                if raw.get("trends"):
                    for trend in (raw["trends"] if isinstance(raw["trends"], list) else [raw["trends"]]):
                        items.append({
                            "title": "Trend",
                            "description": str(trend),
                            "category": "Trend"
                        })
                if raw.get("swot"):
                    for swot_item in (raw["swot"] if isinstance(raw["swot"], list) else [raw["swot"]]):
                        items.append({
                            "title": "SWOT Analysis",
                            "description": str(swot_item),
                            "category": "SWOT"
                        })
                return items
            return []

        parsed = self._parse_json_output(raw_answer) if strict_json else None
        if strict_json and isinstance(parsed, dict):
            raw_answer_text = parsed.get("answer", "")
            if not raw_answer_text or str(raw_answer_text).strip().startswith("{"):
                nested = self._parse_json_output(str(raw_answer_text))
                if isinstance(nested, dict) and nested.get("answer"):
                    raw_answer_text = nested["answer"]
                else:
                    raw_answer_text = self._extract_answer_from_raw(raw_answer)
            if not raw_answer_text or not raw_answer_text.strip():
                raw_answer_text = self._extract_answer_from_raw(raw_answer)
            raw_answer_text = self._clean_answer_text(raw_answer_text)
            return {
                "analysisType": parsed.get(
                    "analysisType", variables.get("analysis_type")
                ),
                "answer": raw_answer_text,
                "citations": citations,
                "documents": parsed.get("documents", {}),
                "insights": _normalize_insights(parsed.get("insights", [])),
                "general": parsed.get("general", {}),
                "visualizations": self._filter_real_visualizations(
                    parsed.get("visualizations", [])
                ),
                "metadata": parsed.get("metadata", {}),
            }

        if strict_json:
            print(
                "[WARNING] Strict JSON mode failed to parse LLM output, falling back to raw string"
            )
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

        parsed = self._parse_json_output(raw_answer)
        if isinstance(parsed, dict):
            raw_answer_text = parsed.get("answer", "")
            if not raw_answer_text or str(raw_answer_text).strip().startswith("{"):
                raw_answer_text = self._extract_answer_from_raw(raw_answer)
            if not raw_answer_text or not raw_answer_text.strip():
                raw_answer_text = raw_answer
            raw_answer_text = self._clean_answer_text(raw_answer_text)
            return {
                "answer": raw_answer_text,
                "analysisType": parsed.get(
                    "analysisType", variables.get("analysis_type")
                ),
                "citations": citations,
                "documents": parsed.get("documents", {}),
                "insights": _normalize_insights(parsed.get("insights", [])),
                "general": parsed.get("general", {}),
                "visualizations": self._filter_real_visualizations(
                    parsed.get("visualizations", [])
                ),
                "metadata": parsed.get("metadata", {}),
            }

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
