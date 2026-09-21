import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, MapPin, ExternalLink, Calendar, Mail, Phone, UserCheck, AlertCircle } from 'lucide-react';
import { AdmissionsAPI } from '../api/axiosClient';

export default function ApplicantList({ onNavigateToRegister }) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchApplicants = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await AdmissionsAPI.getAllApplicants();
      setApplicants(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch applicants list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, []);

  const filteredApplicants = applicants.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.application_number || '').toLowerCase().includes(q) ||
      (item.first_name || '').toLowerCase().includes(q) ||
      (item.last_name || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.phone || '').toLowerCase().includes(q) ||
      (item.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="wizard-card applicant-list-card">
      {/* Header & Controls */}
      <div className="list-toolbar">
        <div className="toolbar-header">
          <div>
            <h2>Submitted Applications Directory</h2>
            <p>Public registry of all college admission applicants and coordinates.</p>
          </div>
          <div className="toolbar-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={fetchApplicants}
              disabled={loading}
              title="Refresh applicants list"
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
              Refresh
            </button>
            {onNavigateToRegister && (
              <button
                type="button"
                className="btn-primary"
                onClick={onNavigateToRegister}
              >
                + New Registration
              </button>
            )}
          </div>
        </div>

        <div className="search-bar-row">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, email, phone, or application ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="applicant-count-pill">
            {filteredApplicants.length} {filteredApplicants.length === 1 ? 'Applicant' : 'Applicants'}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="status-alert error" style={{ margin: '1rem 0' }}>
          <AlertCircle size={20} />
          <div style={{ flex: 1 }}>{error}</div>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
            onClick={fetchApplicants}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="list-loading-state">
          <RefreshCw size={32} className="spinning" color="#2563eb" />
          <p>Loading application directory...</p>
        </div>
      ) : filteredApplicants.length === 0 ? (
        /* Empty State */
        <div className="list-empty-state">
          <UserCheck size={48} color="#94a3b8" />
          <h3>No Applications Found</h3>
          <p>
            {searchQuery
              ? `No applicants match your search "${searchQuery}".`
              : 'No applicants have registered yet.'}
          </p>
          {onNavigateToRegister && !searchQuery && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1rem' }}
              onClick={onNavigateToRegister}
            >
              Submit First Application
            </button>
          )}
        </div>
      ) : (
        /* Applications Table / Cards */
        <div className="table-responsive-wrapper">
          <table className="applicants-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Applicant Name</th>
                <th>Contact Info</th>
                <th>DOB & Gender</th>
                <th>Location Coordinates</th>
                <th>Status</th>
                <th>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplicants.map((applicant) => {
                const hasLocation = applicant.latitude !== null && applicant.longitude !== null;
                const formattedDate = applicant.created_at
                  ? new Date(applicant.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : '—';

                return (
                  <tr key={applicant.id}>
                    <td>
                      <span className="app-id-tag">{applicant.application_number}</span>
                    </td>
                    <td>
                      <div className="applicant-primary-name">
                        {applicant.first_name} {applicant.last_name}
                      </div>
                      <div className="applicant-address-snippet" title={applicant.address}>
                        {applicant.address}
                      </div>
                    </td>
                    <td>
                      <div className="contact-cell">
                        <span className="contact-line">
                          <Mail size={13} /> {applicant.email}
                        </span>
                        <span className="contact-line">
                          <Phone size={13} /> {applicant.phone}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="dob-cell">
                        <span className="contact-line">
                          <Calendar size={13} /> {applicant.date_of_birth}
                        </span>
                        <span className="gender-badge">{applicant.gender_display || applicant.gender}</span>
                      </div>
                    </td>
                    <td>
                      {hasLocation ? (
                        <a
                          href={`https://www.google.com/maps?q=${applicant.latitude},${applicant.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="coords-pill"
                          title="View on Google Maps"
                        >
                          <MapPin size={13} />
                          <span>
                            {applicant.latitude}, {applicant.longitude}
                          </span>
                          <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="no-coords">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill status-${(applicant.status || '').toLowerCase()}`}>
                        {applicant.status_display || applicant.status}
                      </span>
                    </td>
                    <td className="timestamp-cell">
                      {formattedDate}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
