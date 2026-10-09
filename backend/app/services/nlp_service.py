import logging
import re
from typing import Dict, Any, Optional
import httpx
from backend.app.config import get_settings
from backend.app.schemas.nlp import ExtractedLeadData

logger = logging.getLogger(__name__)
settings = get_settings()


class NLPService:
    def __init__(self, provider: Optional[str] = None):
        self.provider = (provider or settings.NLP_PROVIDER or "heuristic").lower()

    async def extract_lead_info(
        self,
        raw_answers: Dict[str, str],
        caller_phone: Optional[str] = None,
        transcript: Optional[str] = None,
    ) -> ExtractedLeadData:
        """
        Extract structured fields from intake dialogue.
        Prioritizes configured provider with automatic fallback to heuristics.
        """
        if self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                result = await self._extract_openai(raw_answers, caller_phone, transcript)
                if result:
                    return result
            except Exception as e:
                logger.warning("OpenAI extraction failed, falling back to heuristic: %s", e)

        elif self.provider == "ollama":
            try:
                result = await self._extract_ollama(raw_answers, caller_phone, transcript)
                if result:
                    return result
            except Exception as e:
                logger.warning("Ollama extraction failed, falling back to heuristic: %s", e)

        # Default / Open-source Heuristic fallback
        return self._extract_heuristic(raw_answers, caller_phone, transcript)

    def _extract_heuristic(
        self,
        raw_answers: Dict[str, str],
        caller_phone: Optional[str] = None,
        transcript: Optional[str] = None,
    ) -> ExtractedLeadData:
        # Collect all answers from any turns
        all_answers_str = " ".join(str(v) for v in raw_answers.values() if v)
        combined_text = f"{all_answers_str} {transcript or ''}"

        # 2. Email extraction: check for standard email first
        email_match = re.search(
            r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+',
            combined_text
        )
        if not email_match:
            # Fallback for spoken email phrases (e.g. 'john at the rate gmail dot com' or 'john at gmail dot com')
            spoken_norm = re.sub(r'\s+at the rate\s+', '@', combined_text, flags=re.IGNORECASE)
            spoken_norm = re.sub(r'\s+at\s+([a-zA-Z0-9-]+\s+dot\s+[a-zA-Z]{2,})', r'@\1', spoken_norm, flags=re.IGNORECASE)
            spoken_norm = re.sub(r'\s+dot\s+', '.', spoken_norm, flags=re.IGNORECASE)
            email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', spoken_norm)

        extracted_email = email_match.group(0).strip() if email_match else None

        # Phone extraction
        phone_match = re.search(
            r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            combined_text
        )
        extracted_phone = phone_match.group(0).strip() if phone_match else caller_phone

        # 3. Name & Company extraction from Q1 or across answers
        q1_text = raw_answers.get("q1", "").strip() or all_answers_str
        q2_text = raw_answers.get("q2", "").strip()
        q3_text = raw_answers.get("q3", "").strip()
        caller_name = None
        company_name = None

        if q1_text:
            cleaned_q1 = q1_text.strip()

            # Pattern A: "My name is X and [my] company is Y" or "Name is X, company is Y"
            m_and = re.search(
                r"(?:my name is|i am|i'm|this is|name:?)\s+([A-Za-z\s.'-]+?)\s+(?:and\s+)?(?:my\s+)?(?:company\s+is|representing|company:?|organization:?)\s+([A-Za-z0-9\s.,'&-]+)",
                cleaned_q1,
                re.IGNORECASE,
            )
            if m_and:
                caller_name = m_and.group(1).strip()
                company_name = m_and.group(2).strip()

            # Pattern B: "Company is Y and my name is X"
            if not caller_name:
                m_rev = re.search(
                    r"(?:company\s+is|company:?)\s+([A-Za-z0-9\s.,'&-]+?)\s+(?:and\s+)?(?:my name is|i am|this is)\s+([A-Za-z\s.'-]+)",
                    cleaned_q1,
                    re.IGNORECASE,
                )
                if m_rev:
                    company_name = m_rev.group(1).strip()
                    caller_name = m_rev.group(2).strip()

            # Pattern C: "X from/with/at Y" or "I am X from Y"
            if not caller_name:
                m_from = re.search(
                    r"(?:(?:my name is|i am|i'm|this is)\s+)?([A-Za-z\s.'-]+?)\s+(?:from|with|at)\s+([A-Za-z0-9\s.,'&-]+)",
                    cleaned_q1,
                    re.IGNORECASE,
                )
                if m_from:
                    caller_name = m_from.group(1).strip()
                    company_name = m_from.group(2).strip()

            # Pattern D: Comma separated fallback e.g. "John Doe, Apex Corp"
            if not caller_name and "," in cleaned_q1:
                parts = [p.strip() for p in cleaned_q1.split(",") if p.strip()]
                if len(parts) >= 2:
                    caller_name = parts[0]
                    company_name = parts[1]

            # Pattern E: Fallback token split
            if not caller_name:
                cleaned_tokens = re.sub(r"^(my name is|i am|i'm|this is)\s+", "", cleaned_q1, flags=re.IGNORECASE).strip()
                tokens = cleaned_tokens.split()
                if len(tokens) <= 2:
                    caller_name = cleaned_tokens
                    company_name = "Not Specified"
                else:
                    caller_name = " ".join(tokens[:2])
                    company_name = " ".join(tokens[2:])

        # Clean noise words from name
        if caller_name:
            caller_name = re.sub(
                r"^(my name is|i am|i'm|this is|speaking is)\s+",
                "",
                caller_name,
                flags=re.IGNORECASE,
            ).strip().title()

        # Clean noise words from company
        if company_name:
            company_name = re.sub(
                r"^(from|with|at|representing|my company is|company is)\s+",
                "",
                company_name,
                flags=re.IGNORECASE,
            ).strip().title()

        # 4. Service extraction from Q2
        desired_service = q2_text
        if desired_service:
            desired_service = re.sub(
                r"^(we need|i need|looking for|we are looking for|we want|interested in|service is|we would like|i would like)\s+",
                "",
                desired_service,
                flags=re.IGNORECASE
            ).strip()
            # Capitalize first letter
            if desired_service:
                desired_service = desired_service[0].upper() + desired_service[1:]

        # 5. Contact channel preference from Q3
        contact_channel = q3_text
        if not contact_channel:
            if extracted_email:
                contact_channel = f"Email: {extracted_email}"
            elif extracted_phone:
                contact_channel = f"Phone: {extracted_phone}"
            else:
                contact_channel = "Direct Inbound Phone"

        summary = (
            f"Caller {caller_name or 'Inquirer'} from {company_name or 'unspecified org'} "
            f"requested assistance with: {desired_service or 'General inquiry'}. "
            f"Contact preference: {contact_channel}."
        )

        return ExtractedLeadData(
            caller_name=caller_name or "Unknown Caller",
            company_name=company_name or "Prospective Client",
            desired_service=desired_service or "General Voice Inquiry",
            contact_channel=contact_channel,
            phone=extracted_phone,
            email=extracted_email,
            confidence_score=0.88,
            summary=summary,
        )

    async def _extract_ollama(
        self,
        raw_answers: Dict[str, str],
        caller_phone: Optional[str] = None,
        transcript: Optional[str] = None,
    ) -> Optional[ExtractedLeadData]:
        url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
        prompt = f"""
You are an NLP entity extraction engine for a CRM voice telephony agent.
Analyze the following call answers and extract structured JSON matching this schema:
{{
  "caller_name": "Full name or null",
  "company_name": "Company name or null",
  "desired_service": "Service requested",
  "contact_channel": "Email, phone or preferred channel",
  "phone": "Phone number or null",
  "email": "Email address or null",
  "confidence_score": 0.95,
  "summary": "Brief 1-2 sentence executive summary"
}}

Call Data:
- Answer 1 (Name & Company): {raw_answers.get('q1', 'N/A')}
- Answer 2 (Desired Service): {raw_answers.get('q2', 'N/A')}
- Answer 3 (Contact Channel): {raw_answers.get('q3', 'N/A')}
- Caller ID: {caller_phone or 'Unknown'}
- Transcript: {transcript or 'N/A'}

Respond ONLY with valid JSON.
"""
        payload = {
            "model": settings.OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                import json
                parsed = json.loads(data.get("response", "{}"))
                return ExtractedLeadData(**parsed)
        return None

    async def _extract_openai(
        self,
        raw_answers: Dict[str, str],
        caller_phone: Optional[str] = None,
        transcript: Optional[str] = None,
    ) -> Optional[ExtractedLeadData]:
        import json
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        url = "https://api.openai.com/v1/chat/completions"
        prompt = f"""
You are an expert CRM lead extraction specialist for an inbound telephony AI receptionist.
Extract structured CRM lead information from this phone call:

Collected Conversation Turn Answers:
{json.dumps(raw_answers, indent=2)}

Telephony Inbound Caller ID: {caller_phone or 'N/A'}

Full Live Call Transcript:
{transcript or 'N/A'}

Return JSON strictly with the following fields:
- caller_name: Full name of caller (or "Unknown Caller")
- company_name: Organization or business name (or "Prospective Client")
- desired_service: What service, solution, or assistance they need
- contact_channel: Preferred way to reach them (e.g. "Email: user@example.com" or "Phone: +1-...")
- phone: Best phone number (use caller ID if not specified)
- email: Email address if mentioned (convert spoken phrases like 'at gmail dot com' or 'at the rate' to standard format), else null
- confidence_score: Float between 0.0 and 1.0
- summary: Professional 1-2 sentence executive briefing of the inquiry for the CRM lead record
"""
        body = {
            "model": settings.OPENAI_MODEL or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": "You are a precise data extraction specialist. Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                parsed = json.loads(content)
                if not parsed.get("phone") and caller_phone:
                    parsed["phone"] = caller_phone
                return ExtractedLeadData(**parsed)
        return None
