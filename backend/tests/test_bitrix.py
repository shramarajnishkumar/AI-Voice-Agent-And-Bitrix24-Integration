import pytest
from backend.app.services.bitrix24_service import Bitrix24Service
from backend.app.schemas.nlp import ExtractedLeadData


@pytest.mark.asyncio
async def test_bitrix_payload_building():
    svc = Bitrix24Service()
    extracted = ExtractedLeadData(
        caller_name="Alice Wonder",
        company_name="Wonderland Logistics",
        desired_service="Automated Dispatch Integration",
        contact_channel="alice@wonderland.com",
        phone="+15559876543",
        email="alice@wonderland.com",
        confidence_score=0.9,
        summary="Caller wants dispatch integration.",
    )

    payload = svc.build_lead_payload(
        extracted=extracted,
        caller_phone="+15559876543",
        full_transcript="Sample call transcript",
        session_id="TEST-SESSION-01",
    )

    assert "Wonderland Logistics" in payload.fields.TITLE
    assert payload.fields.NAME == "Alice Wonder"
    assert payload.fields.COMPANY_TITLE == "Wonderland Logistics"
    assert payload.fields.STATUS_ID == "NEW"
    assert payload.fields.SOURCE_ID == "CALL"
    assert len(payload.fields.PHONE) > 0
    assert payload.fields.PHONE[0].VALUE == "+15559876543"
    assert len(payload.fields.EMAIL) > 0
    assert payload.fields.EMAIL[0].VALUE == "alice@wonderland.com"


@pytest.mark.asyncio
async def test_bitrix_mock_lead_creation():
    svc = Bitrix24Service(webhook_url="")
    extracted = ExtractedLeadData(
        caller_name="Bob Builder",
        company_name="Builder Corp",
        desired_service="Construction CRM",
        contact_channel="Phone",
        phone="+15551112233",
        email=None,
        confidence_score=0.85,
        summary="Bob needs CRM setup.",
    )

    resp = await svc.create_lead(extracted=extracted, session_id="TEST-BOB-01")
    assert resp.success is True
    assert resp.is_mock is True
    assert resp.lead_id is not None
