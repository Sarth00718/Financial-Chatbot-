from fastapi import APIRouter
from app.schemas.domain_schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy", message="Financial Analysis Python Service is running"
    )
