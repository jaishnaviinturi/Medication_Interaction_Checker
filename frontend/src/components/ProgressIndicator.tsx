import React from 'react';
import { Check } from 'lucide-react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  const steps = [
    { number: 1, title: 'Medications', description: 'Enter current medications' },
    { number: 2, title: 'Patient Info', description: 'Patient details' },
    { number: 3, title: 'Results', description: 'Interaction analysis' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                step.number < currentStep
                  ? 'bg-green-500 text-white'
                  : step.number === currentStep
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.number < currentStep ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.number
                )}
              </div>
              <div className="text-center mt-2">
                <div className={`text-sm font-medium ${
                  step.number <= currentStep ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </div>
                <div className="text-xs text-gray-500">{step.description}</div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                step.number < currentStep ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;