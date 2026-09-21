import React, { useState } from 'react';
import { MapPin, Navigation, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

export default function StepLocationReview({
  formData,
  files,
  location,
  setLocation,
  declarationAgreed,
  setDeclarationAgreed,
  errors,
}) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState(null);

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({
          latitude: parseFloat(latitude.toFixed(6)),
          longitude: parseFloat(longitude.toFixed(6)),
          accuracy: Math.round(accuracy),
          timestamp: new Date(position.timestamp).toLocaleTimeString(),
        });
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Location access was denied. Please allow location permissions in your browser address bar.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError('Location information is currently unavailable.');
            break;
          case error.TIMEOUT:
            setGeoError('Location request timed out. Please try clicking the button again.');
            break;
          default:
            setGeoError('An unknown error occurred while acquiring location.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return (
    <div className="step-location-review-container">
      <div className="geo-container">
        <div className="geo-header">
          <h4>
            <MapPin size={20} color="#2563eb" /> Browser Geolocation Verification
          </h4>
          <button
            type="button"
            className="btn-primary"
            onClick={captureLocation}
            disabled={geoLoading}
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            <Navigation size={16} />
            {geoLoading ? 'Detecting Location...' : location.latitude ? 'Re-capture Coordinates' : 'Detect My Location'}
          </button>
        </div>

        {geoError && (
          <div className="status-alert warning" style={{ marginBottom: '1rem' }}>
            <AlertTriangle size={18} />
            <span>{geoError}</span>
          </div>
        )}

        <div className="geo-coords-grid">
          <div className="coord-box">
            <span className="coord-label">Latitude</span>
            <div className="coord-value">{location.latitude !== null ? location.latitude : '—'}</div>
          </div>
          <div className="coord-box">
            <span className="coord-label">Longitude</span>
            <div className="coord-value">{location.longitude !== null ? location.longitude : '—'}</div>
          </div>
        </div>

        {location.latitude && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} color="#10b981" />
            <span>Coordinates captured successfully (Accuracy: ~{location.accuracy}m).</span>
            <a
              href={`https://www.google.com/maps?q=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', gap: '2px', marginLeft: 'auto' }}
            >
              Verify on Map <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      <div style={{ margin: '2rem 0 1rem 0' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Application Summary Review</h3>
        <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
          Please carefully check all details below prior to submitting your registration.
        </p>
      </div>

      <div className="review-section">
        <h5 className="review-title">Personal Details</h5>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-key">Full Name</span>
            <div className="review-val">{formData.first_name} {formData.last_name}</div>
          </div>
          <div className="review-item">
            <span className="review-key">Email Address</span>
            <div className="review-val">{formData.email}</div>
          </div>
          <div className="review-item">
            <span className="review-key">Phone Number</span>
            <div className="review-val">{formData.phone}</div>
          </div>
          <div className="review-item">
            <span className="review-key">Date of Birth & Gender</span>
            <div className="review-val">{formData.date_of_birth} ({formData.gender})</div>
          </div>
          <div className="review-item" style={{ gridColumn: '1 / -1' }}>
            <span className="review-key">Residential Address</span>
            <div className="review-val">{formData.address}</div>
          </div>
        </div>
      </div>

      <div className="review-section">
        <h5 className="review-title">Uploaded Media & Credentials</h5>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-key">Passport Photo</span>
            <div className="review-val">{files.photo ? files.photo.name : '—'}</div>
          </div>
          <div className="review-item">
            <span className="review-key">10th Marksheet</span>
            <div className="review-val">{files.marksheet_10th ? files.marksheet_10th.name : '—'}</div>
          </div>
          <div className="review-item">
            <span className="review-key">12th Marksheet</span>
            <div className="review-val">{files.marksheet_12th ? files.marksheet_12th.name : '—'}</div>
          </div>
          <div className="review-item">
            <span className="review-key">Transfer Certificate</span>
            <div className="review-val">{files.transfer_certificate ? files.transfer_certificate.name : 'Not provided'}</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={declarationAgreed}
            onChange={(e) => setDeclarationAgreed(e.target.checked)}
            style={{ marginTop: '0.2rem', width: '16px', height: '16px', accentColor: '#2563eb' }}
          />
          <span>
            I hereby certify that all information provided above is accurate, true, and complete to the best of my knowledge. I understand that submitting fraudulent documents or false details will lead to immediate cancellation of admission.
          </span>
        </label>
        {errors.declaration && <span className="error-message" style={{ marginTop: '0.5rem' }}>{errors.declaration}</span>}
      </div>
    </div>
  );
}
