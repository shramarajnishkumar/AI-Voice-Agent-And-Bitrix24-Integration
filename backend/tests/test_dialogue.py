import pytest
from backend.app.services.dialogue_service import DialogueService, DialogueTurnResult

@pytest.mark.asyncio
async def test_dialogue_initial_greeting():
    dialogue = DialogueService()
    greeting = dialogue.get_initial_greeting()
    assert greeting is not None
    assert "Aura" in greeting
    assert "CloudSolutions AI" in greeting
    assert "name" in greeting.lower()


@pytest.mark.asyncio
async def test_dialogue_empty_speech():
    dialogue = DialogueService()
    res = await dialogue.generate_next_turn(
        transcript="",
        latest_user_speech="",
        current_step=0,
    )
    assert res.is_complete is False
    assert "didn't quite catch that" in res.speech_reply.lower()


@pytest.mark.asyncio
async def test_dialogue_openai_multi_field_response():
    dialogue = DialogueService()
    # Test that when caller provides name, company, and service in one sentence:
    res = await dialogue.generate_next_turn(
        transcript="Bot: Hello! May I have your name and company?\n",
        latest_user_speech="Hi, my name is Alex from Nexus Technologies and we need cloud migration services.",
        current_step=0,
    )
    assert res.speech_reply is not None
    assert len(res.speech_reply) > 0
    # Should not be complete yet since contact channel is needed
    assert res.is_complete is False
    # Check that it asks for contact information or acknowledges Alex / Nexus
    reply_lower = res.speech_reply.lower()
    assert any(term in reply_lower for term in ["phone", "email", "contact", "reach", "follow"])


@pytest.mark.asyncio
async def test_dialogue_openai_completion_turn():
    dialogue = DialogueService()
    transcript = (
        "Bot: Hello! May I have your name and company?\n"
        "Caller: My name is Alex from Nexus Technologies and we need cloud migration.\n"
        "Bot: Thank you Alex! What is the best email or phone number to reach you?\n"
    )
    res = await dialogue.generate_next_turn(
        transcript=transcript,
        latest_user_speech="My email is alex@nexustech.io and phone is 555-019-8833.",
        current_step=2,
    )
    assert res.speech_reply is not None
    assert res.is_complete is True
    # Should deliver a warm closing
    reply_lower = res.speech_reply.lower()
    assert any(term in reply_lower for term in ["thank", "logged", "inquiry", "follow up", "great day"])
