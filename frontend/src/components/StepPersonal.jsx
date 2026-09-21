import React from 'react';

export default function StepPersonal({ formData, errors, updateField }) {
  return (
    <div className="step-personal-container">
      <div className="form-grid">
        <div className="form-group">
          <label htmlFor="first_name">
            First Name <span className="required-star">*</span>
          </label>
          <input
            id="first_name"
            name="first_name"
            type="text"
            className={`form-control ${errors.first_name ? 'error' : ''}`}
            placeholder="e.g., Jane"
            value={formData.first_name}
            onChange={(e) => updateField('first_name', e.target.value)}
            required
          />
          {errors.first_name && <span className="error-message">{errors.first_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="last_name">
            Last Name <span className="required-star">*</span>
          </label>
          <input
            id="last_name"
            name="last_name"
            type="text"
            className={`form-control ${errors.last_name ? 'error' : ''}`}
            placeholder="e.g., Doe"
            value={formData.last_name}
            onChange={(e) => updateField('last_name', e.target.value)}
            required
          />
          {errors.last_name && <span className="error-message">{errors.last_name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">
            Email Address <span className="required-star">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className={`form-control ${errors.email ? 'error' : ''}`}
            placeholder="e.g., jane.doe@example.com"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            required
          />
          <span className="field-hint">All admission correspondence will be dispatched here.</span>
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="phone">
            Phone Number <span className="required-star">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            className={`form-control ${errors.phone ? 'error' : ''}`}
            placeholder="+919876543210"
            value={formData.phone}
            onChange={(e) => updateField('phone', e.target.value)}
            required
          />
          <span className="field-hint">Include country code (e.g. +91)</span>
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="date_of_birth">
            Date of Birth <span className="required-star">*</span>
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            className={`form-control ${errors.date_of_birth ? 'error' : ''}`}
            value={formData.date_of_birth}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            required
          />
          {errors.date_of_birth && <span className="error-message">{errors.date_of_birth}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gender">
            Gender <span className="required-star">*</span>
          </label>
          <select
            id="gender"
            name="gender"
            className={`form-control ${errors.gender ? 'error' : ''}`}
            value={formData.gender}
            onChange={(e) => updateField('gender', e.target.value)}
            required
          >
            <option value="">Select Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.gender && <span className="error-message">{errors.gender}</span>}
        </div>

        <div className="form-group full-width">
          <label htmlFor="address">
            Residential Address <span className="required-star">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            className={`form-control ${errors.address ? 'error' : ''}`}
            placeholder="House/Apartment number, Street, City, State, PIN code"
            value={formData.address}
            onChange={(e) => updateField('address', e.target.value)}
            required
          />
          {errors.address && <span className="error-message">{errors.address}</span>}
        </div>
      </div>
    </div>
  );
}
