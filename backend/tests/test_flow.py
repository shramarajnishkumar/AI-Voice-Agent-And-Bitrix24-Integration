import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app
from backend.app.database import init_db


@pytest.mark.asyncio
async def test_root_endpoint():
    await init_db()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "healthy" in data["status"]


@pytest.mark.asyncio
async def test_full_web_simulator_call_lifecycle():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Step 0: Init
        init_res = await ac.post("/api/calls/simulator/init", json={"caller_phone": "+1-555-432-1000"})
        assert init_res.status_code == 200
        session_id = init_res.json()["session_id"]
        assert session_id.startswith("SIM-")

        # Step 1: Answer Question 1 (Name & Company)
        ans1 = await ac.post(
            "/api/calls/simulator/answer",
            json={
                "session_id": session_id,
                "step": 1,
                "user_speech": "My name is Rachel Green from Green Enterprises",
            },
        )
        assert ans1.status_code == 200
        assert ans1.json()["step"] == 1
        assert ans1.json()["is_completed"] is False

        # Step 2: Answer Question 2 (Desired Service)
        ans2 = await ac.post(
            "/api/calls/simulator/answer",
            json={
                "session_id": session_id,
                "step": 2,
                "user_speech": "We want automated phone customer service and CRM synchronization",
            },
        )
        assert ans2.status_code == 200
        assert ans2.json()["step"] == 2

        # Step 3: Answer Question 3 (Contact Channel)
        ans3 = await ac.post(
            "/api/calls/simulator/answer",
            json={
                "session_id": session_id,
                "step": 3,
                "user_speech": "Please email me at rachel@green-ent.com or call me",
            },
        )
        assert ans3.status_code == 200
        data3 = ans3.json()
        assert data3["is_completed"] is True
        assert data3["extracted_data"] is not None
        assert "Rachel Green" in data3["extracted_data"]["caller_name"]
        assert "Green Enterprises" in data3["extracted_data"]["company_name"]
        assert data3["bitrix_status"] in ["synced", "mock_synced"]
        assert data3["bitrix_lead_id"] is not None

        # Verify call appears in list
        calls_res = await ac.get("/api/calls")
        assert calls_res.status_code == 200
        calls = calls_res.json()
        matching = [c for c in calls if c["session_id"] == session_id]
        assert len(matching) == 1
        assert matching[0]["bitrix_lead_id"] is not None


@pytest.mark.asyncio
async def test_twilio_voice_and_gather_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Inbound Call
        res = await ac.post(
            "/api/twilio/voice",
            data={"CallSid": "CA1234567890abcdef", "From": "+18005550199"},
        )
        assert res.status_code == 200
        assert "xml" in res.headers["content-type"]
        assert "<Gather" in res.text
        assert "action=" in res.text

        # Gather step 1
        gather1 = await ac.post(
            "/api/twilio/gather?step=1",
            data={
                "CallSid": "CA1234567890abcdef",
                "SpeechResult": "This is Tony Stark with Stark Industries",
            },
        )
        assert gather1.status_code == 200
        assert "<Gather" in gather1.text
        assert "step=2" in gather1.text
