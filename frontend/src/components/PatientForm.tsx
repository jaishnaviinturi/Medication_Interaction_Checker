import React, { useState } from 'react';
import { User, Plus, X } from 'lucide-react';
import { Patient } from '../types/medication';

interface PatientFormProps {
  patient: Patient;
  onPatientChange: (patient: Patient) => void;
  onNext: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({
  patient,
  onPatientChange,
  onNext,
  onBack,
  isLoading = false
}) => {
  const [newCondition, setNewCondition] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const addCondition = () => {
    if (newCondition.trim() && !patient.conditions.includes(newCondition.trim())) {
      onPatientChange({
        ...patient,
        conditions: [...patient.conditions, newCondition.trim()]
      });
      setNewCondition('');
    }
  };

  const removeCondition = (condition: string) => {
    onPatientChange({
      ...patient,
      conditions: patient.conditions.filter(c => c !== condition)
    });
  };

  const updatePatient = (field: keyof Patient, value: any) => {
    onPatientChange({ ...patient, [field]: value });
    
    // Clear error when field is updated
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateAndSubmit = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!patient.age || patient.age < 1 || patient.age > 150) {
      newErrors.age = 'Please enter a valid age between 1 and 150';
    }
    
    if (!patient.weight || patient.weight < 1 || patient.weight > 1000) {
      newErrors.weight = 'Please enter a valid weight between 1 and 1000 kg';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onNext();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCondition();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-teal-100 rounded-lg">
          <User className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Patient Information</h2>
          <p className="text-gray-600">Enter patient details for accurate interaction assessment</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age (years)
            </label>
            <input
              type="number"
              value={patient.age || ''}
              onChange={(e) => updatePatient('age', parseInt(e.target.value) || 0)}
              placeholder="e.g., 45"
              min="1"
              max="150"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={isLoading}
            />
            {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (kg)
            </label>
            <input
              type="number"
              value={patient.weight || ''}
              onChange={(e) => updatePatient('weight', parseFloat(e.target.value) || 0)}
              placeholder="e.g., 70"
              min="1"
              max="1000"
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={isLoading}
            />
            {errors.weight && <p className="mt-1 text-sm text-red-600">{errors.weight}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Medical Conditions
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Hypertension, Diabetes"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={addCondition}
              disabled={!newCondition.trim() || isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          
          {patient.conditions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {patient.conditions.map((condition, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm"
                >
                  {condition}
                  <button
                    onClick={() => removeCondition(condition)}
                    className="ml-1 text-teal-600 hover:text-teal-800"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
          
          {patient.conditions.length === 0 && (
            <p className="text-sm text-gray-500 italic">No medical conditions added yet</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={onBack}
          disabled={isLoading}
          className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Back
        </button>
        
        <button
          onClick={validateAndSubmit}
          disabled={isLoading}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Check Interactions'}
        </button>
      </div>
    </div>
  );
};

export default PatientForm;