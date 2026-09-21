"""
DRF Serializers for Admissions API.
Handles atomic creation of Applicant and related ApplicantDocuments with rigorous validation.
"""

from rest_framework import serializers
from django.db import transaction
from .models import Applicant, ApplicantDocument
from .validators import validate_photo, validate_document


class ApplicantDocumentSerializer(serializers.ModelSerializer):
    """Read serializer for uploaded documents."""
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ApplicantDocument
        fields = [
            'id',
            'document_type',
            'document_type_display',
            'file',
            'file_url',
            'original_filename',
            'uploaded_at',
        ]
        read_only_fields = ['id', 'original_filename', 'uploaded_at']

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ApplicantListSerializer(serializers.ModelSerializer):
    """
    Lightweight public list serializer returning only applicant text details,
    timestamps, and geolocation coordinates without media/document payloads.
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)

    class Meta:
        model = Applicant
        fields = [
            'id',
            'application_number',
            'first_name',
            'last_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'gender_display',
            'address',
            'latitude',
            'longitude',
            'status',
            'status_display',
            'created_at',
        ]
        read_only_fields = fields


class ApplicantDetailSerializer(serializers.ModelSerializer):
    """Complete detail serializer for Applicant with nested documents."""
    documents = ApplicantDocumentSerializer(many=True, read_only=True)
    photo_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Applicant
        fields = [
            'id',
            'application_number',
            'first_name',
            'last_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'address',
            'photo',
            'photo_url',
            'latitude',
            'longitude',
            'status',
            'status_display',
            'created_at',
            'updated_at',
            'documents',
        ]
        read_only_fields = ['id', 'application_number', 'status', 'created_at', 'updated_at']

    def get_photo_url(self, obj):
        request = self.context.get('request')
        if obj.photo and hasattr(obj.photo, 'url'):
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None


class ApplicantCreateSerializer(serializers.ModelSerializer):
    """
    Writable serializer handling multi-part registration form submission.
    Accepts applicant personal details, passport photograph, and required/optional
    academic documents atomically.
    """
    # Explicit document fields to provide clean validation and client-side error mapping
    marksheet_10th = serializers.FileField(
        write_only=True,
        required=True,
        validators=[validate_document],
        help_text="10th Standard Marksheet (PDF, JPG, PNG up to 5MB)"
    )
    marksheet_12th = serializers.FileField(
        write_only=True,
        required=True,
        validators=[validate_document],
        help_text="12th Standard Marksheet (PDF, JPG, PNG up to 5MB)"
    )
    transfer_certificate = serializers.FileField(
        write_only=True,
        required=False,
        allow_null=True,
        validators=[validate_document],
        help_text="Optional Transfer Certificate"
    )

    class Meta:
        model = Applicant
        fields = [
            'id',
            'application_number',
            'first_name',
            'last_name',
            'email',
            'phone',
            'date_of_birth',
            'gender',
            'address',
            'photo',
            'latitude',
            'longitude',
            'marksheet_10th',
            'marksheet_12th',
            'transfer_certificate',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'application_number', 'status', 'created_at']
        extra_kwargs = {
            'photo': {'validators': [validate_photo]},
        }

    def validate_email(self, value):
        """Ensure email is unique case-insensitively."""
        normalized_email = value.strip().lower()
        if Applicant.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("An application with this email address has already been submitted.")
        return normalized_email

    def validate(self, attrs):
        """Cross-field validation (e.g. coordinates consistency)."""
        lat = attrs.get('latitude')
        lng = attrs.get('longitude')
        if (lat is not None and lng is None) or (lng is not None and lat is None):
            raise serializers.ValidationError("Both latitude and longitude must be provided together.")

        if lat is not None:
            if not (-90.0 <= float(lat) <= 90.0):
                raise serializers.ValidationError({'latitude': "Latitude must be between -90 and 90 degrees."})
        if lng is not None:
            if not (-180.0 <= float(lng) <= 180.0):
                raise serializers.ValidationError({'longitude': "Longitude must be between -180 and 180 degrees."})

        return attrs

    def create(self, validated_data):
        """Atomically create Applicant and related Document models."""
        marksheet_10th = validated_data.pop('marksheet_10th')
        marksheet_12th = validated_data.pop('marksheet_12th')
        transfer_cert = validated_data.pop('transfer_certificate', None)

        with transaction.atomic():
            applicant = Applicant.objects.create(**validated_data)

            ApplicantDocument.objects.create(
                applicant=applicant,
                document_type='10TH_MARKSHEET',
                file=marksheet_10th,
                original_filename=marksheet_10th.name
            )

            ApplicantDocument.objects.create(
                applicant=applicant,
                document_type='12TH_MARKSHEET',
                file=marksheet_12th,
                original_filename=marksheet_12th.name
            )

            if transfer_cert:
                ApplicantDocument.objects.create(
                    applicant=applicant,
                    document_type='TRANSFER_CERTIFICATE',
                    file=transfer_cert,
                    original_filename=transfer_cert.name
                )

        return applicant

    def to_representation(self, instance):
        """Return the rich detail representation on creation response."""
        serializer = ApplicantDetailSerializer(instance, context=self.context)
        return serializer.data
