"""
Main Application Entry Point
FastAPI application setup and configuration
"""

import os
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import router
from app.core.settings import settings

# ── Suppress asyncio CancelledError noise on Windows clean shutdown ──────────
# On Windows, uvicorn raises CancelledError during Ctrl+C shutdown. This is
# normal behavior — not an application error. We silence the asyncio logger
# for CancelledError to keep the console clean.
logging.getLogger("asyncio").setLevel(logging.CRITICAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown logic."""
    # ── Startup ──────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Financial Analysis Python Service Starting...")
    print("=" * 60)
    print(f"Vector Store Path : {settings.VECTOR_STORE_PATH}")
    print(f"LLM Model         : {settings.LLM_MODEL}")
    print(f"Embedding Model   : {settings.EMBEDDING_MODEL}")
    print(f"Chunk Size        : {settings.CHUNK_SIZE}")
    print(f"Top K Results     : {settings.TOP_K_RESULTS}")
    print("=" * 60)
    print("Service ready to accept requests")
    print("=" * 60 + "\n")

    yield  # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("Financial Analysis Python Service Shutting Down...")
    print("=" * 60 + "\n")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Financial Analysis AI Service",
    description="RAG-based Financial Document Query System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────────────────────
# Allow the Node.js backend and the React dev server.
# In production set NODE_BACKEND_ORIGIN and FRONTEND_ORIGIN in the .env.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "")
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

if not _origins:
    # Default: allow local dev origins
    _origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(router, prefix="", tags=["AI Service"])


@app.get("/")
async def root():
    return {
        "service": "Financial Analysis Python Service",
        "version": "2.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


# ── Local dev runner ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=True,
        log_level="info",
    )
