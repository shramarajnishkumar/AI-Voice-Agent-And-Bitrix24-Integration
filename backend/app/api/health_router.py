import logging
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from backend.app.database import get_db
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/health", tags=["System Health"])


@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Application health status and database connectivity.
    """
    db_status = "healthy"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error("DB health check failed: %s", e)
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if "unhealthy" not in db_status else "degraded",
        "service": "Voice Agent to Bitrix24 Telephony Engine",
        "environment": settings.ENVIRONMENT,
        "database": db_status,
        "nlp_provider": settings.NLP_PROVIDER,
        "openai_model": settings.OPENAI_MODEL,
        "telephony": {
            "twilio_configured": bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN),
            "phone_number": settings.TWILIO_PHONE_NUMBER or "Not Configured",
        },
        "bitrix24": {
            "configured": bool(settings.BITRIX24_WEBHOOK_URL and "your-domain" not in settings.BITRIX24_WEBHOOK_URL),
        },
    }
