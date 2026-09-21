"""
Validation utilities for files uploaded to the admissions portal.
Enforces strict size limits, permitted extensions, and MIME magic header verification.
"""

import os
from django.core.exceptions import ValidationError
from django.conf import settings

# Allowed file extensions
ALLOWED_PHOTO_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
ALLOWED_DOC_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

# Common MIME signatures for defense in depth
IMAGE_MAGIC_HEADERS = [
    b'\xff\xd8\xff',            # JPEG
    b'\x89PNG\r\n\x1a\n',       # PNG
    b'RIFF',                    # WEBP (starts with RIFF...WEBP)
]
PDF_MAGIC_HEADER = b'%PDF'


def validate_file_extension(value, allowed_extensions):
    """Ensure the file has one of the allowed extensions."""
    ext = os.path.splitext(value.name)[1].lower()
    if ext not in allowed_extensions:
        raise ValidationError(
            f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(allowed_extensions)}."
        )


def validate_photo(value):
    """
    Validate applicant passport photo:
    1. Size limit (default max 2MB).
    2. Extension (.jpg, .jpeg, .png, .webp).
    3. Magic bytes verification to detect file spoofing.
    """
    max_size = getattr(settings, 'MAX_PHOTO_SIZE', 2 * 1024 * 1024)
    if value.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(f"Passport photo exceeds maximum allowed size of {max_mb:.1f}MB.")

    validate_file_extension(value, ALLOWED_PHOTO_EXTENSIONS)

    # Magic byte check
    try:
        header = value.read(16)
        value.seek(0)  # Always rewind after reading
        is_valid_image = any(header.startswith(sig) for sig in IMAGE_MAGIC_HEADERS) or b'WEBP' in header
        if not is_valid_image:
            raise ValidationError("Invalid image format. The file content does not match a valid image header.")
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError("Unable to verify image integrity.")


def validate_document(value):
    """
    Validate marksheet / academic certificate:
    1. Size limit (default max 5MB).
    2. Extension (.pdf, .jpg, .jpeg, .png).
    3. Magic bytes inspection.
    """
    max_size = getattr(settings, 'MAX_DOCUMENT_SIZE', 5 * 1024 * 1024)
    if value.size > max_size:
        max_mb = max_size / (1024 * 1024)
        raise ValidationError(f"Document exceeds maximum allowed size of {max_mb:.1f}MB.")

    validate_file_extension(value, ALLOWED_DOC_EXTENSIONS)

    ext = os.path.splitext(value.name)[1].lower()
    try:
        header = value.read(16)
        value.seek(0)

        if ext == '.pdf':
            if not header.startswith(PDF_MAGIC_HEADER):
                raise ValidationError("Invalid PDF file. Header verification failed.")
        else:
            is_valid_image = any(header.startswith(sig) for sig in IMAGE_MAGIC_HEADERS)
            if not is_valid_image:
                raise ValidationError("Invalid document image. Header verification failed.")
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError("Unable to verify document integrity.")
