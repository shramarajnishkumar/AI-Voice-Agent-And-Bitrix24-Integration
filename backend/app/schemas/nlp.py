from typing import Optional
from pydantic import BaseModel, Field


class ExtractedLeadData(BaseModel):
    caller_name: Optional[str] = Field(None, description="Extracted caller first and last name")
    company_name: Optional[str] = Field(None, description="Extracted company or organization name")
    desired_service: Optional[str] = Field(None, description="Specific service, product, or solution requested")
    contact_channel: Optional[str] = Field(None, description="Preferred contact method or channel (email, phone, whatsapp, etc.)")
    phone: Optional[str] = Field(None, description="Extracted phone number if mentioned")
    email: Optional[str] = Field(None, description="Extracted email address if mentioned")
    confidence_score: float = Field(default=0.85, ge=0.0, le=1.0, description="Confidence of extraction")
    summary: str = Field(..., description="Short 1-2 sentence executive summary of the inquiry")
