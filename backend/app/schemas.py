from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# Saree Image Schemas
class SareeImageBase(BaseModel):
    image_url: str
    is_primary: bool = False

class SareeImageCreate(SareeImageBase):
    pass

class SareeImageResponse(SareeImageBase):
    id: int
    saree_id: int

    class Config:
        from_attributes = True


# Saree Schemas
class SareeBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    length: Optional[str] = None
    blouse: Optional[str] = None
    delivery_duration: Optional[str] = None
    highlights: Optional[List[str]] = []
    work: Optional[str] = None
    quality: Optional[str] = None

class SareeCreate(SareeBase):
    pass

class SareeResponse(SareeBase):
    id: int
    created_at: datetime
    images: List[SareeImageResponse] = []

    class Config:
        from_attributes = True


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"

