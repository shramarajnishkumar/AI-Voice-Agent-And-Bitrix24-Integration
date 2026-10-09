import logging
import re
from typing import Optional, Dict, Any
import httpx
from backend.app.config import get_settings
from backend.app.schemas.bitrix import (
    BitrixCreateLeadPayload,
    BitrixLeadFields,
    BitrixLeadResponse,
    BitrixMultifieldItem,
)
from backend.app.schemas.nlp import ExtractedLeadData

logger = logging.getLogger(__name__)
settings = get_settings()


class Bitrix24Service:
    def __init__(self, webhook_url: Optional[str] = None):
        self.webhook_url = (webhook_url if webhook_url is not None else settings.BITRIX24_WEBHOOK_URL or "").strip()

    def _normalize_endpoint(self, action: str = "crm.lead.add.json") -> Optional[str]:
        if not self.webhook_url:
            return None
        url = self.webhook_url.rstrip("/")
        if not url.endswith(action):
            if url.endswith(".json"):
                # replace existing action
                url = re.sub(r"/crm\.[a-z0-9_.]+\.json$", f"/{action}", url)
            else:
                url = f"{url}/{action}"
        return url

    def is_mock_mode(self) -> bool:
        if not self.webhook_url:
            return True
        if "your-domain" in self.webhook_url or "your_webhook_token" in self.webhook_url:
            return True
        return False

    def build_lead_payload(
        self,
        extracted: ExtractedLeadData,
        caller_phone: Optional[str] = None,
        full_transcript: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> BitrixCreateLeadPayload:
        company = extracted.company_name or "Unknown Company"
        service = extracted.desired_service or "Inquiry"
        title = f"Inbound Voice Lead: {company} - {service}"

        # Combine comments with transcript & structured details
        comments_parts = [
            f"<b>Source:</b> Automated AI Voice Call Intake (Session: {session_id or 'N/A'})",
            f"<b>Caller Name:</b> {extracted.caller_name or 'N/A'}",
            f"<b>Company:</b> {company}",
            f"<b>Desired Service:</b> {service}",
            f"<b>Contact Channel Preference:</b> {extracted.contact_channel or 'N/A'}",
            f"<b>AI Summary:</b> {extracted.summary}",
            "<hr>",
            "<b>Full Call Transcript:</b>",
            f"<pre>{full_transcript or 'No transcript recorded'}</pre>",
        ]
        comments_html = "<br>".join(comments_parts)

        phone_items = []
        # Use extracted phone or telephony caller ID
        primary_phone = extracted.phone or caller_phone
        if primary_phone:
            phone_items.append(BitrixMultifieldItem(VALUE=primary_phone, VALUE_TYPE="WORK"))

        email_items = []
        if extracted.email:
            email_items.append(BitrixMultifieldItem(VALUE=extracted.email, VALUE_TYPE="WORK"))

        fields = BitrixLeadFields(
            TITLE=title[:250],
            NAME=extracted.caller_name or "Caller",
            COMPANY_TITLE=extracted.company_name,
            STATUS_ID="NEW",
            OPENED="Y",
            ASSIGNED_BY_ID=settings.BITRIX24_DEFAULT_ASSIGNED_BY_ID,
            COMMENTS=comments_html,
            PHONE=phone_items if phone_items else None,
            EMAIL=email_items if email_items else None,
            SOURCE_ID="CALL",
            SOURCE_DESCRIPTION="AI Voice Agent Telephony",
        )

        return BitrixCreateLeadPayload(fields=fields)

    async def create_lead(
        self,
        extracted: ExtractedLeadData,
        caller_phone: Optional[str] = None,
        full_transcript: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> BitrixLeadResponse:
        payload = self.build_lead_payload(
            extracted=extracted,
            caller_phone=caller_phone,
            full_transcript=full_transcript,
            session_id=session_id,
        )

        if self.is_mock_mode():
            mock_id = f"MOCK-{abs(hash(session_id or title_hash(extracted))) % 90000 + 10000}"
            logger.info("Bitrix24 mock mode enabled. Simulated lead creation: %s", mock_id)
            return BitrixLeadResponse(
                success=True,
                lead_id=mock_id,
                is_mock=True,
                message="Lead successfully simulated in Mock Mode (No live Bitrix24 webhook URL provided)",
                raw_response={"result": mock_id, "mock_payload": payload.model_dump()},
            )

        endpoint = self._normalize_endpoint("crm.lead.add.json")
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(endpoint, json=payload.model_dump())
                data = resp.json()

                if resp.status_code == 200 and "result" in data:
                    lead_id = str(data["result"])
                    logger.info("Successfully pushed lead to Bitrix24. ID: %s", lead_id)
                    return BitrixLeadResponse(
                        success=True,
                        lead_id=lead_id,
                        is_mock=False,
                        message=f"Lead created successfully in Bitrix24 (ID: {lead_id})",
                        raw_response=data,
                    )
                else:
                    err_msg = data.get("error_description") or data.get("error") or str(data)
                    logger.error("Bitrix24 API rejected lead creation: %s", err_msg)
                    return BitrixLeadResponse(
                        success=False,
                        lead_id=None,
                        is_mock=False,
                        message=f"Bitrix24 error: {err_msg}",
                        raw_response=data,
                    )
        except Exception as e:
            logger.exception("Failed to connect to Bitrix24 endpoint: %s", endpoint)
            return BitrixLeadResponse(
                success=False,
                lead_id=None,
                is_mock=False,
                message=f"Connection failure to Bitrix24: {str(e)}",
                raw_response={"error": str(e)},
            )

    async def test_connection(self) -> Dict[str, Any]:
        if self.is_mock_mode():
            return {
                "success": True,
                "is_mock": True,
                "message": "Mock Mode active. Webhook URL is not configured with live credentials.",
                "configured_url": self.webhook_url,
            }

        endpoint = self._normalize_endpoint("crm.lead.fields.json")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "success": True,
                        "is_mock": False,
                        "message": "Connection to Bitrix24 REST API verified successfully!",
                        "details": "crm.lead.fields endpoint responded OK",
                    }
                else:
                    return {
                        "success": False,
                        "is_mock": False,
                        "message": f"Bitrix24 returned HTTP {resp.status_code}: {resp.text[:200]}",
                    }
        except Exception as e:
            return {
                "success": False,
                "is_mock": False,
                "message": f"Network error testing Bitrix24: {str(e)}",
            }


def title_hash(extracted: ExtractedLeadData) -> str:
    return f"{extracted.caller_name}_{extracted.company_name}_{extracted.desired_service}"
