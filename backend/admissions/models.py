import os
import uuid
from django.db import models
from django.core.validators import RegexValidator
from .validators import validate_photo, validate_document


def applicant_photo_path(instance, filename):
    """Generate a collision-resistant path for applicant photos."""
    ext = os.path.splitext(filename)[1].lower()
    return f"applicants/photos/{instance.id or uuid.uuid4()}/photo{ext}"


def applicant_document_path(instance, filename):
    """Generate a collision-resistant path for applicant documents."""
    ext = os.path.splitext(filename)[1].lower()
    doc_type = instance.document_type.lower()
    return f"applicants/documents/{instance.applicant.id}/{doc_type}_{uuid.uuid4().hex[:8]}{ext}"


class Applicant(models.Model):
    """
    Primary model storing an applicant's registration data,
    personal details, passport photo, and browser geolocation coordinates.
    """
    GENDER_CHOICES = [
        ('MALE', 'Male'),
        ('FEMALE', 'Female'),
        ('OTHER', 'Other'),
    ]

    STATUS_CHOICES = [
        ('SUBMITTED', 'Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('VERIFIED', 'Verified'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application_number = models.CharField(max_length=32, unique=True, editable=False, db_index=True)

    first_name = models.CharField(max_length=60)
    last_name = models.CharField(max_length=60)
    email = models.EmailField(unique=True, db_index=True)
    
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in format: '+999999999'. Up to 15 digits allowed."
    )
    phone = models.CharField(validators=[phone_validator], max_length=17)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    address = models.TextField()

    photo = models.ImageField(
        upload_to=applicant_photo_path,
        validators=[validate_photo],
        help_text="Passport-sized photograph (max 2MB, .jpg, .jpeg, .png, .webp)"
    )

    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Browser latitude coordinate at time of submission"
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Browser longitude coordinate at time of submission"
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SUBMITTED')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Applicant"
        verbose_name_plural = "Applicants"

    def save(self, *args, **kwargs):
        if not self.application_number:
            unique_suffix = uuid.uuid4().hex[:6].upper()
            self.application_number = f"ADM-{unique_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application_number} - {self.first_name} {self.last_name} ({self.email})"


class ApplicantDocument(models.Model):
    """
    Related model supporting multiple verified documents per applicant
    (e.g., 10th marksheet, 12th marksheet, ID proof, certificates).
    """
    DOCUMENT_TYPES = [
        ('10TH_MARKSHEET', '10th Standard Marksheet'),
        ('12TH_MARKSHEET', '12th Standard / Higher Secondary Marksheet'),
        ('TRANSFER_CERTIFICATE', 'Transfer Certificate (TC)'),
        ('ID_PROOF', 'Government ID Proof'),
        ('OTHER', 'Other Supporting Document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    applicant = models.ForeignKey(
        Applicant,
        related_name='documents',
        on_delete=models.CASCADE
    )
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES)
    file = models.FileField(
        upload_to=applicant_document_path,
        validators=[validate_document],
        help_text="Document file (max 5MB, PDF, JPG, PNG)"
    )
    original_filename = models.CharField(max_length=255, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['document_type']
        verbose_name = "Applicant Document"
        verbose_name_plural = "Applicant Documents"

    def save(self, *args, **kwargs):
        if self.file and not self.original_filename:
            self.original_filename = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.applicant.application_number} - {self.get_document_type_display()}"
