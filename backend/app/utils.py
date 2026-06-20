import os
import uuid
from io import BytesIO
from PIL import Image

def save_and_optimize_image(file_data: bytes, upload_dir: str) -> str:
    """
    Saves an uploaded image, automatically resizing it if it's too large,
    converting it to WebP format, and compressing it for optimized web delivery.
    """
    # Ensure directory exists
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate a unique name
    unique_filename = f"{uuid.uuid4().hex}.webp"
    dest_path = os.path.join(upload_dir, unique_filename)
    
    try:
        # Load image with Pillow
        image = Image.open(BytesIO(file_data))
        
        # Convert transparent images (RGBA) to RGB (WebP handles transparency, but for standard products RGB is fine)
        # We preserve transparency if needed, but since it's WebP, we can actually save in RGBA if mode is RGBA,
        # but to save size let's keep RGB if we want or just let it auto-select.
        # Actually Pillow can save RGBA as WEBP perfectly. We only convert to RGB if it's not supported or to optimize.
        # Let's check:
        if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
            # Keep alpha channel for WebP
            save_mode = "RGBA"
            if image.mode != "RGBA":
                image = image.convert("RGBA")
        else:
            save_mode = "RGB"
            if image.mode != "RGB":
                image = image.convert("RGB")
                
        # Resize if width or height exceeds 2560px (2K/4K high clarity)
        max_dimension = 2560
        if image.width > max_dimension or image.height > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            
        # Save image as WEBP with 95% quality (excellent clarity, minimal artifacting)
        image.save(dest_path, "WEBP", quality=95)
        
        # Return web-accessible relative path
        return f"/static/uploads/{unique_filename}"
        
    except Exception as e:
        # Fallback: if PIL fails, save raw (but print/log error)
        print(f"Error optimizing image: {e}")
        # In a real environment, we'd raise or handle. Let's raise to prevent uncompressed uploads.
        raise e
