import React from 'react';
import { User, FileText, MapPin, Check } from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Personal Details', icon: User },
  { id: 2, title: 'Photo & Marksheets', icon: FileText },
  { id: 3, title: 'Location & Final Review', icon: MapPin },
];

export default function Stepper({ currentStep }) {
  // Calculate progress width percentage: step 1 -> 0%, step 2 -> 50%, step 3 -> 100%
  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <nav className="stepper-nav" aria-label="Registration Progress">
      <div
        className="step-progress-bar"
        style={{ width: `calc(${progressPercent}% * 0.85)` }}
      />
      {STEPS.map((step) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const IconComponent = step.icon;

        let statusClass = '';
        if (isActive) statusClass = 'active';
        else if (isCompleted) statusClass = 'completed';

        return (
          <div key={step.id} className={`step-item ${statusClass}`}>
            <div className="step-circle" aria-current={isActive ? 'step' : undefined}>
              {isCompleted ? <Check size={20} /> : <IconComponent size={20} />}
            </div>
            <span className="step-label">{step.title}</span>
          </div>
        );
      })}
    </nav>
  );
}
