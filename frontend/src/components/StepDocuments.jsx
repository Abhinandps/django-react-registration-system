import React from 'react';
import FileUploadPreview from './FileUploadPreview';

export default function StepDocuments({ files, errors, updateFile, removeFile }) {
  return (
    <div className="step-documents-container">
      <div className="form-grid">
        <FileUploadPreview
          label="Recent Passport Size Photograph"
          name="photo"
          accept=".jpg,.jpeg,.png,.webp"
          maxSizeMB={2}
          isImage={true}
          required={true}
          file={files.photo}
          onChange={(f) => updateFile('photo', f)}
          onRemove={() => removeFile('photo')}
          error={errors.photo}
          hint="Clear portrait photo on plain background (Max 2MB, .jpg, .png, .webp)"
        />

        <FileUploadPreview
          label="10th Standard Marksheet / Secondary School Certificate"
          name="marksheet_10th"
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeMB={5}
          isImage={false}
          required={true}
          file={files.marksheet_10th}
          onChange={(f) => updateFile('marksheet_10th', f)}
          onRemove={() => removeFile('marksheet_10th')}
          error={errors.marksheet_10th}
          hint="Original or attested copy (Max 5MB, PDF, JPG, PNG)"
        />

        <FileUploadPreview
          label="12th Standard / Higher Secondary Marksheet"
          name="marksheet_12th"
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeMB={5}
          isImage={false}
          required={true}
          file={files.marksheet_12th}
          onChange={(f) => updateFile('marksheet_12th', f)}
          onRemove={() => removeFile('marksheet_12th')}
          error={errors.marksheet_12th}
          hint="Official grade sheet with visible seal/signature (Max 5MB, PDF, JPG, PNG)"
        />

        <FileUploadPreview
          label="Transfer Certificate (TC) (Optional)"
          name="transfer_certificate"
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeMB={5}
          isImage={false}
          required={false}
          file={files.transfer_certificate}
          onChange={(f) => updateFile('transfer_certificate', f)}
          onRemove={() => removeFile('transfer_certificate')}
          error={errors.transfer_certificate}
          hint="School leaving certificate if already issued (Max 5MB, PDF, JPG, PNG)"
        />
      </div>
    </div>
  );
}
