from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:5173", "http://localhost:3000", "*"]

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/voice_agent.db"

    # Bitrix24 Inbound Webhook
    BITRIX24_WEBHOOK_URL: str = ""
    BITRIX24_DEFAULT_ASSIGNED_BY_ID: int = 1

    # Telephony
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    TWILIO_SPEECH_LANGUAGE: str = "auto"  # "auto", "en-IN", "en-US", "en-GB"
    TWILIO_SPEECH_TIMEOUT: Union[int, str] = "auto"  # "auto" or integer seconds of silence
    TWILIO_SPEECH_MODEL: str = "experimental_conversations"  # "experimental_conversations", "phone_call", "default"
    TWILIO_GATHER_TIMEOUT: int = 8        # Seconds to wait for caller to begin speaking
    LLM_TURN_TIMEOUT: float = 1.2         # Max seconds to wait for LLM turn before instant contextual fallback
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # NLP Extraction
    NLP_PROVIDER: str = "openai"  # "openai", "heuristic", "ollama"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Voice Bot Questions
    AGENT_NAME: str = "Aura"
    COMPANY_NAME: str = "CloudSolutions AI"
    QUESTION_1: str = "Hello, thank you for calling CloudSolutions! To direct you properly, may I please know your name and your company name?"
    QUESTION_2: str = "Thank you! What specific service or technical solution are you looking for today?"
    QUESTION_3: str = "Got it. What is the best contact phone number or email address for our team to follow up with you?"
    CLOSING_MESSAGE: str = "Thank you so much! I have registered your inquiry into our CRM system, and our specialist will reach out shortly. Have a great day!"

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("CORS_ORIGINS", mode="before")
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


@lru_cache()
def get_settings() -> Settings:
    return Settings()
