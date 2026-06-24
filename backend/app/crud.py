from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, schemas

def get_saree(db: Session, saree_id: int):
    return db.query(models.Saree).filter(models.Saree.id == saree_id).first()

def get_sarees(db: Session, skip: int = 0, limit: int = 12, sort_by: str = "newest"):
    query = db.query(models.Saree)
    if sort_by == "newest":
        query = query.order_by(desc(models.Saree.created_at))
    elif sort_by == "price_low":
        query = query.order_by(models.Saree.price)
    elif sort_by == "price_high":
        query = query.order_by(desc(models.Saree.price))
    elif sort_by == "name_asc":
        query = query.order_by(models.Saree.name)
    elif sort_by == "name_desc":
        query = query.order_by(desc(models.Saree.name))
    else:
        query = query.order_by(desc(models.Saree.created_at))
    
    return query.offset(skip).limit(limit).all()

def create_saree(db: Session, saree: schemas.SareeCreate):
    db_saree = models.Saree(
        name=saree.name,
        description=saree.description,
        price=saree.price,
        length=saree.length,
        blouse=saree.blouse,
        delivery_duration=saree.delivery_duration,
        highlights=saree.highlights,
        work=saree.work,
        quality=saree.quality
    )
    db.add(db_saree)
    db.commit()
    db.refresh(db_saree)
    return db_saree

def update_saree(db: Session, db_saree: models.Saree, saree: schemas.SareeCreate):
    db_saree.name = saree.name
    db_saree.description = saree.description
    db_saree.price = saree.price
    db_saree.length = saree.length
    db_saree.blouse = saree.blouse
    db_saree.delivery_duration = saree.delivery_duration
    db_saree.highlights = saree.highlights
    db_saree.work = saree.work
    db_saree.quality = saree.quality
    db.commit()
    db.refresh(db_saree)
    return db_saree

def delete_saree_images(db: Session, saree_id: int):
    db.query(models.SareeImage).filter(models.SareeImage.saree_id == saree_id).delete()
    db.commit()


def add_saree_image(db: Session, saree_id: int, image_url: str, is_primary: bool):
    db_image = models.SareeImage(
        saree_id=saree_id,
        image_url=image_url,
        is_primary=is_primary
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def delete_saree(db: Session, saree_id: int):
    db_saree = db.query(models.Saree).filter(models.Saree.id == saree_id).first()
    if db_saree:
        db.delete(db_saree)
        db.commit()
        return True
    return False

def create_order(db: Session, order: schemas.OrderCreate):
    db_order = models.Order(
        order_number=order.order_number,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_address=order.customer_address,
        total_amount=order.total_amount,
        items=[item.model_dump() for item in order.items]
    )
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(desc(models.Order.created_at)).offset(skip).limit(limit).all()

def update_order_status(db: Session, order_id: int, status: str):
    db_order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if db_order:
        db_order.status = status
        db.commit()
        db.refresh(db_order)
    return db_order

def create_review(db: Session, review: schemas.ReviewCreate, saree_id: int):
    db_review = models.Review(
        saree_id=saree_id,
        reviewer_name=review.reviewer_name,
        rating=review.rating,
        comment=review.comment
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review
