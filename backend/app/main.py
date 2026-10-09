import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import get_settings
from backend.app.database import init_db
from backend.app.api.twilio_router import router as twilio_router
from backend.app.api.call_router import router as call_router
from backend.app.api.bitrix_router import router as bitrix_router
from backend.app.api.health_router import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voice_agent")
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database schema...")
    await init_db()
    logger.info("Voice Agent Server started successfully on port %s", settings.PORT)
    yield
    logger.info("Voice Agent Server shutting down...")


app = FastAPI(
    title="AI Voice Telephony Agent to Bitrix24",
    description=(
        "Production-grade inbound AI phone agent integrating Twilio Voice, "
        "Speech-to-Text, NLP Entity Extraction, and Bitrix24 CRM REST API."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(twilio_router)
app.include_router(call_router)
app.include_router(bitrix_router)
app.include_router(health_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "AI Voice Agent to Bitrix24",
        "status": "online",
        "documentation": "/docs",
        "api_endpoints": {
            "twilio_inbound_voice": "/api/twilio/voice",
            "twilio_gather_callback": "/api/twilio/gather",
            "web_call_simulator": "/api/calls/simulator/init",
            "call_logs": "/api/calls",
            "crm_leads": "/api/calls/leads",
            "bitrix_status": "/api/bitrix/config",
            "health_check": "/api/health",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
