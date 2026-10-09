from typing import Optional
from pydantic import BaseModel


class TwilioVoiceWebhookPayload(BaseModel):
    CallSid: str
    From: Optional[str] = None
    To: Optional[str] = None
    CallStatus: Optional[str] = None
    Direction: Optional[str] = None
    ApiVersion: Optional[str] = None


class TwilioGatherWebhookPayload(BaseModel):
    CallSid: str
    SpeechResult: Optional[str] = None
    Confidence: Optional[float] = None
    Digits: Optional[str] = None
    From: Optional[str] = None
    To: Optional[str] = None
    CallStatus: Optional[str] = None
