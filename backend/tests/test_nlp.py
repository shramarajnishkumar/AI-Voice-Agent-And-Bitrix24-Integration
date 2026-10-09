import pytest
from backend.app.services.nlp_service import NLPService


@pytest.mark.asyncio
async def test_heuristic_nlp_standard_dialogue():
    nlp = NLPService(provider="heuristic")
    raw_answers = {
        "q1": "My name is John Smith and my company is Apex Technologies",
        "q2": "We are looking for cloud migration and voice AI agents",
        "q3": "You can reach me at john.smith@apex.com or phone 555-123-4567",
    }
    result = await nlp.extract_lead_info(raw_answers, caller_phone="+15551234567")

    assert "John Smith" in result.caller_name
    assert "Apex Technologies" in result.company_name
    assert "Cloud migration" in result.desired_service
    assert result.email == "john.smith@apex.com"
    assert result.phone is not None
    assert result.confidence_score > 0.7


@pytest.mark.asyncio
async def test_heuristic_nlp_comma_format():
    nlp = NLPService(provider="heuristic")
    raw_answers = {
        "q1": "Sarah Connor, Cyberdyne Systems",
        "q2": "Security auditing and automated CRM telephony",
        "q3": "Please email me at sarah@cyberdyne.io",
    }
    result = await nlp.extract_lead_info(raw_answers, caller_phone="+19998887777")

    assert result.caller_name == "Sarah Connor"
    assert result.company_name == "Cyberdyne Systems"
    assert "Security auditing" in result.desired_service
    assert result.email == "sarah@cyberdyne.io"
