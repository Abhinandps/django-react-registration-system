"""
Django Admin Configuration for Admissions app.
Provides rich applicant inspection with photo thumbnails, linked documents, and search.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Applicant, ApplicantDocument


class ApplicantDocumentInline(admin.TabularInline):
    model = ApplicantDocument
    extra = 0
    readonly_fields = ['document_type', 'file_link', 'original_filename', 'uploaded_at']
    fields = ['document_type', 'file_link', 'original_filename', 'uploaded_at']

    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank" rel="noopener noreferrer">Download / View File</a>', obj.file.url)
        return "-"
    file_link.short_description = "Document File"

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = [
        'application_number',
        'photo_thumbnail',
        'full_name',
        'email',
        'phone',
        'status',
        'created_at',
    ]
    list_filter = ['status', 'gender', 'created_at']
    search_fields = ['application_number', 'first_name', 'last_name', 'email', 'phone']
    readonly_fields = [
        'id',
        'application_number',
        'photo_preview',
        'created_at',
        'updated_at',
        'geolocation_display',
    ]
    inlines = [ApplicantDocumentInline]

    fieldsets = (
        ("Application Reference", {
            'fields': ('application_number', 'status', 'id')
        }),
        ("Personal Information", {
            'fields': (
                ('first_name', 'last_name'),
                ('email', 'phone'),
                ('date_of_birth', 'gender'),
                'address',
            )
        }),
        ("Photograph", {
            'fields': ('photo', 'photo_preview')
        }),
        ("Geolocation Data", {
            'fields': (('latitude', 'longitude'), 'geolocation_display')
        }),
        ("Audit Metadata", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    full_name.short_description = "Name"

    def photo_thumbnail(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2);" />',
                obj.photo.url
            )
        return "-"
    photo_thumbnail.short_description = "Photo"

    def photo_preview(self, obj):
        if obj.photo:
            return format_html(
                '<img src="{}" style="max-width: 180px; max-height: 180px; object-fit: cover; border-radius: 8px; border: 1px solid #ccc;" />',
                obj.photo.url
            )
        return "No photo uploaded"
    photo_preview.short_description = "Photo Preview"

    def geolocation_display(self, obj):
        if obj.latitude and obj.longitude:
            maps_url = f"https://www.google.com/maps?q={obj.latitude},{obj.longitude}"
            return format_html(
                '<span>{}, {} &nbsp;(<a href="{}" target="_blank" rel="noopener noreferrer">View on Google Maps</a>)</span>',
                obj.latitude, obj.longitude, maps_url
            )
        return "Not captured"
    geolocation_display.short_description = "Coordinates Map Link"


@admin.register(ApplicantDocument)
class ApplicantDocumentAdmin(admin.ModelAdmin):
    list_display = ['applicant', 'document_type', 'original_filename', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['applicant__application_number', 'applicant__email', 'original_filename']
