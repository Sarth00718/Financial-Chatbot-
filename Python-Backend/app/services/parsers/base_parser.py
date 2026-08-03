from abc import ABC, abstractmethod
from typing import List, Callable, Optional
from langchain_core.documents import Document


class BaseParser(ABC):
    """
    Abstract base class for document parsers.
    """

    def __init__(
        self,
        text_splitter,
        vision_callback: Optional[Callable[[bytes, str], str]] = None,
    ):
        """
        Initialize the parser.

        Args:
            text_splitter: A Langchain text splitter instance for chunking text.
            vision_callback: An optional function that takes (image_bytes, context_string)
                             and returns a description string using a vision LLM.
        """
        self.text_splitter = text_splitter
        self.vision_callback = vision_callback

    def extract(self, file_path: str, file_name: str) -> List[Document]:
        """
        Parse the file and return a list of Document chunks.
        This uses the Template Method pattern: it calls _extract_blocks() to get raw content,
        then chunks it using the text_splitter.

        Args:
            file_path: The absolute path to the file.
            file_name: The original file name.

        Returns:
            List of langchain_core.documents.Document objects.
        """
        import os

        blocks = self._extract_blocks(file_path, file_name)

        all_chunks = []
        for block in blocks:
            # block should be a dict with 'text' and 'metadata'
            text = block.get("text", "")
            if not text.strip():
                continue

            chunks = self.text_splitter.create_documents(
                [text], metadatas=[block.get("metadata", {})]
            )
            all_chunks.extend(chunks)

        if not all_chunks:
            ext = os.path.splitext(file_name)[1]
            raise ValueError(f"No content could be extracted from this {ext} file.")

        return all_chunks

    @abstractmethod
    def _extract_blocks(self, file_path: str, file_name: str) -> List[dict]:
        """
        Extract raw blocks of content from the file.

        Args:
            file_path: The absolute path to the file.
            file_name: The original file name.

        Returns:
            List of dictionaries, each containing 'text' and 'metadata'.
        """
