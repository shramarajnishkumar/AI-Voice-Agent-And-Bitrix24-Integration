import logging
from typing import Optional
from fastapi import APIRouter
from backend.app.schemas.call import BitrixTestRequest
from backend.app.schemas.nlp import ExtractedLeadData
from backend.app.services.bitrix24_service import Bitrix24Service
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/bitrix", tags=["Bitrix24 Integration"])


@router.get("/config")
async def get_bitrix_config():
    """
    Get Bitrix24 integration status and active webhook information.
    """
    url = settings.BITRIX24_WEBHOOK_URL or ""
    masked_url = ""
    if url:
        # Mask sensitive part
        if len(url) > 25:
            masked_url = url[:20] + "..." + url[-6:]
        else:
            masked_url = url

    bitrix = Bitrix24Service()
    is_mock = bitrix.is_mock_mode()

    return {
        "is_configured": bool(url and not is_mock),
        "is_mock_mode": is_mock,
        "webhook_url_masked": masked_url,
        "raw_webhook_configured": bool(url),
        "default_assigned_by_id": settings.BITRIX24_DEFAULT_ASSIGNED_BY_ID,
    }


@router.post("/test-connection")
async def test_bitrix_connection(payload: Optional[BitrixTestRequest] = None):
    """
    Test connectivity to the Bitrix24 webhook endpoint.
    """
    custom_url = payload.webhook_url if payload else None
    svc = Bitrix24Service(webhook_url=custom_url)
    res = await svc.test_connection()
    return res


@router.post("/test-lead")
async def send_test_lead(payload: BitrixTestRequest):
    """
    Send a test lead to Bitrix24 with user-provided or default sample data.
    """
    svc = Bitrix24Service(webhook_url=payload.webhook_url)

    extracted = ExtractedLeadData(
        caller_name=payload.test_lead_name or "Alex Developer",
        company_name=payload.test_company or "Innovate AI Corp",
        desired_service=payload.test_service or "AI Voice Inbound Automation",
        contact_channel=f"Email & Phone: {payload.test_email} / {payload.test_phone}",
        phone=payload.test_phone or "+1-555-0199",
        email=payload.test_email or "alex@innovateai.com",
        confidence_score=1.0,
        summary="Test lead dispatched manually to confirm Bitrix24 REST API webhook functionality.",
    )

    sample_transcript = (
        "Caller: Hello, this is Alex from Innovate AI Corp.\n"
        "Bot: What service are you looking for?\n"
        "Caller: We want AI voice telephony integrated into Bitrix24.\n"
        "Bot: How can we contact you?\n"
        "Caller: Reach me at alex@innovateai.com or +1-555-0199.\n"
    )

    lead_resp = await svc.create_lead(
        extracted=extracted,
        caller_phone=payload.test_phone,
        full_transcript=sample_transcript,
        session_id="TEST-MANUAL-VERIFICATION",
    )

    return lead_resp
