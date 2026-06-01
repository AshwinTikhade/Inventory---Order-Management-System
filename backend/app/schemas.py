from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# ==================== PRODUCT SCHEMAS ====================
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    sku: str = Field(..., min_length=2, max_length=50)
    price: float = Field(..., ge=0.0, description="Product price must be non-negative")
    quantity: int = Field(..., ge=0, description="Product quantity must be non-negative")

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    sku: Optional[str] = Field(None, min_length=2, max_length=50)
    price: Optional[float] = Field(None, ge=0.0)
    quantity: Optional[int] = Field(None, ge=0)

class ProductResponse(ProductBase):
    id: int

    class Config:
        from_attributes = True

# ==================== CUSTOMER SCHEMAS ====================
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=5, max_length=20)

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int

    class Config:
        from_attributes = True

# ==================== ORDER ITEM SCHEMAS ====================
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Quantity ordered must be greater than zero")

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    product: Optional[ProductResponse] = None

    class Config:
        from_attributes = True

# ==================== ORDER SCHEMAS ====================
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1, description="Order must contain at least one product")

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    created_at: datetime
    customer: Optional[CustomerResponse] = None
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

# ==================== ANALYTICS SCHEMAS ====================
class DashboardStatsResponse(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_products: List[ProductResponse]
