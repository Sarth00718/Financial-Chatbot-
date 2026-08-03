from fastapi import APIRouter
from app.api.endpoints import health, documents, chat, enterprise

router = APIRouter()

router.include_router(health.router, tags=["Health"])
router.include_router(documents.router, tags=["Documents"])
router.include_router(chat.router, tags=["Chat"])
router.include_router(enterprise.router, prefix="/enterprise", tags=["Enterprise"])
