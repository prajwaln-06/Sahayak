"""
FlexiSpace — OCR Service (Google Cloud Vision REST API)
Extracts text from ID documents for KYC verification.
"""

import logging
import re
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate"


async def extract_text_from_image(image_url: str) -> str:
    """
    Call Google Cloud Vision API to perform OCR on an image.

    Args:
        image_url: Public URL of the image.

    Returns:
        Extracted text string.
    """
    payload = {
        "requests": [
            {
                "image": {"source": {"imageUri": image_url}},
                "features": [{"type": "TEXT_DETECTION", "maxResults": 1}],
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                f"{VISION_API_URL}?key={settings.google_api_key}",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

        responses = data.get("responses", [])
        if not responses:
            logger.warning("Vision API returned empty responses")
            return ""

        annotations = responses[0].get("textAnnotations", [])
        if not annotations:
            logger.warning("No text detected in image")
            return ""

        full_text = annotations[0].get("description", "")
        logger.info(f"OCR extracted {len(full_text)} characters")
        return full_text

    except httpx.HTTPStatusError as e:
        logger.error(f"Vision API HTTP error: {e.response.status_code} – {e.response.text}")
        raise Exception(f"OCR failed: {e.response.status_code}")
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise


def parse_aadhaar(text: str) -> dict:
    """Parse Aadhaar card OCR text to extract name, DOB, and Aadhaar number."""
    result: dict[str, Optional[str]] = {"name": None, "dob": None, "id_number": None}

    # Aadhaar number: 12 digits, often in groups of 4
    aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", text)
    if aadhaar_match:
        result["id_number"] = aadhaar_match.group(1).replace(" ", "")

    # DOB: DD/MM/YYYY or DD-MM-YYYY
    dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
    if dob_match:
        result["dob"] = dob_match.group(1)

    # Name: line after "Government of India" or first capitalized line
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for i, line in enumerate(lines):
        if "government" in line.lower() and i + 1 < len(lines):
            result["name"] = lines[i + 1]
            break

    return result


def parse_pan(text: str) -> dict:
    """Parse PAN card OCR text."""
    result: dict[str, Optional[str]] = {"name": None, "dob": None, "id_number": None}

    # PAN: 10 alphanumeric, e.g. ABCDE1234F
    pan_match = re.search(r"\b([A-Z]{5}\d{4}[A-Z])\b", text)
    if pan_match:
        result["id_number"] = pan_match.group(1)

    # DOB
    dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
    if dob_match:
        result["dob"] = dob_match.group(1)

    # Name: typically on a line by itself in CAPS
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if line.isupper() and len(line) > 5 and not re.match(r"^[A-Z]{5}\d{4}[A-Z]$", line):
            if "INCOME" not in line and "INDIA" not in line and "GOVT" not in line:
                result["name"] = line.title()
                break

    return result


def parse_passport(text: str) -> dict:
    """Parse passport OCR text."""
    result: dict[str, Optional[str]] = {"name": None, "dob": None, "id_number": None}

    # Passport number: 1 letter + 7 digits
    passport_match = re.search(r"\b([A-Z]\d{7})\b", text)
    if passport_match:
        result["id_number"] = passport_match.group(1)

    # DOB
    dob_match = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", text)
    if dob_match:
        result["dob"] = dob_match.group(1)

    # Name: line after "Given Name" or "Surname"
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for i, line in enumerate(lines):
        if "given name" in line.lower() or "surname" in line.lower():
            if i + 1 < len(lines):
                result["name"] = lines[i + 1].title()
                break

    return result


def parse_document(text: str, doc_type: str) -> dict:
    """Route to the appropriate parser based on document type."""
    parsers = {
        "AADHAAR": parse_aadhaar,
        "PAN": parse_pan,
        "PASSPORT": parse_passport,
    }
    parser = parsers.get(doc_type, parse_aadhaar)
    return parser(text)
