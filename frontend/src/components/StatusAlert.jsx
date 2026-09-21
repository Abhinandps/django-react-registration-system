import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export default function StatusAlert({ type = 'info', message, onClose }) {
  if (!message) return null;

  const iconMap = {
    error: <AlertCircle size={20} className="alert-icon" />,
    success: <CheckCircle2 size={20} className="alert-icon" />,
    warning: <AlertTriangle size={20} className="alert-icon" />,
    info: <Info size={20} className="alert-icon" />,
  };

  return (
    <div className={`status-alert ${type}`} role="alert">
      {iconMap[type]}
      <div style={{ flex: 1 }}>{message}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'inherit' }}
          aria-label="Dismiss"
        >
          &times;
        </button>
      )}
    </div>
  );
}
