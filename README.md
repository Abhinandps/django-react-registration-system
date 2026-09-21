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

## 2. System Design Architecture (As-Built)

The platform is engineered as a decoupled, full-stack application composed of an interactive React Single-Page Application (SPA) on the frontend communicating via REST APIs with a Django REST Framework (DRF) backend backed by a PostgreSQL database.

### 2.1 As-Built System Architecture Diagram

```mermaid
graph TB
    subgraph ClientTier ["Client Tier (Browser)"]
        ApplicantUser["Applicant (Mobile / Desktop)"]
        AdmissionsStaff["Admissions Officer / Admin"]
    end

    subgraph FrontendApp ["Frontend Application Tier (localhost:5173)"]
        ViteServer["Vite Dev Server (React 19 + Sass)"]
        FormWizard["3-Step Admission Wizard Component\n(Personal Details -> Docs/Photo -> Location/Review)"]
        DirectoryView["Public Applications Directory Component\n(Search, Coordinates, Status Filters)"]
        AxiosClient["Axios HTTP Client (axiosClient.js)\nBase URL: http://localhost:8000/api"]
        GeoAPI["HTML5 navigator.geolocation API\n(Browser GPS Coordinates)"]
    end

    subgraph BackendApp ["Backend Application Tier (localhost:8000)"]
        DjangoServer["Django 5.2 Application Server"]
        CORSMiddleware["django-cors-headers\n(Whitelist: localhost:5173)"]
        DRFRoutes["Django REST Framework URL Router\n/api/applicants/ & /api/documents/"]
        
        subgraph Endpoints ["REST API Endpoints"]
            SubmitEndpoint["POST /api/applicants/\n(MultiPartParser, File Validation, Atomic Commit)"]
            ListEndpoint["GET /api/applicants/all/\n(Unpaginated Lightweight Text + Geolocation)"]
            CheckEmailEndpoint["GET /api/applicants/check-email/\n(Real-time Email Availability Check)"]
        end

        SecurityPipeline["Strict File Validation Pipeline\n(Extension Whitelist, 2MB/5MB Limits, MIME Magic Bytes)"]
        DjangoAdmin["Django Admin Console (/admin/)\n(Thumbnails, Inline Docs, Map Links)"]
    end

    subgraph PersistenceTier ["Persistence & Storage Tier"]
        PostgresDB[(PostgreSQL Database\ncollege_admissions\npsycopg3 Driver, ACID, UUID PKs)]
        LocalMedia["Local Media Storage (backend/media/)\napplicants/photos/ & applicants/documents/"]
    end

    ApplicantUser -->|Loads UI| ViteServer
    ViteServer --> FormWizard
    ViteServer --> DirectoryView
    FormWizard --> GeoAPI
    FormWizard -->|Dispatches Form & Files| AxiosClient
    DirectoryView -->|Fetches All Applications| AxiosClient

    AxiosClient -->|CORS Request| CORSMiddleware
    CORSMiddleware --> DRFRoutes
    DRFRoutes --> SubmitEndpoint
    DRFRoutes --> ListEndpoint
    DRFRoutes --> CheckEmailEndpoint

    SubmitEndpoint --> SecurityPipeline
    SecurityPipeline -->|Write Files| LocalMedia
    SubmitEndpoint -->|transaction.atomic INSERT| PostgresDB
    ListEndpoint -->|SELECT (ordered by -created_at)| PostgresDB
    CheckEmailEndpoint -->|SELECT EXISTS| PostgresDB

    AdmissionsStaff -->|Session Login| DjangoAdmin
    DjangoAdmin --> PostgresDB
    DjangoAdmin --> LocalMedia
```

---

### 2.2 End-to-End System Flows (Sequence Diagrams)

#### Flow A: 3-Step Public Registration Flow
```mermaid
sequenceDiagram
    autonumber
    actor Student as Applicant (Browser)
    participant UI as React Frontend (localhost:5173)
    participant API as Django Backend (localhost:8000)
    participant Validator as Strict File Validator
    participant Media as Local Media Storage
    participant DB as PostgreSQL Database

    Student->>UI: Fills Step 1 (Personal Details)
    UI->>API: GET /api/applicants/check-email/?email=...
    API->>DB: Check email existence
    DB-->>API: Not found
    API-->>UI: 200 OK ({ available: true })

    Student->>UI: Fills Step 2 (Selects Photo, 10th & 12th Marksheets)
    UI->>UI: Instant client preview (image thumbnail / PDF icon, size validation)

    Student->>UI: Step 3: Clicks "Detect My Location"
    UI->>Student: Requests navigator.geolocation.getCurrentPosition()
    Student-->>UI: Permits GPS access; Lat/Lng captured
    
    Student->>UI: Checks declaration & clicks "Submit Application"
    UI->>API: POST /api/applicants/ (multipart/form-data)
    
    activate API
    API->>Validator: Validate file sizes (photo <= 2MB, docs <= 5MB)
    API->>Validator: Check extensions (.jpg, .png, .pdf)
    API->>Validator: Inspect MIME magic headers (%PDF, \x89PNG, \xff\xd8\xff)
    API->>Validator: Verify coordinate ranges (-90 to +90, -180 to +180)

    alt Validation Failure
        Validator-->>API: ValidationError
        API-->>UI: 400 Bad Request (Formatted field errors)
        UI-->>Student: Displays actionable error alerts
    else Validation Succeeded
        API->>DB: Begin transaction.atomic()
        API->>Media: Write photo to media/applicants/photos/<uuid>/photo.ext
        API->>DB: INSERT INTO admissions_applicant (...)
        API->>Media: Write 10th & 12th marksheets to media/applicants/documents/
        API->>DB: INSERT INTO admissions_applicantdocument (...)
        API->>DB: Commit transaction
        API-->>UI: 201 Created (application_number: "ADM-XXXXXX", full data)
        deactivate API
        UI-->>Student: Renders Success Screen with Application Reference ID & Print Option
    end
```

#### Flow B: Public Applications Directory Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Any Visitor / Applicant
    participant UI as React Frontend (All Applications Tab)
    participant API as Django Backend (/api/applicants/all/)
    participant DB as PostgreSQL Database

    User->>UI: Navigates to "All Applications" Tab
    UI->>API: GET /api/applicants/all/
    activate API
    API->>DB: SELECT text fields & coordinates FROM admissions_applicant ORDER BY created_at DESC
    DB-->>API: Result set (applicants records)
    API->>API: Serialize via ApplicantListSerializer (excludes file payloads)
    API-->>UI: 200 OK (JSON array with names, contacts, coordinates, status)
    deactivate API
    UI-->>User: Renders searchable table/cards with Google Maps coordinate links
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

## 4. Production Scalability & Cloud Deployment Roadmap (Future Target Architecture)

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
