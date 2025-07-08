import React, { useState } from 'react';
import { Plus, Trash2, Pill } from 'lucide-react';
import { Medication } from '../types/medication';

interface MedicationFormProps {
  medications: Medication[];
  onMedicationsChange: (medications: Medication[]) => void;
  onNext: () => void;
  isLoading?: boolean;
}

const MedicationForm: React.FC<MedicationFormProps> = ({
  medications,
  onMedicationsChange,
  onNext,
  isLoading = false
}) => {
  const [errors, setErrors] = useState<{ [key: number]: string }>({});

  const addMedication = () => {
    onMedicationsChange([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const removeMedication = (index: number) => {
    const newMedications = medications.filter((_, i) => i !== index);
    onMedicationsChange(newMedications);
    
    // Clear error for removed medication
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const newMedications = [...medications];
    newMedications[index] = { ...newMedications[index], [field]: value };
    onMedicationsChange(newMedications);
    
    // Clear error when field is updated
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validateAndSubmit = () => {
    const newErrors: { [key: number]: string } = {};
    
    medications.forEach((med, index) => {
      if (!med.name.trim() || !med.dosage.trim() || !med.frequency.trim()) {
        newErrors[index] = 'All fields are required';
      }
    });

    if (medications.length === 0) {
      alert('Please add at least one medication');
      return;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onNext();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-100 rounded-lg">
          <Pill className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Current Medications</h2>
          <p className="text-gray-600">Enter all medications the patient is currently taking</p>
        </div>
      </div>

      <div className="space-y-4">
        {medications.map((medication, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Medication {index + 1}</h3>
              {medications.length > 1 && (
                <button
                  onClick={() => removeMedication(index)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Name
                </label>
                <input
                  type="text"
                  value={medication.name}
                  onChange={(e) => updateMedication(index, 'name', e.target.value)}
                  placeholder="e.g., Atorvastatin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dosage
                </label>
                <input
                  type="text"
                  value={medication.dosage}
                  onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                  placeholder="e.g., 20mg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency
                </label>
                <input
                  type="text"
                  value={medication.frequency}
                  onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                  placeholder="e.g., Once daily"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            {errors[index] && (
              <p className="mt-2 text-sm text-red-600">{errors[index]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={addMedication}
          className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          disabled={isLoading}
        >
          <Plus className="h-5 w-5" />
          Add Medication
        </button>
        
        <button
          onClick={validateAndSubmit}
          disabled={isLoading || medications.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Next Step'}
        </button>
      </div>
    </div>
  );
};

export default MedicationForm;