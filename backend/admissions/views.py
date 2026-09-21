"""
DRF ViewSets for Admissions API.
Provides RESTful endpoints for applicant registrations, querying, and status auditing.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import models
from django.shortcuts import get_object_or_404
from .models import Applicant, ApplicantDocument
from .serializers import (
    ApplicantDetailSerializer,
    ApplicantCreateSerializer,
    ApplicantListSerializer,
    ApplicantDocumentSerializer,
)


class ApplicantViewSet(viewsets.ModelViewSet):
    """
    100% Public & Unauthenticated API endpoint for managing College Admission Applicants.
    - POST /api/applicants/     : Submit new registration (multipart/form-data)
    - GET /api/applicants/      : List applicants with pagination & search
    - GET /api/applicants/all/  : Complete unpaginated list of all applicants (latest first)
    - GET /api/applicants/<id>/ : Retrieve applicant details and documents
    """
    queryset = Applicant.objects.prefetch_related('documents').all()
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action in ['create']:
            return ApplicantCreateSerializer
        if self.action in ['list', 'all_applicants']:
            return ApplicantListSerializer
        return ApplicantDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset().order_by('-created_at')
        status_param = self.request.query_params.get('status')
        search_param = self.request.query_params.get('search')

        if status_param:
            qs = qs.filter(status=status_param.upper())

        if search_param:
            qs = qs.filter(
                models.Q(first_name__icontains=search_param) |
                models.Q(last_name__icontains=search_param) |
                models.Q(email__icontains=search_param) |
                models.Q(application_number__icontains=search_param)
            )

        return qs

    def create(self, request, *args, **kwargs):
        """Handle new applicant registration with detailed validation errors."""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        applicant = serializer.save()

        # Build response with reference number and created data
        response_data = serializer.to_representation(applicant)
        return Response(
            {
                "message": "Application submitted successfully.",
                "application_number": applicant.application_number,
                "data": response_data,
            },
            status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=['get'], url_path='check-email')
    def check_email(self, request):
        """Asynchronous validation helper for frontend to check if email already registered."""
        email = request.query_params.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        exists = Applicant.objects.filter(email__iexact=email).exists()
        return Response({"available": not exists})

    @action(detail=False, methods=['get'], url_path='all', pagination_class=None)
    def all_applicants(self, request):
        """
        Public endpoint returning the complete unpaginated list of all applicants
        ordered by latest first (text details & coordinates only).
        GET /api/applicants/all/
        """
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ApplicantDocumentViewSet(viewsets.ReadOnlyModelViewSet):
    """100% Public read-only endpoint for viewing uploaded documents."""
    queryset = ApplicantDocument.objects.select_related('applicant').all()
    serializer_class = ApplicantDocumentSerializer
    permission_classes = [permissions.AllowAny]
    authentication_classes = []
