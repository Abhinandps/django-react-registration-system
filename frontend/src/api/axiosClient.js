import axios from 'axios';

/**
 * Configured Axios instance for the Admissions API.
 * Automatically targets Vite proxy or backend server port.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout for large file uploads
  headers: {
    'Accept': 'application/json',
  },
});

/**
 * Global response interceptor for parsing and normalizing DRF error payloads.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let normalizedError = {
      message: 'An unexpected error occurred. Please try again.',
      fieldErrors: {},
    };

    if (error.response) {
      const { status, data } = error.response;

      if (status === 400 && typeof data === 'object') {
        normalizedError.message = 'Please correct the highlighted errors before submitting.';
        // Flatten DRF field errors: { email: ["Invalid email"], ... }
        const errors = {};
        for (const [key, value] of Object.entries(data)) {
          errors[key] = Array.isArray(value) ? value.join(' ') : String(value);
        }
        normalizedError.fieldErrors = errors;
      } else if (status === 413) {
        normalizedError.message = 'Uploaded files exceed server payload limit (Max 10MB total).';
      } else if (status >= 500) {
        normalizedError.message = 'Server encountered an internal error. Please contact the admissions helpdesk.';
      } else if (data?.detail) {
        normalizedError.message = data.detail;
      }
    } else if (error.request) {
      normalizedError.message = 'Unable to connect to admissions backend server. Ensure Django is running on http://localhost:8000.';
    }

    return Promise.reject(normalizedError);
  }
);

export const AdmissionsAPI = {
  /**
   * Submit new applicant registration with multipart/form-data.
   * @param {FormData} formData
   */
  submitApplication: (formData) => {
    return apiClient.post('/applicants/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  /**
   * Check if email is already taken.
   * @param {string} email
   */
  checkEmailAvailability: (email) => {
    return apiClient.get('/applicants/check-email/', {
      params: { email },
    });
  },

  /**
   * Fetch all registered applicants without pagination (text & geolocation only).
   */
  getAllApplicants: () => {
    return apiClient.get('/applicants/all/');
  },
};
