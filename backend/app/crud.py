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
