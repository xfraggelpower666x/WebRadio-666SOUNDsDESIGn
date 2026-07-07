from sqlalchemy import Column, String, Text
from src.app.db import Base

class TranscriptJob(Base):
    __tablename__ = "transcript_jobs"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    transcript = Column(Text, nullable=False)
