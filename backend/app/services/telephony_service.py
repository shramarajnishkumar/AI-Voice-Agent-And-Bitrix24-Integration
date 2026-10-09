import logging
from typing import Optional, Tuple
from twilio.twiml.voice_response import VoiceResponse, Gather
from backend.app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VOICE_DEFAULT = "Polly.Joanna-Neural"
LANGUAGE_DEFAULT = "en-US"

SPEECH_HINTS = (
    "Rajnish, Kumar, Rajnish Kumar, Robotic, Robotic Solutions, CloudSolutions, "
    "Alex, Rachel Green, Tony Stark, Nexus Technologies, Green Enterprises, Stark Industries, "
    "cloud migration, DevOps, web development, mobile app, AI automation, API integration, "
    "consulting, CRM, Bitrix24, email, phone, gmail.com, yahoo.com, outlook.com, "
    "portfolio, portfolio identity, interview, contact number, address, mobile, website, "
    "at the rate, dot com, zero, one, two, three, four, five, six, seven, eight, nine"
)


class TelephonyService:
    def __init__(self):
        self.agent_name = settings.AGENT_NAME
        self.company_name = settings.COMPANY_NAME
        self.q1 = settings.QUESTION_1
        self.q2 = settings.QUESTION_2
        self.q3 = settings.QUESTION_3
        self.closing = settings.CLOSING_MESSAGE

    def get_locale_config(self, caller_phone: Optional[str] = None) -> Tuple[str, str]:
        """
        Determines the optimal TTS voice and Speech-To-Text language based on caller's phone or configuration.
        Provides native Indian English (en-IN) neural voice & acoustic model for Indian callers (+91),
        and US English (en-US) for US/North American callers.
        """
        configured_lang = (getattr(settings, "TWILIO_SPEECH_LANGUAGE", "auto") or "auto").strip().lower()

        if configured_lang == "en-in":
            return "Polly.Kajal-Neural", "en-IN"
        elif configured_lang == "en-us":
            return "Polly.Joanna-Neural", "en-US"
        elif configured_lang == "en-gb":
            return "Polly.Amy-Neural", "en-GB"

        phone = (caller_phone or "").strip()
        if phone.startswith("+91") or phone.startswith("91"):
            # High-fidelity Indian English neural voice & STT model
            return "Polly.Kajal-Neural", "en-IN"
        elif phone.startswith("+44"):
            return "Polly.Amy-Neural", "en-GB"
        else:
            return "Polly.Joanna-Neural", "en-US"

    def _build_gather(
        self,
        action_url: str,
        language: str,
    ) -> Gather:
        """
        Constructs a low-latency, high-accuracy Gather verb.
        - speechTimeout='auto' detects natural speech completion within ~500-800ms.
        - speechModel='experimental_conversations' / 'phone_call' optimizes for telephone acoustic fidelity.
        - enhanced=True uses Google Enhanced recognition.
        - profanityFilter=False prevents accidental masking of legitimate speech.
        """
        speech_timeout = str(settings.TWILIO_SPEECH_TIMEOUT)
        speech_model = getattr(settings, "TWILIO_SPEECH_MODEL", "experimental_conversations")
        
        return Gather(
            input="speech",
            action=action_url,
            method="POST",
            timeout=settings.TWILIO_GATHER_TIMEOUT,
            speech_timeout=speech_timeout,
            speech_model=speech_model,
            enhanced=True,
            profanity_filter=False,
            language=language,
            hints=SPEECH_HINTS,
        )

    def generate_initial_greeting_twiml(
        self,
        greeting_text: Optional[str] = None,
        base_url: str = "",
        caller_phone: Optional[str] = None,
    ) -> str:
        """
        Initial call greeting and start of conversational intake.
        """
        voice, language = self.get_locale_config(caller_phone)
        text = greeting_text or self.q1
        response = VoiceResponse()

        gather = self._build_gather(
            action_url=f"{base_url}/api/twilio/gather?step=1",
            language=language,
        )
        gather.say(text, voice=voice, language=language)
        response.append(gather)

        # Fallback if no speech recognized on initial greeting
        response.say(
            "I didn't quite catch that. Could you please state your name and company name?",
            voice=voice,
            language=language,
        )
        retry_gather = self._build_gather(
            action_url=f"{base_url}/api/twilio/gather?step=1",
            language=language,
        )
        response.append(retry_gather)
        response.hangup()
        return str(response)

    def generate_dynamic_twiml(
        self,
        prompt_text: str,
        next_step: int,
        is_completed: bool,
        base_url: str = "",
        caller_phone: Optional[str] = None,
    ) -> str:
        """
        Generates dynamic TwiML for conversational turns spoken by AI voice agent.
        Accurately manages Gather vs Hangup so call is NEVER terminated while asking a question.
        """
        voice, language = self.get_locale_config(caller_phone)
        response = VoiceResponse()

        # Guard against accidental hangup if prompt is asking a question
        is_question = "?" in prompt_text or any(
            w in prompt_text.lower() for w in ["what", "could you please", "may i have", "which", "can you provide"]
        )
        if is_completed and is_question and next_step < 6:
            logger.warning("Prompt is an unanswered question ('%s'); overriding is_completed to False", prompt_text)
            is_completed = False

        if is_completed:
            response.say(prompt_text, voice=voice, language=language)
            response.hangup()
            return str(response)

        gather = self._build_gather(
            action_url=f"{base_url}/api/twilio/gather?step={next_step}",
            language=language,
        )
        gather.say(prompt_text, voice=voice, language=language)
        response.append(gather)

        # Step-aware intelligent fallback if caller is silent or speech wasn't captured
        if next_step == 2:
            fallback_msg = "I didn't quite catch that. Could you please tell me what service you are looking for?"
        elif next_step == 3:
            fallback_msg = "I didn't quite catch that. Could you please provide your contact email or phone number?"
        else:
            fallback_msg = "I didn't quite catch that. Could you please repeat that?"

        response.say(fallback_msg, voice=voice, language=language)
        retry_gather = self._build_gather(
            action_url=f"{base_url}/api/twilio/gather?step={next_step}",
            language=language,
        )
        response.append(retry_gather)
        response.say(
            "Thank you for contacting us. We have registered your inquiry and our team will follow up shortly. Have a wonderful day!",
            voice=voice,
            language=language,
        )
        response.hangup()
        return str(response)

    def generate_step_twiml(self, step: int, base_url: str = "", caller_phone: Optional[str] = None) -> Tuple[str, str]:
        """
        Backwards-compatible legacy step TwiML generator.
        """
        if step == 1:
            return self.generate_dynamic_twiml(self.q2, next_step=2, is_completed=False, base_url=base_url, caller_phone=caller_phone), self.q2
        elif step == 2:
            return self.generate_dynamic_twiml(self.q3, next_step=3, is_completed=False, base_url=base_url, caller_phone=caller_phone), self.q3
        else:
            return self.generate_dynamic_twiml(self.closing, next_step=step, is_completed=True, base_url=base_url, caller_phone=caller_phone), self.closing
