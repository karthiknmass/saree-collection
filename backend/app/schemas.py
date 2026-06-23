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


# Review Schemas
class ReviewCreate(BaseModel):
    reviewer_name: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None

class ReviewResponse(ReviewCreate):
    id: int
    saree_id: int
    created_at: datetime

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
    reviews: List[ReviewResponse] = []

    class Config:
        from_attributes = True


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"


# Order Schemas
class OrderItem(BaseModel):
    name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    order_number: str
    customer_name: str
    customer_phone: str
    customer_address: str
    total_amount: float
    items: List[OrderItem]

class OrderResponse(OrderCreate):
    id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str

