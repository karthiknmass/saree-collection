from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Saree(Base):
    __tablename__ = "sarees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, index=True, nullable=False)
    length = Column(String, nullable=True)       # e.g., "5.5 meters"
    blouse = Column(String, nullable=True)       # e.g., "Yes (Contrast)"
    delivery_duration = Column(String, nullable=True)  # e.g., "3-5 days"
    highlights = Column(JSON, nullable=True)     # e.g., ["Pure silk", "Zari work"]
    work = Column(String, nullable=True)         # e.g., "Kanchipuram Zari"
    quality = Column(String, nullable=True)      # e.g., "Premium Grade A"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationship to images
    images = relationship("SareeImage", back_populates="saree", cascade="all, delete-orphan")


class SareeImage(Base):
    __tablename__ = "saree_images"

    id = Column(Integer, primary_key=True, index=True)
    saree_id = Column(Integer, ForeignKey("sarees.id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    is_primary = Column(Boolean, default=False)

    saree = relationship("Saree", back_populates="images")
