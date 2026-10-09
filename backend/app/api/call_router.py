import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.app.database import get_db
from backend.app.models.call_session import CallSession
from backend.app.models.lead import LeadRecord
from backend.app.schemas.call import (
    WebCallInitRequest,
    WebCallAnswerRequest,
    WebCallResponse,
    CallSessionOut,
    LeadOut,
)
from backend.app.services.dialogue_service import DialogueService
from backend.app.services.nlp_service import NLPService
from backend.app.services.bitrix24_service import Bitrix24Service
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api/calls", tags=["Calls & Web Simulator"])
dialogue_service = DialogueService()
nlp_service = NLPService()
bitrix_service = Bitrix24Service()


@router.post("/simulator/init", response_model=WebCallResponse)
async def init_web_simulator_call(
    payload: WebCallInitRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Initialize a voice simulation session from the React dashboard.
    """
    session_id = f"SIM-{uuid.uuid4().hex[:10].upper()}"
    prompt = dialogue_service.get_initial_greeting()

    session = CallSession(
        session_id=session_id,
        source="web_simulator",
        caller_phone=payload.caller_phone or "+1 (555) 019-2834",
        status="in_progress",
        current_step=0,
        transcript=f"Bot: {prompt}\n",
        raw_answers={},
    )
    db.add(session)
    await db.commit()

    return WebCallResponse(
        session_id=session_id,
        step=0,
        bot_prompt=prompt,
        is_completed=False,
        transcript=session.transcript,
    )


@router.post("/simulator/answer", response_model=WebCallResponse)
async def answer_web_simulator_step(
    payload: WebCallAnswerRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Submit user's speech answer for the current step in the simulator.
    LLM dynamically analyzes caller input and generates contextual next question or closing.
    """
    stmt = select(CallSession).where(CallSession.session_id == payload.session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()

    if not session:
        raise HTTPException(status_code=404, detail="Call session not found")

    step = payload.step
    user_speech = payload.user_speech.strip()

    raw_answers = dict(session.raw_answers or {})
    raw_answers[f"q{step}"] = user_speech
    session.raw_answers = raw_answers
    session.transcript = (session.transcript or "") + f"Caller: {user_speech}\n"

    # Generate dynamic LLM conversational reply
    turn_result = await dialogue_service.generate_next_turn(
        transcript=session.transcript,
        latest_user_speech=user_speech,
        current_step=step - 1,
        caller_phone=session.caller_phone,
    )

    # Save any directly recognized entities into raw_answers
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
    session.current_step = step

    is_completed = turn_result.is_complete or step >= 5
    if is_completed and ("?" in turn_result.speech_reply or any(w in turn_result.speech_reply.lower() for w in ["what", "could you please", "may i have", "which", "can you provide"])):
        if step < 5:
            is_completed = False

    # Guard: Call must NEVER complete prematurely on step 1 or 2 unless all 3 requirements (Name, Service, Contact) are collected
    all_intake_gathered = bool(raw_answers.get("caller_name") and raw_answers.get("desired_service") and raw_answers.get("contact_channel"))
    if step < 3 and not all_intake_gathered:
        is_completed = False

    if not is_completed:
        await db.commit()
        return WebCallResponse(
            session_id=session.session_id,
            step=step,
            bot_prompt=turn_result.speech_reply,
            is_completed=False,
            transcript=session.transcript,
        )

    # Final step reached: Complete session, run NLP & push to Bitrix24
    session.status = "processing"

    # NLP Extraction
    extracted = await nlp_service.extract_lead_info(
        raw_answers=session.raw_answers,
        caller_phone=session.caller_phone,
        transcript=session.transcript,
    )
    session.extracted_data = extracted.model_dump()

    # Push to Bitrix24
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

    session.status = "completed"

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
    await db.commit()

    return WebCallResponse(
        session_id=session.session_id,
        step=step,
        bot_prompt=turn_result.speech_reply,
        is_completed=True,
        extracted_data=session.extracted_data,
        bitrix_status=session.bitrix_status,
        bitrix_lead_id=session.bitrix_lead_id,
        transcript=session.transcript,
    )


@router.get("", response_model=List[CallSessionOut])
async def list_calls(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    List all recorded call sessions.
    """
    stmt = select(CallSession).order_by(desc(CallSession.created_at)).limit(limit)
    result = await db.execute(stmt)
    calls = result.scalars().all()
    return [CallSessionOut(**c.to_dict()) for c in calls]


@router.get("/leads", response_model=List[LeadOut])
async def list_leads(
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    """
    List all generated CRM leads.
    """
    stmt = select(LeadRecord).order_by(desc(LeadRecord.created_at)).limit(limit)
    result = await db.execute(stmt)
    leads = result.scalars().all()
    return [LeadOut(**l.to_dict()) for l in leads]


@router.get("/{session_id}", response_model=CallSessionOut)
async def get_call_detail(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Get full details and transcript of a single call session.
    """
    stmt = select(CallSession).where(CallSession.session_id == session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Call session not found")
    return CallSessionOut(**session.to_dict())


@router.post("/resync/{session_id}")
async def resync_call_to_bitrix(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Re-trigger Bitrix24 push for an existing call session.
    """
    stmt = select(CallSession).where(CallSession.session_id == session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Call session not found")

    from backend.app.schemas.nlp import ExtractedLeadData
    extracted = None
    if session.extracted_data:
        extracted = ExtractedLeadData(**session.extracted_data)
    else:
        extracted = await nlp_service.extract_lead_info(
            raw_answers=session.raw_answers or {},
            caller_phone=session.caller_phone,
            transcript=session.transcript,
        )
        session.extracted_data = extracted.model_dump()

    bitrix_resp = await bitrix_service.create_lead(
        extracted=extracted,
        caller_phone=session.caller_phone,
        full_transcript=session.transcript,
        session_id=session.session_id,
    )

    if bitrix_resp.success:
        session.bitrix_status = "mock_synced" if bitrix_resp.is_mock else "synced"
        session.bitrix_lead_id = bitrix_resp.lead_id
        session.error_message = None
    else:
        session.bitrix_status = "failed"
        session.error_message = bitrix_resp.message

    await db.commit()
    return {
        "success": bitrix_resp.success,
        "bitrix_status": session.bitrix_status,
        "lead_id": session.bitrix_lead_id,
        "message": bitrix_resp.message,
    }


@router.delete("/{session_id}")
async def delete_call_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a call session record.
    """
    stmt = select(CallSession).where(CallSession.session_id == session_id)
    result = await db.execute(stmt)
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Call session not found")

    await db.delete(session)
    await db.commit()
    return {"success": True, "message": "Call session deleted"}
