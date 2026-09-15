import os
import shutil
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from ..config import UPLOADS_DIR

router = APIRouter(prefix="/api/upload", tags=["File & Photo Uploads"])

@router.post("")
async def upload_evidence_photo(file: UploadFile = File(...)):
    """Uploads site evidence photo and returns static URL."""
    try:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
            suffix = ".jpg"
        
        # Save file to uploads folder
        clean_name = f"evidence_{file.filename.replace(' ', '_')}"
        file_path = UPLOADS_DIR / clean_name
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "status": "success",
            "filename": clean_name,
            "url": f"/uploads/{clean_name}"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
