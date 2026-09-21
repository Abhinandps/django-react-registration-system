import io
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Applicant, ApplicantDocument


def generate_test_image(filename="test.png", size=(100, 100), color="blue"):
    """Generate in-memory valid PNG image for tests."""
    file = io.BytesIO()
    image = Image.new("RGB", size, color=color)
    image.save(file, format="PNG")
    file.seek(0)
    return SimpleUploadedFile(
        name=filename,
        content=file.read(),
        content_type="image/png"
    )


def generate_test_pdf(filename="document.pdf", content=b"%PDF-1.4 test document content"):
    """Generate in-memory valid PDF file for tests."""
    return SimpleUploadedFile(
        name=filename,
        content=content,
        content_type="application/pdf"
    )


class ApplicantAPITests(APITestCase):
    def setUp(self):
        self.list_create_url = reverse('admissions:applicant-list')
        self.check_email_url = reverse('admissions:applicant-check-email')

    def test_successful_applicant_registration(self):
        """Test full applicant submission with photo, 10th and 12th marksheet, and coordinates."""
        photo = generate_test_image("student_photo.png")
        marksheet_10th = generate_test_pdf("marksheet_10th.pdf")
        marksheet_12th = generate_test_pdf("marksheet_12th.pdf")

        payload = {
            'first_name': 'Aarav',
            'last_name': 'Sharma',
            'email': 'aarav.sharma@example.com',
            'phone': '+919876543210',
            'date_of_birth': '2005-06-15',
            'gender': 'MALE',
            'address': 'Flat 402, Sunshine Heights, MG Road, Bengaluru',
            'photo': photo,
            'marksheet_10th': marksheet_10th,
            'marksheet_12th': marksheet_12th,
            'latitude': '12.971598',
            'longitude': '77.594566',
        }

        response = self.client.post(self.list_create_url, data=payload, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("application_number", response.data)
        self.assertTrue(response.data["application_number"].startswith("ADM-"))

        # Verify database records
        applicant = Applicant.objects.get(email='aarav.sharma@example.com')
        self.assertEqual(applicant.first_name, 'Aarav')
        self.assertEqual(applicant.documents.count(), 2)
        
        doc_types = list(applicant.documents.values_list('document_type', flat=True))
        self.assertIn('10TH_MARKSHEET', doc_types)
        self.assertIn('12TH_MARKSHEET', doc_types)

    def test_duplicate_email_rejected(self):
        """Test duplicate email rejection."""
        photo1 = generate_test_image("photo1.png")
        doc1_10 = generate_test_pdf("doc1_10.pdf")
        doc1_12 = generate_test_pdf("doc1_12.pdf")

        payload = {
            'first_name': 'Priya',
            'last_name': 'Nair',
            'email': 'priya.nair@example.com',
            'phone': '+919876543211',
            'date_of_birth': '2005-08-20',
            'gender': 'FEMALE',
            'address': 'Kochi, Kerala',
            'photo': photo1,
            'marksheet_10th': doc1_10,
            'marksheet_12th': doc1_12,
        }
        res1 = self.client.post(self.list_create_url, data=payload, format='multipart')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Attempt duplicate submission
        photo2 = generate_test_image("photo2.png")
        doc2_10 = generate_test_pdf("doc2_10.pdf")
        doc2_12 = generate_test_pdf("doc2_12.pdf")
        payload['photo'] = photo2
        payload['marksheet_10th'] = doc2_10
        payload['marksheet_12th'] = doc2_12

        res2 = self.client.post(self.list_create_url, data=payload, format='multipart')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res2.data)

    def test_invalid_file_extension_rejected(self):
        """Test uploading forbidden file extension (e.g. .exe or .sh disguised)."""
        invalid_file = SimpleUploadedFile("malware.exe", b"fake binary executable", content_type="application/octet-stream")
        photo = generate_test_image("valid.png")
        marksheet_12th = generate_test_pdf("12th.pdf")

        payload = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test.invalid@example.com',
            'phone': '+919876543212',
            'date_of_birth': '2005-01-01',
            'gender': 'OTHER',
            'address': 'Test address',
            'photo': photo,
            'marksheet_10th': invalid_file,
            'marksheet_12th': marksheet_12th,
        }
        res = self.client.post(self.list_create_url, data=payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('marksheet_10th', res.data)

    def test_oversized_photo_rejected(self):
        """Test photo larger than 2MB limit gets rejected."""
        # 3MB buffer
        large_content = b'0' * (3 * 1024 * 1024)
        oversized_photo = SimpleUploadedFile("large_photo.png", large_content, content_type="image/png")
        marksheet_10th = generate_test_pdf("10th.pdf")
        marksheet_12th = generate_test_pdf("12th.pdf")

        payload = {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'large.photo@example.com',
            'phone': '+919876543213',
            'date_of_birth': '2005-01-01',
            'gender': 'MALE',
            'address': 'Test address',
            'photo': oversized_photo,
            'marksheet_10th': marksheet_10th,
            'marksheet_12th': marksheet_12th,
        }
        res = self.client.post(self.list_create_url, data=payload, format='multipart')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('photo', res.data)

    def test_check_email_endpoint(self):
        """Test asynchronous check-email endpoint."""
        res_avail = self.client.get(f"{self.check_email_url}?email=fresh.email@example.com")
        self.assertEqual(res_avail.status_code, status.HTTP_200_OK)
        self.assertTrue(res_avail.data['available'])

    def test_all_applicants_endpoint(self):
        """Test fetching complete list of applicants without document payloads."""
        # Create applicant
        photo = generate_test_image("photo_list.png")
        doc10 = generate_test_pdf("doc10.pdf")
        doc12 = generate_test_pdf("doc12.pdf")
        self.client.post(self.list_create_url, data={
            'first_name': 'Rohan',
            'last_name': 'Verma',
            'email': 'rohan.verma@example.com',
            'phone': '+919876543219',
            'date_of_birth': '2005-03-10',
            'gender': 'MALE',
            'address': 'Pune, Maharashtra',
            'photo': photo,
            'marksheet_10th': doc10,
            'marksheet_12th': doc12,
            'latitude': '18.520430',
            'longitude': '73.856744',
        }, format='multipart')

        all_url = reverse('admissions:applicant-all-applicants')
        res = self.client.get(all_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.data, list)
        self.assertGreaterEqual(len(res.data), 1)

        item = res.data[0]
        self.assertEqual(item['email'], 'rohan.verma@example.com')
        self.assertEqual(item['first_name'], 'Rohan')
        self.assertIn('latitude', item)
        self.assertIn('longitude', item)
        # Ensure no document files array in lightweight list
        self.assertNotIn('documents', item)
        self.assertNotIn('photo', item)
