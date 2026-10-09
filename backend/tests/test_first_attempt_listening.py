import pytest
import time
from backend.app.services.dialogue_service import DialogueService, extract_entities_fast


@pytest.mark.asyncio
async def test_first_attempt_full_intake_flow():
    service = DialogueService()
    transcript = "Bot: Hello! Thank you for calling. May I please have your name and company name?\n"

    # Turn 1: Caller answers Question 1
    t0 = time.time()
    turn1 = await service.generate_next_turn(
        transcript=transcript,
        latest_user_speech="my name ise Rajnish Kumar and my company name ise portfolio identity",
        current_step=1,
        caller_phone="+919097603646",
    )
    t1 = time.time()
    latency_ms = (t1 - t0) * 1000

    assert turn1.is_complete is False
    assert "service" in turn1.speech_reply.lower() or "solution" in turn1.speech_reply.lower()
    assert "?" in turn1.speech_reply
    # Must acknowledge caller name
    assert "Rajnish Kumar" in turn1.speech_reply
    assert latency_ms < 50.0  # Instantaneous!
    transcript += f"Caller: my name ise Rajnish Kumar and my company name ise portfolio identity\nBot: {turn1.speech_reply}\n"

    # Turn 2: Caller answers Question 2
    t0 = time.time()
    turn2 = await service.generate_next_turn(
        transcript=transcript,
        latest_user_speech="looking for interview for my portfolio identity website",
        current_step=2,
        caller_phone="+919097603646",
    )
    t1 = time.time()
    assert turn2.is_complete is False
    assert "phone" in turn2.speech_reply.lower() or "email" in turn2.speech_reply.lower()
    assert (t1 - t0) * 1000 < 50.0
    transcript += f"Caller: looking for interview for my portfolio identity website\nBot: {turn2.speech_reply}\n"

    # Turn 3: Caller answers Question 3 on FIRST attempt (informal Hinglish email phrasing without @ sign)
    t0 = time.time()
    turn3 = await service.generate_next_turn(
        transcript=transcript,
        latest_user_speech="main contact number adress Hamara Rajnish Kumar 20001 gmail.com",
        current_step=3,
        caller_phone="+919097603646",
    )
    t1 = time.time()

    # CRITICAL: MUST BE COMPLETE ON FIRST ATTEMPT! Never repeat Question 3!
    assert turn3.is_complete is True
    assert "?" not in turn3.speech_reply
    assert "thank you" in turn3.speech_reply.lower()
    assert (t1 - t0) * 1000 < 50.0


def test_entity_extraction_clean_service_and_email():
    transcript = (
        "Caller: my name ise Rajnish Kumar and my company name ise portfolio identity\n"
        "Caller: looking for interview for my portfolio identity website\n"
        "Caller: main contact number adress Hamara Rajnish Kumar 20001 gmail.com\n"
    )
    extracted = extract_entities_fast(
        text="main contact number adress Hamara Rajnish Kumar 20001 gmail.com",
        cumulative_transcript=transcript,
    )
    assert extracted["caller_name"] == "Rajnish Kumar"
    assert "Portfolio Identity" in extracted["company_name"]
    # Service must not greedily contain subsequent turns
    assert "interview for my portfolio identity website" in extracted["desired_service"].lower()
    assert "gmail.com" not in extracted["desired_service"]
    assert extracted["email"] == "rajnishkumar20001@gmail.com"
