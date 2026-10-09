from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class BitrixMultifieldItem(BaseModel):
    VALUE: str
    VALUE_TYPE: str = "WORK"


class BitrixLeadFields(BaseModel):
    TITLE: str
    NAME: Optional[str] = None
    LAST_NAME: Optional[str] = None
    COMPANY_TITLE: Optional[str] = None
    STATUS_ID: str = "NEW"
    OPENED: str = "Y"
    ASSIGNED_BY_ID: int = 1
    COMMENTS: Optional[str] = None
    PHONE: Optional[List[BitrixMultifieldItem]] = None
    EMAIL: Optional[List[BitrixMultifieldItem]] = None
    SOURCE_ID: str = "CALL"
    SOURCE_DESCRIPTION: str = "AI Automated Inbound Voice Call"


class BitrixCreateLeadPayload(BaseModel):
    fields: BitrixLeadFields
    params: Dict[str, Any] = Field(default_factory=lambda: {"REGISTER_SONET_EVENT": "Y"})


class BitrixLeadResponse(BaseModel):
    success: bool
    lead_id: Optional[str] = None
    is_mock: bool = False
    message: str
    raw_response: Optional[Dict[str, Any]] = None
