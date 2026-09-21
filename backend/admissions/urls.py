"""
Admissions App URL Configuration.
Uses DRF DefaultRouter for standard RESTful endpoints.
"""

from rest_framework.routers import DefaultRouter
from .views import ApplicantViewSet, ApplicantDocumentViewSet

app_name = 'admissions'

router = DefaultRouter()
router.register(r'applicants', ApplicantViewSet, basename='applicant')
router.register(r'documents', ApplicantDocumentViewSet, basename='document')

urlpatterns = router.urls
