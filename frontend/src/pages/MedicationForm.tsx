import React, { useState } from 'react';
import { Plus, Minus, AlertTriangle, CheckCircle, Clock, User } from 'lucide-react';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

interface Patient {
  age: number;
  weight: number;
  conditions: string[];
}

interface ApiResponse {
  standardized: any[];
  interactions: any[];
  assessed_interactions: any[];
  drug_info: Record<string, string>;
  food_interactions: Record<string, string>;
}

export const MedicationForm: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '' }
  ]);
  const [patient, setPatient] = useState<Patient>({
    age: 0,
    weight: 0,
    conditions: []
  });
  const [newCondition, setNewCondition] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '' }]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = medications.map((med, i) => 
      i === index ? { ...med, [field]: value } : med
    );
    setMedications(updated);
  };

  const addCondition = () => {
    if (newCondition.trim() && !patient.conditions.includes(newCondition.trim())) {
      setPatient({
        ...patient,
        conditions: [...patient.conditions, newCondition.trim()]
      });
      setNewCondition('');
    }
  };

  const removeCondition = (condition: string) => {
    setPatient({
      ...patient,
      conditions: patient.conditions.filter(c => c !== condition)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medications: medications.filter(med => med.name.trim()),
          patient
        })
      });

      if (!response.ok) {
        throw new Error('Failed to check medications');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'major': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="py-24 bg-gray-50 dark:bg-gray-800 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Medication Interaction Checker
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Enter your medications and patient information for comprehensive safety analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Form */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Patient Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      value={patient.age || ''}
                      onChange={(e) => setPatient({...patient, age: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Enter age"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={patient.weight || ''}
                      onChange={(e) => setPatient({...patient, weight: parseFloat(e.target.value) || 0})}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Enter weight"
                      required
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Medical Conditions
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                      placeholder="Add medical condition"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                    />
                    <button
                      type="button"
                      onClick={addCondition}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {patient.conditions.map((condition, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {condition}
                        <button
                          type="button"
                          onClick={() => removeCondition(condition)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medications */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Medications
                </h3>
                <div className="space-y-4">
                  {medications.map((medication, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Medication Name
                          </label>
                          <input
                            type="text"
                            value={medication.name}
                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                            placeholder="e.g., Aspirin"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dosage
                          </label>
                          <input
                            type="text"
                            value={medication.dosage}
                            onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                            placeholder="e.g., 500mg"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Frequency
                          </label>
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={medication.frequency}
                              onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
                              placeholder="e.g., Twice daily"
                              required
                            />
                            {medications.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMedication(index)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              >
                                <Minus className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addMedication}
                  className="mt-4 flex items-center space-x-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Check Interactions</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Analysis Results
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {results ? (
              <div className="space-y-6">
                {/* Interactions */}
                {results.assessed_interactions && results.assessed_interactions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Drug Interactions Found
                    </h4>
                    <div className="space-y-3">
                      {results.assessed_interactions.map((interaction, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border ${getSeverityColor(interaction.severity)}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium">
                              {interaction.drug1} + {interaction.drug2}
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full">
                              {interaction.severity?.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm mb-2">{interaction.interaction}</p>
                          {interaction.suggestions && interaction.suggestions.length > 0 && (
                            <div className="text-xs">
                              <strong>Suggestions:</strong> {interaction.suggestions.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Interactions */}
                {results.assessed_interactions && results.assessed_interactions.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <p className="text-green-700">No significant interactions found</p>
                    </div>
                  </div>
                )}

                {/* Standardized Medications */}
                {results.standardized && results.standardized.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">
                      Standardized Medications
                    </h4>
                    <div className="space-y-2">
                      {results.standardized.map((med, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {med.generic_name || med.original?.name}
                          </div>
                          {med.rxnorm_id && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              RxNorm ID: {med.rxnorm_id}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter medications and patient information to see analysis results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};