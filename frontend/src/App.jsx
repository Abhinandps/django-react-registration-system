import React, { useState } from 'react';
import { GraduationCap, ArrowRight, ArrowLeft, Send, CheckCircle, RefreshCw, Printer, Users, FilePlus } from 'lucide-react';
import Stepper from './components/Stepper';
import StepPersonal from './components/StepPersonal';
import StepDocuments from './components/StepDocuments';
import StepLocationReview from './components/StepLocationReview';
import ApplicantList from './components/ApplicantList';
import StatusAlert from './components/StatusAlert';
import { AdmissionsAPI } from './api/axiosClient';

const INITIAL_FORM_DATA = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: '',
  address: '',
};

const INITIAL_FILES = {
  photo: null,
  marksheet_10th: null,
  marksheet_12th: null,
  transfer_certificate: null,
};

const INITIAL_LOCATION = {
  latitude: null,
  longitude: null,
  accuracy: null,
  timestamp: null,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('form');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [files, setFiles] = useState(INITIAL_FILES);
  const [location, setLocation] = useState(INITIAL_LOCATION);
  const [declarationAgreed, setDeclarationAgreed] = useState(false);

  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateFile = (field, file) => {
    setFiles((prev) => ({ ...prev, [field]: file }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const removeFile = (field) => {
    setFiles((prev) => ({ ...prev, [field]: null }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!formData.first_name.trim()) errs.first_name = 'First name is required.';
    if (!formData.last_name.trim()) errs.last_name = 'Last name is required.';

    if (!formData.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\+?1?\d{9,15}$/.test(formData.phone.replace(/\s+/g, ''))) {
      errs.phone = 'Please enter a valid phone number (e.g., +919876543210).';
    }

    if (!formData.date_of_birth) errs.date_of_birth = 'Date of birth is required.';
    if (!formData.gender) errs.gender = 'Please select a gender.';
    if (!formData.address.trim()) errs.address = 'Residential address is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!files.photo) {
      errs.photo = 'Passport photograph is required.';
    } else if (files.photo.size > 2 * 1024 * 1024) {
      errs.photo = 'Passport photo must be under 2MB.';
    }

    if (!files.marksheet_10th) {
      errs.marksheet_10th = '10th Standard Marksheet is required.';
    } else if (files.marksheet_10th.size > 5 * 1024 * 1024) {
      errs.marksheet_10th = '10th Marksheet file size must be under 5MB.';
    }

    if (!files.marksheet_12th) {
      errs.marksheet_12th = '12th Standard Marksheet is required.';
    } else if (files.marksheet_12th.size > 5 * 1024 * 1024) {
      errs.marksheet_12th = '12th Marksheet file size must be under 5MB.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs = {};
    if (!declarationAgreed) {
      errs.declaration = 'You must confirm the truthfulness of your submission.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    setGlobalError(null);
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleBack = () => {
    setGlobalError(null);
    setErrors({});
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError(null);

    if (!validateStep3()) return;

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        payload.append(key, formData[key].trim());
      });

      if (files.photo) payload.append('photo', files.photo);
      if (files.marksheet_10th) payload.append('marksheet_10th', files.marksheet_10th);
      if (files.marksheet_12th) payload.append('marksheet_12th', files.marksheet_12th);
      if (files.transfer_certificate) payload.append('transfer_certificate', files.transfer_certificate);

      if (location.latitude !== null && location.longitude !== null) {
        payload.append('latitude', location.latitude);
        payload.append('longitude', location.longitude);
      }

      const response = await AdmissionsAPI.submitApplication(payload);
      setSubmissionSuccess(response.data);
    } catch (err) {
      if (err.fieldErrors) {
        setErrors(err.fieldErrors);
        const step1Fields = ['first_name', 'last_name', 'email', 'phone', 'date_of_birth', 'gender', 'address'];
        const step2Fields = ['photo', 'marksheet_10th', 'marksheet_12th', 'transfer_certificate'];

        const hasStep1Error = Object.keys(err.fieldErrors).some((k) => step1Fields.includes(k));
        const hasStep2Error = Object.keys(err.fieldErrors).some((k) => step2Fields.includes(k));

        if (hasStep1Error) setCurrentStep(1);
        else if (hasStep2Error) setCurrentStep(2);
      }
      setGlobalError(err.message || 'Failed to submit application. Please check the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setFiles(INITIAL_FILES);
    setLocation(INITIAL_LOCATION);
    setDeclarationAgreed(false);
    setSubmissionSuccess(null);
    setErrors({});
    setGlobalError(null);
    setCurrentStep(1);
  };

  return (
    <div className="app-container">
      <header className="portal-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">
              <GraduationCap size={24} />
            </div>
            <div className="brand-text">
              <h1>Apex Institute of Technology</h1>
              <p>Undergraduate & Postgraduate Online Admission Portal</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <nav className="header-nav-tabs" aria-label="Portal View Navigation">
              <button
                type="button"
                className={`nav-tab-btn ${activeTab === 'form' ? 'active' : ''}`}
                onClick={() => setActiveTab('form')}
              >
                <FilePlus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                New Application
              </button>
              <button
                type="button"
                className={`nav-tab-btn ${activeTab === 'directory' ? 'active' : ''}`}
                onClick={() => setActiveTab('directory')}
              >
                <Users size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                All Applications
              </button>
            </nav>
            <div className="badge-session">Academic Session 2026–2027</div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'directory' ? (
          <ApplicantList onNavigateToRegister={() => { resetForm(); setActiveTab('form'); }} />
        ) : submissionSuccess ? (
          <div className="wizard-card success-card">
            <div className="success-icon-wrapper">
              <CheckCircle size={44} />
            </div>
            <h2>Registration Successful!</h2>
            <p>Your application has been registered in the admissions repository.</p>

            <div>
              <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Application Reference ID:</span>
              <br />
              <div className="application-ref-badge">{submissionSuccess.application_number}</div>
            </div>

            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              A confirmation email has been dispatched to <strong>{formData.email}</strong>. Please preserve your application reference ID for all future inquiries and counseling rounds.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} /> Print Confirmation
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setActiveTab('directory')}
              >
                <Users size={16} /> View All Applications
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={resetForm}
              >
                <RefreshCw size={16} /> Register Another Applicant
              </button>
            </div>
          </div>
        ) : (
          <div className="wizard-card">
            <div className="card-header">
              <h2>Online Admission Registration</h2>
              <p>Complete all three steps to submit your official application dossier.</p>
            </div>

            <Stepper currentStep={currentStep} />

            <StatusAlert
              type="error"
              message={globalError}
              onClose={() => setGlobalError(null)}
            />

            <form onSubmit={handleSubmit} noValidate>
              {currentStep === 1 && (
                <StepPersonal
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                />
              )}

              {currentStep === 2 && (
                <StepDocuments
                  files={files}
                  errors={errors}
                  updateFile={updateFile}
                  removeFile={removeFile}
                />
              )}

              {currentStep === 3 && (
                <StepLocationReview
                  formData={formData}
                  files={files}
                  location={location}
                  setLocation={setLocation}
                  declarationAgreed={declarationAgreed}
                  setDeclarationAgreed={setDeclarationAgreed}
                  errors={errors}
                />
              )}

              <div className="form-actions">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>
                  )}
                </div>

                <div>
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleNext}
                    >
                      Continue to Step {currentStep + 1} <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="btn-accent"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>Submitting Application...</>
                      ) : (
                        <>
                          Submit Application <Send size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="portal-footer">
        <p>&copy; 2026 Apex Institute of Technology Admissions Board. All rights reserved.</p>
        <p style={{ marginTop: '4px' }}>Secure 256-bit SSL encrypted admission submissions.</p>
      </footer>
    </div>
  );
}
