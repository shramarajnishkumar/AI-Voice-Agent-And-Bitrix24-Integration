import pytest
from backend.app.services.telephony_service import TelephonyService
from backend.app.services.dialogue_service import DialogueService
from backend.app.config import get_settings

settings = get_settings()


def test_telephony_locale_detection():
    service = TelephonyService()
    
    # Indian mobile number
    voice_in, lang_in = service.get_locale_config("+919097603646")
    assert lang_in == "en-IN"
    assert "Kajal" in voice_in

    # US phone number
    voice_us, lang_us = service.get_locale_config("+17372508034")
    assert lang_us == "en-US"
    assert "Joanna" in voice_us


def test_gather_twiml_configuration():
    service = TelephonyService()
    twiml = service.generate_dynamic_twiml(
        prompt_text="What service are you looking for?",
        next_step=2,
        is_completed=False,
        base_url="https://test.trycloudflare.com",
        caller_phone="+919097603646",
    )
    
    assert "language=\"en-IN\"" in twiml
    assert f'speechTimeout="{settings.TWILIO_SPEECH_TIMEOUT}"' in twiml
    assert f'timeout="{settings.TWILIO_GATHER_TIMEOUT}"' in twiml
    assert "hints=" in twiml
    assert "Polly.Kajal-Neural" in twiml
    assert "<Gather" in twiml
    assert "step=2" in twiml
    assert "speechModel=" in twiml


def test_prevent_hangup_on_question():
    service = TelephonyService()
    # Even if is_completed is erroneously passed True, if it's a question it must NOT hang up
    twiml = service.generate_dynamic_twiml(
        prompt_text="Could you please provide your contact email or phone number for follow-up?",
        next_step=4,
        is_completed=True,
        base_url="https://test.trycloudflare.com",
        caller_phone="+919097603646",
    )
    
    assert "<Gather" in twiml
    assert "step=4" in twiml


def test_clean_closing_hangup():
    service = TelephonyService()
    twiml = service.generate_dynamic_twiml(
        prompt_text="Thank you so much! We have registered your inquiry and our team will follow up shortly. Have a wonderful day!",
        next_step=5,
        is_completed=True,
        base_url="https://test.trycloudflare.com",
        caller_phone="+919097603646",
    )
    
    assert "<Hangup" in twiml
    assert "<Gather" not in twiml
