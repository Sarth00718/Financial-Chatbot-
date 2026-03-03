"""
Main Application Entry Point
FastAPI application setup and configuration
"""

from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

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
# Allows frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="", tags=["AI Service"])


@app.get("/")
async def root():
    """
    Root endpoint
    Returns basic service information
    """
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
    print("\n" + "="*60)
    print("FinChatBot Python AI Service Starting...")
    print("="*60)
    print(f"Vector Store Path: {settings.VECTOR_STORE_PATH}")
    print(f"LLM Model: {settings.LLM_MODEL}")
    print(f"Embedding Model: {settings.EMBEDDING_MODEL}")
    print(f"Chunk Size: {settings.CHUNK_SIZE}")
    print(f"Top K Results: {settings.TOP_K_RESULTS}")
    print("="*60)
    print("Service ready to accept requests")
    print("="*60 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler
    Runs when the application stops
    """
    print("\n" + "="*60)
    print("FinChatBot Python AI Service Shutting Down...")
    print("="*60 + "\n")


# For local development
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
