import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  steps 
}) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between overflow-x-auto pb-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center min-w-max">
            <div className="flex items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                  index < currentStep 
                    ? 'text-white shadow-md' 
                    : index === currentStep
                    ? 'text-white shadow-lg ring-2 ring-opacity-30'
                    : ''
                }`}
                style={{
                  backgroundColor: index < currentStep 
                    ? 'var(--color-success)' 
                    : index === currentStep
                    ? 'var(--color-primary)'
                    : 'var(--color-card)',
                  color: index < currentStep || index === currentStep 
                    ? 'white' 
                    : 'var(--color-secondary)',
                  borderColor: index === currentStep ? 'var(--color-primary)' : 'transparent'
                }}
              >
                {index < currentStep ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium transition-colors duration-300"
                  style={{
                    color: index <= currentStep 
                      ? 'var(--color-foreground)' 
                      : 'var(--color-secondary)'
                  }}>
                  {step}
                </div>
                <div className="text-xs transition-colors duration-300"
                  style={{
                    color: index < currentStep 
                      ? 'var(--color-success)' 
                      : index === currentStep
                      ? 'var(--color-primary)'
                      : 'var(--color-text-light)'
                  }}>
                  {index < currentStep 
                    ? 'Completado' 
                    : index === currentStep
                    ? 'En progreso'
                    : 'Pendiente'
                  }
                </div>
              </div>
            </div>
            {index < totalSteps - 1 && (
              <div className="flex-1 mx-4 min-w-[2rem]">
                <div className="h-0.5 rounded transition-colors duration-300"
                  style={{
                    backgroundColor: index < currentStep 
                      ? 'var(--color-success)' 
                      : 'var(--color-border)'
                  }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  nextLabel?: string;
  previousLabel?: string;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  canGoNext = true,
  canGoPrevious = true,
  nextLabel = 'Siguiente',
  previousLabel = 'Anterior'
}) => {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t" style={{borderColor: 'var(--color-border)'}}>
      <div>
        {currentStep > 0 && onPrevious && (
          <button
            onClick={onPrevious}
            disabled={!canGoPrevious}
            className="ios-btn ios-btn-secondary flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {previousLabel}
          </button>
        )}
      </div>
      
      <div className="text-sm" style={{color: 'var(--color-secondary)'}}>
        Paso {currentStep + 1} de {totalSteps}
      </div>
      
      <div>
        {currentStep < totalSteps - 1 && onNext && (
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="ios-btn ios-btn-primary flex items-center"
          >
            {nextLabel}
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};