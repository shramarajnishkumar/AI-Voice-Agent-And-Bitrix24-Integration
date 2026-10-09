import logging
from typing import Optional
from fastapi import APIRouter, Request, Depends, Query, BackgroundTasks, Response, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.database import get_db
from backend.app.models.call_session import CallSession
from backend.app.models.lead import LeadRecord
from backend.app.services.telephony_service import TelephonyService
from backend.app.services.dialogue_service import DialogueService
from backend.app.services.nlp_service import NLPService
from backend.app.services.bitrix24_service import Bitrix24Service
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/twilio", tags=["Twilio Voice Telephony"])
telephony_service = TelephonyService()
dialogue_service = DialogueService()
nlp_service = NLPService()
bitrix_service = Bitrix24Service()


async def process_call_completion(session_id: str):
    """
    Background worker: Extracts NLP entities and pushes lead to Bitrix24.
    """
    from backend.app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        stmt = select(CallSession).where(CallSession.session_id == session_id)
        result = await db.execute(stmt)
        session = result.scalars().first()
        if not session:
            logger.error("Session %s not found for completion processing", session_id)
            return

        try:
            logger.info("Starting NLP extraction for session %s", session_id)
            extracted = await nlp_service.extract_lead_info(
                raw_answers=session.raw_answers or {},
                caller_phone=session.caller_phone,
                transcript=session.transcript,
            )
            session.extracted_data = extracted.model_dump()

            logger.info("Pushing extracted lead to Bitrix24 for session %s", session_id)
            bitrix_resp = await bitrix_service.create_lead(
                extracted=extracted,
                caller_phone=session.caller_phone,
                full_transcript=session.transcript,
                session_id=session.session_id,
            )

            if bitrix_resp.success:
                session.bitrix_status = "mock_synced" if bitrix_resp.is_mock else "synced"
                session.bitrix_lead_id = bitrix_resp.lead_id
            else:
                session.bitrix_status = "failed"
                session.error_message = bitrix_resp.message

            # Save Lead Record
            lead_record = LeadRecord(
                session_id=session.session_id,
                title=f"Inbound Voice Lead: {extracted.company_name} - {extracted.desired_service}",
                caller_name=extracted.caller_name,
                company_name=extracted.company_name,
                desired_service=extracted.desired_service,
                contact_channel=extracted.contact_channel,
                phone=extracted.phone or session.caller_phone,
                email=extracted.email,
                bitrix_lead_id=session.bitrix_lead_id,
                bitrix_payload=bitrix_resp.raw_response,
                notes=extracted.summary,
            )
            db.add(lead_record)
            session.status = "completed"
            await db.commit()
            logger.info("Call session %s finalized with Bitrix status: %s", session_id, session.bitrix_status)
        except Exception as e:
            logger.exception("Error processing call completion for %s: %s", session_id, e)
            session.bitrix_status = "failed"
            session.error_message = str(e)
            await db.commit()


@router.post("/voice")
async def twilio_incoming_voice(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio Voice Incoming/Outbound Call Webhook.
    Answers call and greets with dynamic greeting without delay.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", f"CALL-{form_data.get('CallSid') or 'unknown'}")
    
    # Check if session already created by outbound dispatcher
    stmt = select(CallSession).where(CallSession.session_id == call_sid)
    result = await db.execute(stmt)
    session = result.scalars().first()

    direction = form_data.get("Direction", "")
    if "outbound" in direction and session and session.caller_phone:
        caller_phone = session.caller_phone
    elif "outbound" in direction:
        caller_phone = form_data.get("To") or form_data.get("From", "Anonymous")
    else:
        caller_phone = form_data.get("From", "Anonymous")

    # Determine public URL for Twilio callback actions
    base_url = settings.PUBLIC_BASE_URL.rstrip("/")
    if "localhost" in base_url:
        host = request.headers.get("host")
        if host:
            scheme = request.headers.get("x-forwarded-proto", "http")
            base_url = f"{scheme}://{host}"

    greeting = dialogue_service.get_initial_greeting()

    if not session:
        session = CallSession(
            session_id=call_sid,
            source="twilio",
            caller_phone=caller_phone,
            status="in_progress",
            current_step=0,
            transcript=f"Bot: {greeting}\n",
            raw_answers={},
        )
        db.add(session)
        await db.commit()
    elif not session.transcript:
        session.transcript = f"Bot: {greeting}\n"
        session.status = "in_progress"
        await db.commit()

    twiml = telephony_service.generate_initial_greeting_twiml(
        greeting_text=greeting,
        base_url=base_url,
        caller_phone=caller_phone,
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/gather")
async def twilio_gather_callback(
    request: Request,
    step: int = Query(..., description="Completed question step (1, 2, 3, etc.)"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio Speech Gather Callback with dynamic LLM dialogue.
    Passes caller speech to OpenAI LLM to dynamically generate contextual, smooth voice responses.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid", "")
    speech_result = form_data.get("SpeechResult", "").strip()

    base_url = settings.PUBLIC_BASE_URL.rstrip("/")
    if "localhost" in base_url:
        host = request.headers.get("host")
        if host:
            scheme = request.headers.get("x-forwarded-proto", "http")
            base_url = f"{scheme}://{host}"

    stmt = select(CallSession).where(CallSession.session_id == call_sid)
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        # Fallback create session if missing
        session = CallSession(
            session_id=call_sid,
            source="twilio",
            caller_phone=form_data.get("From", "Anonymous"),
            status="in_progress",
            current_step=step,
            transcript="",
            raw_answers={},
        )
        db.add(session)

    # Record speech answer
    raw_answers = dict(session.raw_answers or {})
    raw_answers[f"q{step}"] = speech_result
    session.raw_answers = raw_answers
    session.current_step = step

    transcript_addition = f"Caller: {speech_result or '[No speech detected]'}\n"
    session.transcript = (session.transcript or "") + transcript_addition

    # Generate dynamic LLM conversational reply
    turn_result = await dialogue_service.generate_next_turn(
        transcript=session.transcript,
        latest_user_speech=speech_result,
        current_step=step,
        caller_phone=session.caller_phone,
    )

    # Merge extracted details into raw_answers
    if turn_result.caller_name:
        raw_answers["caller_name"] = turn_result.caller_name
    if turn_result.company_name:
        raw_answers["company_name"] = turn_result.company_name
    if turn_result.desired_service:
        raw_answers["desired_service"] = turn_result.desired_service
    if turn_result.contact_channel:
        raw_answers["contact_channel"] = turn_result.contact_channel
    session.raw_answers = raw_answers

    session.transcript += f"Bot: {turn_result.speech_reply}\n"

    # Only mark completed if intake is genuinely done (step >= 3 with contact) or safety limit reached
    is_completed = turn_result.is_complete or step >= 5
    if is_completed and ("?" in turn_result.speech_reply or any(w in turn_result.speech_reply.lower() for w in ["what", "could you please", "may i have", "which", "can you provide"])):
        if step < 5:
            is_completed = False

    # Guard: Call must NEVER disconnect on step 1 or 2 unless all 3 requirements (Name, Service, Contact) are collected
    all_intake_gathered = bool(raw_answers.get("caller_name") and raw_answers.get("desired_service") and raw_answers.get("contact_channel"))
    if step < 3 and not all_intake_gathered:
        is_completed = False

    # If caller was silent, repeat current step rather than skipping forward
    next_step = (step + 1) if speech_result else step

    twiml = telephony_service.generate_dynamic_twiml(
        prompt_text=turn_result.speech_reply,
        next_step=next_step,
        is_completed=is_completed,
        base_url=base_url,
        caller_phone=session.caller_phone,
    )

    if is_completed:
        session.status = "processing"
        await db.commit()
        # Schedule NLP extraction and Bitrix push in background
        background_tasks.add_task(process_call_completion, call_sid)
    else:
        await db.commit()

    return Response(content=twiml, media_type="application/xml")


@router.post("/status")
async def twilio_status_callback(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Twilio Call Status tracking webhook.
    """
    form_data = await request.form()
    call_sid = form_data.get("CallSid")
    call_status = form_data.get("CallStatus", "completed")

    if call_sid:
        stmt = select(CallSession).where(CallSession.session_id == call_sid)
        result = await db.execute(stmt)
        session = result.scalars().first()
        if session and session.status != "completed":
            if call_status in ["completed", "canceled", "failed", "busy", "no-answer"]:
                session.status = call_status
                await db.commit()

    return {"status": "ok"}


class OutboundCallPayload(BaseModel):
    to_phone: str = "+919097603646"


@router.post("/outbound-call")
async def trigger_outbound_call(
    payload: OutboundCallPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger an outbound call from the Twilio Bot directly to a user's mobile phone.
    """
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN:
        raise HTTPException(status_code=400, detail="TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be configured in .env")

    if not settings.TWILIO_PHONE_NUMBER:
        raise HTTPException(status_code=400, detail="TWILIO_PHONE_NUMBER must be configured in .env")

    base_url = settings.PUBLIC_BASE_URL.rstrip("/")
    if "localhost" in base_url or "127.0.0.1" in base_url:
        raise HTTPException(
            status_code=400,
            detail=(
                "PUBLIC_BASE_URL is currently set to localhost. "
                "Twilio cannot reach your local machine. "
                "Please run 'ngrok http 8000' and paste the https://...ngrok-free.app URL into backend/.env as PUBLIC_BASE_URL!"
            ),
        )

    to_number = payload.to_phone.strip()
    if not to_number.startswith("+"):
        if len(to_number) == 10:
            to_number = f"+91{to_number}"
        else:
            to_number = f"+{to_number}"

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        webhook_url = f"{base_url}/api/twilio/voice"

        call = client.calls.create(
            to=to_number,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=webhook_url,
            status_callback=f"{base_url}/api/twilio/status",
            status_callback_event=["completed", "answered"],
        )

        session = CallSession(
            session_id=call.sid,
            source="twilio_outbound",
            caller_phone=to_number,
            status="dialing",
            current_step=0,
            transcript=f"Bot dialing {to_number}...\n",
            raw_answers={},
        )
        db.add(session)
        await db.commit()

        return {
            "success": True,
            "call_sid": call.sid,
            "status": call.status,
            "to": to_number,
            "from": settings.TWILIO_PHONE_NUMBER,
            "message": f"Twilio is calling {to_number} right now! Answer your phone to speak with the AI bot.",
        }
    except Exception as e:
        logger.exception("Failed to dispatch outbound call: %s", e)
        raise HTTPException(status_code=500, detail=f"Twilio error: {str(e)}")

