"""
FlexiSpace — Cloudinary Storage Service
Upload and delete images via Cloudinary.
"""

import logging
from io import BytesIO

import cloudinary
import cloudinary.uploader

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Configure Cloudinary ──────────────────────────────────────
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True,
)


async def upload_image(
    file_bytes: bytes,
    folder: str = "flexispace",
    resource_type: str = "image",
) -> dict:
    """
    Upload image bytes to Cloudinary.

    Args:
        file_bytes: Raw file bytes.
        folder: Cloudinary folder path.
        resource_type: 'image', 'video', or 'raw'.

    Returns:
        dict with 'secure_url' and 'public_id'.
    """
    try:
        result = cloudinary.uploader.upload(
            BytesIO(file_bytes),
            folder=folder,
            resource_type=resource_type,
            transformation=[
                {"quality": "auto:good", "fetch_format": "auto"},
            ],
        )
        logger.info(f"Uploaded to Cloudinary: {result['public_id']}")
        return {
            "secure_url": result["secure_url"],
            "public_id": result["public_id"],
            "width": result.get("width"),
            "height": result.get("height"),
        }
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")
        raise Exception(f"Image upload failed: {e}")

async def upload_video(
    file_bytes: bytes,
    folder: str = "flexispace/videos",
) -> str:
    """
    Upload video bytes to Cloudinary.

    Args:
        file_bytes: Raw file bytes.
        folder: Cloudinary folder path.

    Returns:
        secure_url of the uploaded video.
    """
    try:
        result = cloudinary.uploader.upload(
            BytesIO(file_bytes),
            folder=folder,
            resource_type="video",
        )
        logger.info(f"Uploaded video to Cloudinary: {result['public_id']}")
        return result["secure_url"]
    except Exception as e:
        logger.error(f"Cloudinary video upload failed: {e}")
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video upload failed: {e}"
        )

async def upload_image_from_url(image_url: str, folder: str = "flexispace") -> dict:
    """Upload an image from a URL to Cloudinary."""
    try:
        result = cloudinary.uploader.upload(
            image_url,
            folder=folder,
            resource_type="image",
        )
        return {
            "secure_url": result["secure_url"],
            "public_id": result["public_id"],
        }
    except Exception as e:
        logger.error(f"Cloudinary URL upload failed: {e}")
        raise Exception(f"Image upload failed: {e}")


async def delete_image(public_id: str) -> bool:
    """
    Delete an image from Cloudinary by its public_id.

    Returns True on success, False on failure.
    """
    try:
        result = cloudinary.uploader.destroy(public_id)
        if result.get("result") == "ok":
            logger.info(f"Deleted from Cloudinary: {public_id}")
            return True
        logger.warning(f"Cloudinary delete returned: {result}")
        return False
    except Exception as e:
        logger.error(f"Cloudinary delete failed for {public_id}: {e}")
        return False


async def generate_thumbnail(secure_url: str, width: int = 400, height: int = 300) -> str:
    """Generate a thumbnail URL from a Cloudinary image URL."""
    if "/upload/" in secure_url:
        return secure_url.replace(
            "/upload/",
            f"/upload/c_fill,w_{width},h_{height},q_auto,f_auto/",
        )
    return secure_url
