import React, { useState, useRef } from 'react';
import { UploadCloud, File, FileCheck, X, Image as ImageIcon } from 'lucide-react';

export default function FileUploadPreview({
  label,
  name,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 5,
  isImage = false,
  required = false,
  file,
  onChange,
  onRemove,
  error,
  hint,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isPreviewableImage = file && (isImage || file.type.startsWith('image/'));

  return (
    <div className="form-group full-width">
      <label htmlFor={name}>
        {label} {required && <span className="required-star">*</span>}
      </label>

      <div
        className={`upload-dropzone ${isDragOver ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          accept={accept}
          className="file-input-hidden"
          onChange={handleInputChange}
          disabled={!!file}
        />

        {!file ? (
          <div className="upload-prompt">
            <UploadCloud size={36} className="upload-icon" />
            <div className="prompt-text">
              Drag & drop your file here, or <span>browse</span>
            </div>
            <div className="format-hint">
              {hint || `Accepted formats: ${accept} (Max ${maxSizeMB}MB)`}
            </div>
          </div>
        ) : (
          <div className="file-preview">
            <div className="preview-left">
              {isPreviewableImage ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt="Uploaded preview"
                  className="thumbnail-img"
                  onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                />
              ) : (
                <div className="doc-icon-box">
                  <FileTextIcon file={file} />
                </div>
              )}
              <div className="file-meta">
                <div className="file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-size">{formatFileSize(file.size)}</div>
              </div>
            </div>

            <button
              type="button"
              className="btn-remove-file"
              onClick={(e) => {
                e.stopPropagation();
                if (inputRef.current) inputRef.current.value = '';
                onRemove();
              }}
              title="Remove file"
              aria-label="Remove uploaded file"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

function FileTextIcon({ file }) {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return <FileCheck size={26} color="#dc2626" />;
  }
  return <File size={26} color="#2563eb" />;
}
