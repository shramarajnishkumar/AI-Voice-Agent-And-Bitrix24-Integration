from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, JSON, DateTime
from backend.app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class LeadRecord(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    caller_name = Column(String(150), nullable=True)
    company_name = Column(String(200), nullable=True)
    desired_service = Column(String(255), nullable=True)
    contact_channel = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)
    bitrix_lead_id = Column(String(100), nullable=True)
    bitrix_payload = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    def to_dict(self):
        return {
            "id": self.id,
            "session_id": self.session_id,
            "title": self.title,
            "caller_name": self.caller_name,
            "company_name": self.company_name,
            "desired_service": self.desired_service,
            "contact_channel": self.contact_channel,
            "phone": self.phone,
            "email": self.email,
            "bitrix_lead_id": self.bitrix_lead_id,
            "bitrix_payload": self.bitrix_payload,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
