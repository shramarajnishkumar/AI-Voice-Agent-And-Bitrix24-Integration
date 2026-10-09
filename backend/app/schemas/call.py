from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime


class WebCallInitRequest(BaseModel):
    caller_phone: Optional[str] = "+1 (555) 019-2834"


class WebCallAnswerRequest(BaseModel):
    session_id: str
    step: int
    user_speech: str


class WebCallResponse(BaseModel):
    session_id: str
    step: int
    bot_prompt: str
    is_completed: bool = False
    extracted_data: Optional[Dict[str, Any]] = None
    bitrix_status: Optional[str] = None
    bitrix_lead_id: Optional[str] = None
    transcript: str


class CallSessionOut(BaseModel):
    id: int
    session_id: str
    source: str
    caller_phone: Optional[str] = None
    status: str
    current_step: int
    transcript: str
    raw_answers: Dict[str, Any]
    extracted_data: Optional[Dict[str, Any]] = None
    bitrix_lead_id: Optional[str] = None
    bitrix_status: str
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class LeadOut(BaseModel):
    id: int
    session_id: str
    title: str
    caller_name: Optional[str] = None
    company_name: Optional[str] = None
    desired_service: Optional[str] = None
    contact_channel: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    bitrix_lead_id: Optional[str] = None
    bitrix_payload: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class BitrixTestRequest(BaseModel):
    webhook_url: Optional[str] = None
    test_lead_name: Optional[str] = "Demo Caller"
    test_company: Optional[str] = "Acme Global Solutions"
    test_service: Optional[str] = "Enterprise AI Integration"
    test_phone: Optional[str] = "+1-555-0199"
    test_email: Optional[str] = "demo@acmeglobal.com"
