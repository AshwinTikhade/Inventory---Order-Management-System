from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from sqlalchemy.exc import IntegrityError

from .database import engine, Base, get_db
from . import models, schemas

# Automatically initialize database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend API for managing products, customers, and orders with atomic stock checks.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory & Order Management API!"}

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": f"error: {str(e)}"}


# ==================== PRODUCT ENDPOINTS ====================

@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    # Check if SKU is already registered
    existing_product = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{product.sku}' already exists."
        )
    
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.get("/products", response_model=List[schemas.ProductResponse])
def get_products(db: Session = Depends(get_db)):
    return db.query(models.Product).all()

@app.get("/products/{product_id}", response_model=schemas.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    return db_product

@app.put("/products/{product_id}", response_model=schemas.ProductResponse)
def update_product(product_id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    
    update_data = product_update.dict(exclude_unset=True)
    
    # If SKU is updating, check for uniqueness conflicts
    if "sku" in update_data and update_data["sku"] != db_product.sku:
        existing_product = db.query(models.Product).filter(models.Product.sku == update_data["sku"]).first()
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"SKU '{update_data['sku']}' is already in use by another product."
            )
            
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    db.commit()
    db.refresh(db_product)
    return db_product

@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} not found."
        )
    
    db.delete(db_product)
    db.commit()
    return None


# ==================== CUSTOMER ENDPOINTS ====================

@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    # Check if Email already exists
    existing_customer = db.query(models.Customer).filter(models.Customer.email == customer.email).first()
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Customer with email '{customer.email}' already exists."
        )
    
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def get_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()

@app.get("/customers/{customer_id}", response_model=schemas.CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
    return db_customer

@app.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    db_customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found."
        )
    
    db.delete(db_customer)
    db.commit()
    return None


# ==================== ORDER ENDPOINTS ====================

@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order_payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    # 1. Verify customer exists
    customer = db.query(models.Customer).filter(models.Customer.id == order_payload.customer_id).first()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {order_payload.customer_id} not found."
        )

    # We perform all operations within an atomic block (transaction)
    try:
        # Pre-fetch and lock products if using Postgres, or standard fetch for SQLite
        product_ids = [item.product_id for item in order_payload.items]
        
        # Check duplicate product selections in the order payload
        if len(product_ids) != len(set(product_ids)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate products selected in the same order. Please consolidate quantities."
            )
            
        products = db.query(models.Product).filter(models.Product.id.in_(product_ids)).all()
        product_map = {p.id: p for p in products}

        # Validate that all requested products exist
        for pid in product_ids:
            if pid not in product_map:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {pid} not found."
                )

        # 2. Check inventory levels first before modifying anything
        order_items_to_create = []
        running_total_amount = 0.0

        for item in order_payload.items:
            product = product_map[item.product_id]
            
            if product.quantity < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient inventory for product '{product.name}' (SKU: {product.sku}). Requested: {item.quantity}, Available: {product.quantity}."
                )
            
            # Deduct stock
            product.quantity -= item.quantity
            item_cost = product.price * item.quantity
            running_total_amount += item_cost

            # Prepare OrderItem
            order_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                unit_price=product.price
            )
            order_items_to_create.append(order_item)


        db.add(db_order)
        db.flush()  # Generates order ID

        # 4. Associate and save OrderItems
        for order_item in order_items_to_create:
            order_item.order_id = db_order.id
            db.add(order_item)

        # 5. Commit all changes atomically
        db.commit()
        db.refresh(db_order)
        return db_order

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while creating order: {str(e)}"
        )

@app.get("/orders", response_model=List[schemas.OrderResponse])
def get_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()

@app.get("/orders/{order_id}", response_model=schemas.OrderResponse)
def get_order(order_id: int, db: Session = Depends(get_db)):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )
    return db_order

@app.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    # Deleting or cancelling an order must restore the products' stock levels!
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not db_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID {order_id} not found."
        )

    try:
        # Restore stock for each item in the order
        for item in db_order.items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.quantity += item.quantity
        
        # Delete order (associated OrderItems will be cascade deleted)
        db.delete(db_order)
        db.commit()
        return None
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel order: {str(e)}"
        )


# ==================== ANALYTICS ENDPOINTS ====================

@app.get("/dashboard/stats", response_model=schemas.DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    # Fetch products with low stock (quantity < 10)
    low_stock_products = db.query(models.Product).filter(models.Product.quantity < 10).all()
    
    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_products": low_stock_products
    }
