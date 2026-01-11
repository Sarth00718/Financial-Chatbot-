"""
Application Configuration
Loads environment variables and provides settings throughout the app
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    
    # Groq API Key (Primary - Fast and accurate)
    GROQ_API_KEY: Optional[str] = None
    
    # Google Gemini API Key (Fallback)
    GOOGLE_API_KEY: Optional[str] = None

    # Node.js Backend URL (for webhook callbacks)
    NODE_WEBHOOK_URL: str = "http://localhost:8000"

    # Server Configuration
    PORT: int = 5000

    # Vector Store Configuration
    VECTOR_STORE_PATH: str = "./vector_store"  # Local directory for FAISS indices

    # Embedding Model Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM Configuration
    # Groq Models (Primary)
    GROQ_LLM_MODEL: str = "llama-3.3-70b-versatile"  # Fast reasoning
    GROQ_VISION_MODEL: str = "llama-3.2-90b-vision-preview"  # Vision tasks
    
    # Gemini Models (Fallback)
    GEMINI_LLM_MODEL: str = "gemini-2.0-flash-exp"
    GEMINI_VISION_MODEL: str = "gemini-2.0-flash-exp"
    
    LLM_TEMPERATURE: float = 0.0

    # Document Processing Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 150

    # Retrieval Configuration
    TOP_K_RESULTS: int = 5  # Number of relevant chunks to retrieve

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance (no side effects here)
settings = Settings()
