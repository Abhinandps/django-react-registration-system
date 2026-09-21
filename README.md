# College Admission Online Registration Portal
### Enterprise Full-Stack System Architecture & Machine Test Implementation

[![Django](https://img.shields.io/badge/Django-5.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/Django%20REST-3.15-red?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Sass](https://img.shields.io/badge/Sass-SCSS-CC6699?style=for-the-badge&logo=sass&logoColor=white)](https://sass-lang.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

---

## 1. Executive Summary & Tech Stack

This project is a production-ready, scalable **College Admission Online Registration System** engineered to handle high-concurrency student admissions, multi-part document ingestion, geographic coordinate tagging, and administrative auditing.

- **Backend**: Python 3.14 / Django 5.2, Django REST Framework (DRF), `django-environ`, `django-cors-headers`, Pillow, `psycopg` (PostgreSQL driver).
- **Frontend**: React 19, Vite, Modular Sass (SCSS) design tokens, Axios HTTP client with response interceptors, Lucide icons, HTML5 Geolocation API.
- **Database**: PostgreSQL (with automatic zero-config SQLite fallback for local developer testing).

---

## 2. System Design Architecture

The platform follows a layered, decoupled service-oriented architecture designed to scale independently under burst admission registration periods.

### 2.1 High-Level Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (Presentation)"]
        UserBrowser["Applicant Browser (Mobile / Desktop)"]
        AdminBrowser["Admissions Officer / Admin Console"]
    end

    subgraph EdgeLayer ["Edge & Ingress Layer"]
        CDN["CloudFront / Cloudflare CDN\n(Static Assets & Caching)"]
        ReverseProxy["Nginx Ingress / Reverse Proxy\n(SSL Termination, Rate Limiting, 10MB Max Body)"]
    end

    subgraph AppLayer ["Application Tier (Stateless)"]
        ViteDev["Vite / React SPA Host"]
        Gunicorn["Django Application Server (WSGI/ASGI via Gunicorn)"]
        DRFEngine["Django REST Framework\n(Parsers, Serializers, Validators)"]
        AdminModule["Django Admin Interface\n(Thumbnails, Verification, Maps)"]
    end

    subgraph AsyncTier ["Asynchronous Processing Tier (Production Scalability)"]
        MessageBroker["Redis Message Broker"]
        CeleryWorker["Celery Background Workers\n(ClamAV Virus Scan, PDF Watermarking, Email Dispatch)"]
    end

    subgraph DataStorageTier ["Storage & Persistence Tier"]
        DB[(PostgreSQL Primary Database\nACID Transactions, UUIDs, B-Tree Indexes)]
        BlobStorage["Object Storage (AWS S3 / Cloudflare R2)\nEncrypted Bucket for Photos & Marksheets"]
    end

    UserBrowser -->|HTTPS / REST API| ReverseProxy
    AdminBrowser -->|HTTPS / Session Admin| ReverseProxy
    ReverseProxy -->|Static Frontend| ViteDev
    ReverseProxy -->|API Routing /api/*| Gunicorn
    Gunicorn --> DRFEngine
    Gunicorn --> AdminModule
    DRFEngine -->|Atomic DB Writes| DB
    DRFEngine -->|Store Files| BlobStorage
    DRFEngine -.->|Enqueue Tasks| MessageBroker
    MessageBroker --> CeleryWorker
    CeleryWorker -->|Update Status| DB
    CeleryWorker -->|Async Notifications| UserBrowser
```

---

### 2.2 End-to-End Registration Flow (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Student as Applicant (Browser)
    participant UI as React SPA (Vite + Sass)
    participant API as Django DRF (/api/applicants/)
    participant Validator as Strict File Validator
    participant DB as PostgreSQL Database
    participant Storage as File / Media Storage

    Student->>UI: Fills Step 1 (Personal details: Name, Email, Phone, DOB)
    UI->>API: GET /api/applicants/check-email/?email=...
    API-->>UI: 200 OK (Email availability status)
    
    Student->>UI: Fills Step 2 (Uploads Photo, 10th & 12th Marksheets)
    UI->>UI: Client validation (extensions, sizes < 2MB/5MB, live preview)
    
    Student->>UI: Triggers Step 3 (Captures Browser Geolocation)
    UI->>Student: Requests navigator.geolocation.getCurrentPosition()
    Student-->>UI: Grants permission; Lat/Lng captured
    
    Student->>UI: Confirms Declaration & Clicks "Submit Application"
    UI->>API: POST /api/applicants/ (multipart/form-data)
    
    activate API
    API->>Validator: Inspect file extensions (.jpg, .png, .pdf)
    API->>Validator: Inspect MIME magic headers (anti-spoofing)
    API->>Validator: Verify coordinate ranges (-90 to +90, -180 to +180)
    
    alt Validation Failure
        Validator-->>API: ValidationError (e.g., file too large / invalid magic bytes)
        API-->>UI: 400 Bad Request (Formatted field-level errors)
        UI-->>Student: Displays actionable error banners on affected step
    else Validation Success
        API->>DB: Begin Atomic Transaction
        API->>Storage: Persist Photo (applicants/photos/<uuid>/photo.ext)
        API->>DB: INSERT INTO admissions_applicant (...)
        API->>Storage: Persist 10th & 12th marksheets
        API->>DB: INSERT INTO admissions_applicantdocument (FK -> applicant)
        API->>DB: Commit Transaction
        API-->>UI: 201 Created (application_number: "ADM-XXXXXX", full payload)
        deactivate API
        UI-->>Student: Renders Success Screen with Application Reference ID & Print Option
    end
```

---

### 2.3 Database Schema & Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    Applicant ||--o{ ApplicantDocument : "submits multiple"
    
    Applicant {
        uuid id PK "UUID primary key"
        varchar application_number UK "Indexed human-readable reference e.g. ADM-A1B2C3"
        varchar first_name "First name (max 60)"
        varchar last_name "Last name (max 60)"
        varchar email UK "Indexed unique email"
        varchar phone "Regex validated (+999999999)"
        date date_of_birth "Date of Birth"
        varchar gender "MALE, FEMALE, OTHER"
        text address "Residential address"
        varchar photo "Path to passport photograph"
        decimal latitude "Decimal(9,6) browser coordinate"
        decimal longitude "Decimal(9,6) browser coordinate"
        varchar status "SUBMITTED, UNDER_REVIEW, VERIFIED, REJECTED"
        timestamptz created_at "Timestamp of creation"
        timestamptz updated_at "Timestamp of modification"
    }

    ApplicantDocument {
        uuid id PK "UUID primary key"
        uuid applicant_id FK "Foreign key to Applicant (CASCADE)"
        varchar document_type "10TH_MARKSHEET, 12TH_MARKSHEET, TC, ID_PROOF"
        varchar file "Document storage path"
        varchar original_filename "Original client-side filename"
        timestamptz uploaded_at "Timestamp of upload"
    }
```

---

## 3. Security Architecture & Threat Modeling

| Security Threat | Attack Vector | Mitigation Implemented |
| :--- | :--- | :--- |
| **Malicious File Upload** | Attacker uploads `.php` or executable script renamed to `.png` or `.pdf` | Multi-layered validation: (1) Extension whitelist, (2) Magic bytes header inspection (e.g. `%PDF`, `\x89PNG`, `\xff\xd8\xff`), (3) Collision-resistant random UUID filenames. |
| **Denial of Service (DoS)** | Giant multi-gigabyte uploads saturating disk & memory | Strict request bounds: `DATA_UPLOAD_MAX_MEMORY_SIZE = 10MB`, `MAX_PHOTO_SIZE = 2MB`, `MAX_DOCUMENT_SIZE = 5MB`. |
| **Object Enumeration (IDOR)** | Attacker enumerates `/api/applicants/1`, `/api/applicants/2` | Primary keys use non-sequential UUIDv4. Application reference numbers use random hex nonces (`ADM-XXXXXX`). |
| **Cross-Site Request Forgery (CSRF)** | Unauthorized actions from malicious sites | Django CSRF protection enabled for session endpoints; REST API isolated with strict `CORS_ALLOWED_ORIGINS` filtering. |
| **SQL Injection** | Input manipulation via form fields | Complete reliance on Django ORM parameterized queries and sanitized serial fields. |
| **Email Collision / Race Conditions** | Concurrent submissions with identical email | Database-level unique constraint on `Applicant.email` coupled with `transaction.atomic()` during creation. |

---

## 4. Scalability & High Availability Roadmap

1. **Decoupled Asynchronous Tasks (Celery + Redis)**:
   - Offload heavy tasks (OCR of marksheet text, ClamAV anti-virus scanning, and automated welcome email with PDF acknowledgment receipts) to background Celery workers so HTTP requests respond within < 150ms.
2. **Media Storage Offloading (AWS S3 / GCS)**:
   - Configure `django-storages` with `boto3` to store uploaded photos and marksheets directly into private S3 buckets, served via signed URLs with CloudFront edge caching.
3. **Database Concurrency & Read-Replicas**:
   - For high-volume admission release dates, route read queries (e.g., student application status lookups, search filters) to read replicas using Django database routing.
   - Utilize PgBouncer for transaction-level connection pooling.
4. **Containerization**:
   - Provide multi-stage Dockerfiles and Helm charts for Kubernetes cluster deployment with Horizontal Pod Autoscaling (HPA) triggered by CPU/Request metrics.

---

## 5. API Documentation

### Base URL: `http://localhost:8000/api`

#### 1. Submit Application
- **Method**: `POST`
- **Path**: `/applicants/`
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `first_name` (string, required)
  - `last_name` (string, required)
  - `email` (string, required, unique)
  - `phone` (string, required, e.g., `+919876543210`)
  - `date_of_birth` (string: `YYYY-MM-DD`, required)
  - `gender` (string: `MALE`, `FEMALE`, `OTHER`, required)
  - `address` (string, required)
  - `photo` (file, required, max 2MB, image/jpeg, image/png)
  - `marksheet_10th` (file, required, max 5MB, pdf/jpeg/png)
  - `marksheet_12th` (file, required, max 5MB, pdf/jpeg/png)
  - `transfer_certificate` (file, optional, max 5MB)
  - `latitude` (decimal, optional, e.g. `12.971598`)
  - `longitude` (decimal, optional, e.g. `77.594566`)
- **Response (201 Created)**:
  ```json
  {
    "message": "Application submitted successfully.",
    "application_number": "ADM-7B2F89",
    "data": {
      "id": "7f8b9a2c-1234-4567-89ab-cdef01234567",
      "application_number": "ADM-7B2F89",
      "first_name": "Aarav",
      "last_name": "Sharma",
      "email": "aarav.sharma@example.com",
      "phone": "+919876543210",
      "status": "SUBMITTED",
      "photo_url": "http://localhost:8000/media/applicants/photos/.../photo.png",
      "latitude": "12.971598",
      "longitude": "77.594566",
      "documents": [
        {
          "id": "...",
          "document_type": "10TH_MARKSHEET",
          "file_url": "http://localhost:8000/media/applicants/documents/.../10th.pdf"
        }
      ]
    }
  }
  ```

#### 2. Check Email Availability
- **Method**: `GET`
- **Path**: `/applicants/check-email/?email=candidate@example.com`
- **Response (200 OK)**:
  ```json
  {
    "available": true
  }
  ```

#### 3. List All Submitted Applications (100% Public & Lightweight)
- **Method**: `GET`
- **Path**: `/applicants/all/`
- **Description**: Returns the complete list of all registered applicants (ordered latest first) with text fields and geolocation coordinates only (no media/documents payload).
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "7f8b9a2c-1234-4567-89ab-cdef01234567",
      "application_number": "ADM-7B2F89",
      "first_name": "Aarav",
      "last_name": "Sharma",
      "email": "aarav.sharma@example.com",
      "phone": "+919876543210",
      "date_of_birth": "2005-06-15",
      "gender": "MALE",
      "gender_display": "Male",
      "address": "Flat 402, Sunshine Heights, MG Road, Bengaluru",
      "latitude": "12.971598",
      "longitude": "77.594566",
      "status": "SUBMITTED",
      "status_display": "Submitted",
      "created_at": "2026-09-21T09:15:00Z"
    }
  ]
  ```

#### 4. Filter & Search Applicants (Paginated)
- **Method**: `GET`
- **Path**: `/applicants/?search=Sharma&status=SUBMITTED&page=1`
- **Response (200 OK)**: Paginated results list.

---

## 6. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js v18+ & npm
- PostgreSQL (or automatic fallback to local SQLite)

### 6.1 Backend Setup (Django)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Activate virtual environment
# (On macOS/Linux):
source venv/bin/activate
# (On Windows):
# venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
# Copy .env.example to .env
cp .env.example .env

# 5. Create the database in PostgreSQL (if not already created):
createdb college_admissions
# (Alternatively, to use SQLite for quick zero-config testing, set DATABASE_URL=sqlite:///db.sqlite3 in .env)

# 6. Execute database migrations
python manage.py makemigrations admissions
python manage.py migrate

# 6. Run automated test suite
python manage.py test admissions

# 7. Create an admin superuser
python manage.py createsuperuser

# 8. Start development server
python manage.py runserver 8000
```
- API Base URL: `http://localhost:8000/api/`
- Django Admin Portal: `http://localhost:8000/admin/`

---

### 6.2 Frontend Setup (React + Vite + Sass)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Verify production bundle builds cleanly
npm run build

# 4. Start Vite development server
npm run dev
```
- Frontend Portal: `http://localhost:5173/`

---

## 7. Automated Test Coverage

The test suite in `backend/admissions/tests.py` verifies:
- `test_successful_applicant_registration`: Full submission with image, PDF marksheets, and coordinates.
- `test_duplicate_email_rejected`: Enforces unique email constraints with HTTP 400 response.
- `test_invalid_file_extension_rejected`: Rejects executable `.exe` or disallowed extensions.
- `test_oversized_photo_rejected`: Rejects photos exceeding the 2MB boundary.
- `test_check_email_endpoint`: Verifies real-time asynchronous email availability endpoint.

Run all tests anytime with:
```bash
cd backend
python manage.py test admissions -v 2
```
