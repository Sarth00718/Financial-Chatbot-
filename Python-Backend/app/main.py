"""
Main Application Entry Point
FastAPI application setup and configuration
"""

from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.config.settings import settings

# Create FastAPI application
app = FastAPI(
    title="FinChatBot AI Service",
    description="Local RAG-based Financial Document Query System",
    version="2.0.0",
    docs_url="/docs",  # Swagger UI
    redoc_url="/redoc"  # ReDoc UI
)

# Configure CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="", tags=["AI Service"])


@app.get("/")
async def root():
    return {
        "service": "FinChatBot Python AI Service",
        "version": "2.0.0",
        "status": "running",
        "description": "Local RAG-based Financial Document Query System",
        "docs": "/docs",
        "health": "/health"
    }


@app.on_event("startup")
async def startup_event():
    """
    Startup event handler
    Runs when the application starts
    """
    print("\n" + "=" * 60)
    print("🚀 FinChatBot Python AI Service Starting...")
    print("=" * 60)
    
    # Validate critical configuration
    if not settings.GROQ_API_KEY and not settings.GOOGLE_API_KEY:
        print("❌ ERROR: At least one API key must be set!")
        print("GROQ_API_KEY (Primary): https://console.groq.com/keys")
        print("GOOGLE_API_KEY (Fallback): https://makersuite.google.com/app/apikey")
        print("=" * 60 + "\n")
        raise RuntimeError("At least one API key is required")
    
    if settings.GROQ_API_KEY:
        print(f"✅ Groq API Key: Configured (Primary)")
    else:
        print(f"⚠️  Groq API Key: Not set (will use Gemini only)")
    
    if settings.GOOGLE_API_KEY:
        print(f"✅ Gemini API Key: Configured (Fallback)")
    else:
        print(f"⚠️  Gemini API Key: Not set (will use Groq only)")
    
    # Create vector store directory
    try:
        os.makedirs(settings.VECTOR_STORE_PATH, exist_ok=True)
        print(f"✅ Vector Store Path: {settings.VECTOR_STORE_PATH}")
    except Exception as e:
        print(f"❌ Failed to create vector store directory: {e}")
        raise
    
    print(f"✅ Groq LLM Model: {settings.GROQ_LLM_MODEL}")
    print(f"✅ Groq Vision Model: {settings.GROQ_VISION_MODEL}")
    print(f"✅ Gemini LLM Model: {settings.GEMINI_LLM_MODEL}")
    print(f"✅ Gemini Vision Model: {settings.GEMINI_VISION_MODEL}")
    print(f"✅ Embedding Model: {settings.EMBEDDING_MODEL}")
    print(f"✅ Chunk Size: {settings.CHUNK_SIZE}")
    print(f"✅ Top K Results: {settings.TOP_K_RESULTS}")
    print("=" * 60)
    print("✅ Service ready to accept requests")
    print("=" * 60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    print("\n" + "=" * 60)
    print("FinChatBot Python AI Service Shutting Down...")
    print("=" * 60 + "\n")


# For local development
if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", settings.PORT))  # use Render's PORT if present

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
