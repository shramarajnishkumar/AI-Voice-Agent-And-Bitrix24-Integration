from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class CallSession(Base):
    __tablename__ = "call_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    source = Column(String(50), default="twilio")  # "twilio", "web_simulator", "test"
    caller_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="initiated")  # "initiated", "in_progress", "completed", "failed"
    current_step = Column(Integer, default=0)  # 0: greeting/q1, 1: q2, 2: q3, 3: completed
    transcript = Column(Text, default="")
    raw_answers = Column(JSON, default=dict)
    extracted_data = Column(JSON, nullable=True)
    bitrix_lead_id = Column(String(100), nullable=True)
    bitrix_status = Column(String(50), default="pending")  # "pending", "synced", "mock_synced", "failed"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "source": self.source,
            "caller_phone": self.caller_phone,
            "status": self.status,
            "current_step": self.current_step,
            "transcript": self.transcript,
            "raw_answers": self.raw_answers,
            "extracted_data": self.extracted_data,
            "bitrix_lead_id": self.bitrix_lead_id,
            "bitrix_status": self.bitrix_status,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
