import pytest
import time
from backend.app.services.dialogue_service import DialogueService
from backend.app.services.telephony_service import TelephonyService
from backend.app.config import get_settings

settings = get_settings()


@pytest.mark.asyncio
async def test_turn_latency_strictly_under_2_seconds():
    """
    Validates that every single conversational turn generates a response well within 2.0 seconds.
    """
    dialogue = DialogueService()

    # Turn 1: Caller states name & company
    t0 = time.time()
    res1 = await dialogue.generate_next_turn(
        transcript="Bot: Hello! May I please have your name and company name?\n",
        latest_user_speech="My name is Rajnish Kumar from Robotic Solutions",
        current_step=0,
    )
    t1 = time.time()
    elapsed1 = t1 - t0
    assert elapsed1 < 2.0, f"Turn 1 took {elapsed1:.3f}s (exceeded 2.0s limit)"
    assert res1.speech_reply is not None
    assert res1.is_complete is False

    # Turn 2: Caller states desired service
    t2 = time.time()
    res2 = await dialogue.generate_next_turn(
        transcript=(
            "Bot: Hello! May I please have your name and company name?\n"
            "Caller: My name is Rajnish Kumar from Robotic Solutions\n"
            f"Bot: {res1.speech_reply}\n"
        ),
        latest_user_speech="We need cloud migration and DevOps consulting",
        current_step=1,
    )
    t3 = time.time()
    elapsed2 = t3 - t2
    assert elapsed2 < 2.0, f"Turn 2 took {elapsed2:.3f}s (exceeded 2.0s limit)"
    assert res2.speech_reply is not None
    assert res2.is_complete is False

    # Turn 3: Caller states contact info (completion turn)
    t4 = time.time()
    res3 = await dialogue.generate_next_turn(
        transcript=(
            "Bot: Hello! May I please have your name and company name?\n"
            "Caller: My name is Rajnish Kumar from Robotic Solutions\n"
            f"Bot: {res1.speech_reply}\n"
            "Caller: We need cloud migration and DevOps consulting\n"
            f"Bot: {res2.speech_reply}\n"
        ),
        latest_user_speech="My email is rajnish@gmail.com and phone is 9097603646",
        current_step=2,
    )
    t5 = time.time()
    elapsed3 = t5 - t4
    assert elapsed3 < 2.0, f"Turn 3 took {elapsed3:.3f}s (exceeded 2.0s limit)"
    assert res3.speech_reply is not None
    assert res3.is_complete is True


def test_telephony_proper_listening_configuration():
    """
    Validates Twilio Gather configuration for optimal STT acoustic fidelity:
    - speechTimeout='auto' (cuts off ~500ms after speech ends instead of waiting 2s silence)
    - speechModel='experimental_conversations' / 'phone_call' (tuned for telephone audio)
    - enhanced='true' (Google Cloud enhanced acoustic models)
    - profanityFilter='false' (prevents false asterisks)
    - Comprehensive acoustic hints
    """
    telephony = TelephonyService()
    twiml = telephony.generate_dynamic_twiml(
        prompt_text="What service are you looking for today?",
        next_step=2,
        is_completed=False,
        base_url="https://test.trycloudflare.com",
        caller_phone="+919097603646",
    )

    assert 'speechTimeout="auto"' in twiml
    assert 'speechModel="experimental_conversations"' in twiml
    assert 'enhanced="true"' in twiml
    assert 'profanityFilter="false"' in twiml
    assert 'hints=' in twiml
    assert 'Rajnish' in twiml
    assert 'Robotic' in twiml
    assert 'cloud migration' in twiml
    assert 'Polly.Kajal-Neural' in twiml


@pytest.mark.asyncio
async def test_instant_completion_on_direct_contact_info():
    """
    Validates that when caller supplies email/phone, completion response is instantaneous (< 0.1s).
    """
    dialogue = DialogueService()
    t0 = time.time()
    res = await dialogue.generate_next_turn(
        transcript="Bot: May I have your email or phone?\n",
        latest_user_speech="Reach me at john.doe@example.com",
        current_step=2,
    )
    elapsed = time.time() - t0
    assert elapsed < 0.2, f"Direct contact completion took {elapsed:.3f}s"
    assert res.is_complete is True
    assert "john.doe@example.com" in (res.contact_channel or "")


@pytest.mark.asyncio
async def test_no_premature_disconnect_with_dialing_log():
    """
    Critical regression test:
    When an outbound call starts, transcript contains 'Bot dialing +919097603646...'.
    When caller replies with name and company at Turn 1, the bot MUST NOT mistakenly treat
    the bot's dialing number as contact completion and hang up!
    The call MUST ask Question 2 and continue.
    """
    dialogue = DialogueService()
    transcript = "Bot dialing +919097603646...\nBot: Hello! May I please have your name and company name?\n"
    user_speech = "Yas my name ise Rajnish Kumar and my company name is portfolio identity."
    
    res = await dialogue.generate_next_turn(
        transcript=transcript,
        latest_user_speech=user_speech,
        current_step=1,
        caller_phone="+919097603646",
    )
    
    # Must NOT complete call at Turn 1!
    assert res.is_complete is False, "Call incorrectly completed at Turn 1!"
    # Must extract name cleanly (ignoring 'ise' / 'yas')
    assert res.caller_name == "Rajnish Kumar"
    # Must ask Question 2 (service or technical solution)
    assert any(term in res.speech_reply.lower() for term in ["service", "solution", "looking for", "assist"])

