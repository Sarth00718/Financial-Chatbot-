"""
Application Configuration
Loads environment variables and provides settings throughout the app
"""

from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """

    # Gemini API Configuration (Primary provider)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"
    GEMINI_VISION_MODEL: str = "gemini-1.5-flash"

    # Groq API Key (Fallback provider)
    GROQ_API_KEY: str

    # Optional: Your site URL and app name (not needed for Groq)
    OPENROUTER_SITE_URL: str = ""
    OPENROUTER_APP_NAME: str = "FinChatBot"

    # Node.js Backend URL (for webhook callbacks)
    NODE_WEBHOOK_URL: str = ""
    # Server Configuration
    PORT: int = 5000

    # Vector Store Configuration
    VECTOR_STORE_PATH: str = "./vector_store"  # Local directory for FAISS indices

    # Embedding Model Configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # LLM Configuration (Groq)
    LLM_MODEL: str = "openai/gpt-oss-20b"  # Available model on your Groq key
    LLM_TEMPERATURE: float = 0.0
    LLM_MAX_TOKENS: int = 2000  # Limit to save credits
    LLM_TIMEOUT: int = 60  # Timeout in seconds for LLM API calls

    # Vision Model Configuration (Groq — for chart/image/scan analysis)
    # Valid Groq vision models include:
    #   llama-3.2-11b-vision-preview
    #   llama-3.2-90b-vision-preview
    VISION_MODEL: str = "llama-3.2-11b-vision-preview"

    # OCR Configuration
    # Choose OCR provider: "ocr_space" or "google_vision"
    OCR_PROVIDER: str = "ocr_space"  # Default to free OCR.Space

    # OCR.Space Configuration
    OCR_SPACE_API_KEY: str = ""

    # Google Cloud Vision Configuration (requires API key)
    GOOGLE_VISION_API_KEY: str = ""

    # Document Processing Configuration
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 150

    # Retrieval Configuration
    TOP_K_RESULTS: int = 5  # Number of relevant chunks to retrieve

    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()

# Ensure vector store directory exists
os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)
