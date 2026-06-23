import os
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, status, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from . import crud, models, schemas, utils, auth
from .database import get_db
from .config import settings

router = APIRouter()

@router.post("/admin/login", response_model=schemas.LoginResponse)
def login(credentials: schemas.LoginRequest):
    """
    Login endpoint for administrators.
    Returns a session token upon successful validation.
    """
    if not auth.verify_admin_credentials(credentials.username, credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth.create_session_token()
    return {"token": token, "token_type": "bearer"}

@router.post("/admin/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(token: str = Depends(auth.get_current_admin)):
    """
    Logout endpoint. Revokes the active session token.
    """
    auth.revoke_session_token(token)
    return


@router.get("/sarees", response_model=List[schemas.SareeResponse])
def read_sarees(
    skip: int = 0,
    limit: int = 12,
    sort_by: str = "newest",
    db: Session = Depends(get_db)
):
    """
    Get paginated saree collection. Handles high traffic smoothly through limit/skip.
    """
    sarees = crud.get_sarees(db, skip=skip, limit=limit, sort_by=sort_by)
    return sarees

@router.get("/sarees/{saree_id}", response_model=schemas.SareeResponse)
def read_saree(saree_id: int, db: Session = Depends(get_db)):
    """
    Get a single saree detail by ID.
    """
    db_saree = crud.get_saree(db, saree_id=saree_id)
    if db_saree is None:
        raise HTTPException(status_code=404, detail="Saree not found")
    return db_saree

@router.post("/admin/sarees", response_model=schemas.SareeResponse, status_code=status.HTTP_201_CREATED)
async def create_saree(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    length: Optional[str] = Form(None),
    blouse: Optional[str] = Form(None),
    delivery_duration: Optional[str] = Form(None),
    work: Optional[str] = Form(None),
    quality: Optional[str] = Form(None),
    highlights: Optional[str] = Form(None),  # Expecting JSON string or comma-separated list
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: str = Depends(auth.get_current_admin)
):
    """
    Admin endpoint to upload a single saree with multiple images.
    Automatically compresses and converts uploaded images to WebP.
    """
    # 1. Parse highlights
    highlights_list = []
    if highlights:
        try:
            highlights_list = json.loads(highlights)
            if not isinstance(highlights_list, list):
                highlights_list = [str(highlights_list)]
        except json.JSONDecodeError:
            # Fallback to comma separated
            highlights_list = [h.strip() for h in highlights.split(",") if h.strip()]

    # 2. Save Saree details to DB
    saree_data = schemas.SareeCreate(
        name=name,
        price=price,
        description=description,
        length=length,
        blouse=blouse,
        delivery_duration=delivery_duration,
        highlights=highlights_list,
        work=work,
        quality=quality
    )
    
    db_saree = crud.create_saree(db, saree=saree_data)

    # 3. Process and optimize uploaded files
    if not files or len(files) == 0:
        # Rollback or raise error (we want at least one image)
        crud.delete_saree(db, db_saree.id)
        raise HTTPException(status_code=400, detail="At least one image is required")

    primary_set = False
    for i, file in enumerate(files):
        # Read file contents
        content = await file.read()
        
        # Optimize image and get relative URL path
        try:
            image_url = utils.save_and_optimize_image(content, settings.UPLOAD_DIR)
        except Exception as e:
            # If image saving failed, clean up what we did so far and raise
            crud.delete_saree(db, db_saree.id)
            raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

        # First image uploaded is set as primary
        is_primary = not primary_set
        crud.add_saree_image(db, saree_id=db_saree.id, image_url=image_url, is_primary=is_primary)
        primary_set = True

    # Refresh DB session to return saree with images relationship populated
    db.refresh(db_saree)
    return db_saree

@router.put("/admin/sarees/{saree_id}", response_model=schemas.SareeResponse)
async def update_saree(
    saree_id: int,
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    length: Optional[str] = Form(None),
    blouse: Optional[str] = Form(None),
    delivery_duration: Optional[str] = Form(None),
    work: Optional[str] = Form(None),
    quality: Optional[str] = Form(None),
    highlights: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    admin: str = Depends(auth.get_current_admin)
):
    """
    Admin endpoint to update an existing saree details and optionally override photos.
    """
    db_saree = crud.get_saree(db, saree_id=saree_id)
    if not db_saree:
        raise HTTPException(status_code=404, detail="Saree not found")

    # 1. Parse highlights
    highlights_list = []
    if highlights:
        try:
            highlights_list = json.loads(highlights)
            if not isinstance(highlights_list, list):
                highlights_list = [str(highlights_list)]
        except json.JSONDecodeError:
            # Fallback to comma separated
            highlights_list = [h.strip() for h in highlights.split(",") if h.strip()]

    # 2. Update Saree fields in DB
    saree_data = schemas.SareeCreate(
        name=name,
        price=price,
        description=description,
        length=length,
        blouse=blouse,
        delivery_duration=delivery_duration,
        highlights=highlights_list,
        work=work,
        quality=quality
    )
    crud.update_saree(db, db_saree=db_saree, saree=saree_data)

    # 3. Process new image files if uploaded (replaces old ones)
    # Check if files is not empty and has actual filenames
    if files and len(files) > 0 and any(f.filename for f in files):
        # Delete old physical files
        for img in db_saree.images:
            filename = os.path.basename(img.image_url)
            file_path = os.path.join(settings.UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error removing file {file_path} during update: {e}")

        # Delete old DB image records
        crud.delete_saree_images(db, saree_id=saree_id)

        # Process and optimize new files
        primary_set = False
        for file in files:
            content = await file.read()
            try:
                image_url = utils.save_and_optimize_image(content, settings.UPLOAD_DIR)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

            is_primary = not primary_set
            crud.add_saree_image(db, saree_id=saree_id, image_url=image_url, is_primary=is_primary)
            primary_set = True

    # Refresh DB session to return saree with images relationship populated
    db.refresh(db_saree)
    return db_saree

@router.delete("/admin/sarees/{saree_id}", status_code=status.HTTP_204_NO_CONTENT)

def delete_saree(
    saree_id: int,
    db: Session = Depends(get_db),
    admin: str = Depends(auth.get_current_admin)
):

    """
    Admin endpoint to delete a saree.
    """
    # Note: in real-world we'd also delete the files from storage.
    # For simple local database cascade deletion, we delete the DB records.
    # We can delete files too to keep storage clean:
    saree = crud.get_saree(db, saree_id)
    if not saree:
        raise HTTPException(status_code=404, detail="Saree not found")
        
    # Delete files
    for img in saree.images:
        # Convert web path to absolute path
        # image_url starts with '/static/uploads/'
        filename = os.path.basename(img.image_url)
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")

    success = crud.delete_saree(db, saree_id=saree_id)
    if not success:
        raise HTTPException(status_code=400, detail="Error deleting saree")
    
    return {"message": "Saree and its associated images deleted successfully"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

@router.post("/orders", response_model=schemas.OrderResponse)
async def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Public endpoint to place a saree order.
    """
    try:
        db_order = crud.create_order(db, order)
        try:
            notification = {
                "type": "NEW_ORDER",
                "order_number": db_order.order_number,
                "customer_name": db_order.customer_name,
                "total_amount": db_order.total_amount
            }
            await manager.broadcast(json.dumps(notification))
        except Exception as ws_err:
            print(f"Error broadcasting WebSocket message: {ws_err}")
        return db_order
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error placing order: {str(e)}")

@router.get("/admin/orders", response_model=List[schemas.OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: str = Depends(auth.get_current_admin)
):
    """
    Secure admin endpoint to view order lists and customer details.
    """
    return crud.get_orders(db, skip=skip, limit=limit)

@router.websocket("/ws/orders")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@router.put("/admin/orders/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int,
    status_update: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: str = Depends(auth.get_current_admin)
):
    """
    Secure admin endpoint to update order status.
    """
    db_order = crud.update_order_status(db, order_id=order_id, status=status_update.status)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return db_order

@router.post("/sarees/{saree_id}/reviews", response_model=schemas.ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review_for_saree(saree_id: int, review: schemas.ReviewCreate, db: Session = Depends(get_db)):
    """
    Public endpoint to post reviews and ratings for a saree.
    """
    db_saree = crud.get_saree(db, saree_id=saree_id)
    if not db_saree:
        raise HTTPException(status_code=404, detail="Saree not found")
    try:
        return crud.create_review(db, review=review, saree_id=saree_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error posting review: {str(e)}")
