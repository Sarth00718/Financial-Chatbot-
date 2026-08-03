import os
from typing import Dict, Type, Optional
from app.services.parsers.base_parser import BaseParser


class ParserFactory:
    """
    Registry for document parsers based on file extensions.
    """

    _parsers: Dict[str, Type[BaseParser]] = {}

    @classmethod
    def register_parser(cls, extensions: list[str]):
        """
        Decorator to register a parser class for specific file extensions.
        """

        def decorator(parser_cls: Type[BaseParser]):
            for ext in extensions:
                cls._parsers[ext.lower()] = parser_cls
            return parser_cls

        return decorator

    @classmethod
    def get_parser(cls, file_name: str) -> Optional[Type[BaseParser]]:
        """
        Retrieve the registered parser class for the given file name.
        """
        ext = os.path.splitext(file_name.lower())[1]
        return cls._parsers.get(ext)
