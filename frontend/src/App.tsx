import React, { useState } from 'react';
import { Shield, Activity } from 'lucide-react';
import { Medication, Patient, StandardizedDrug, AssessedInteraction } from './types/medication';
import { apiClient } from './utils/api';
import MedicationForm from './components/MedicationForm';
import PatientForm from './components/PatientForm';
import ResultsDisplay from './components/ResultsDisplay';
import ProgressIndicator from './components/ProgressIndicator';
import ErrorDisplay from './components/ErrorDisplay';

type AppStep = 'medications' | 'patient' | 'results';

function App() {
  const [currentStep, setCurrentStep] = useState<AppStep>('medications');
  const [medications, setMedications] = useState<Medication[]>([{ name: '', dosage: '', frequency: '' }]);
  const [patient, setPatient] = useState<Patient>({ age: 0, weight: 0, conditions: [] });
  const [standardizedDrugs, setStandardizedDrugs] = useState<StandardizedDrug[]>([]);
  const [interactions, setInteractions] = useState<AssessedInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStepNumber = (step: AppStep): number => {
    switch (step) {
      case 'medications': return 1;
      case 'patient': return 2;
      case 'results': return 3;
      default: return 1;
    }
  };

  const resetApp = () => {
    setCurrentStep('medications');
    setMedications([{ name: '', dosage: '', frequency: '' }]);
    setPatient({ age: 0, weight: 0, conditions: [] });
    setStandardizedDrugs([]);
    setInteractions([]);
    setError(null);
  };

  const handleMedicationNext = () => {
    setCurrentStep('patient');
  };

  const handlePatientBack = () => {
    setCurrentStep('medications');
  };

  const handlePatientNext = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Standardize medications
      const standardizeResponse = await apiClient.standardizeMedications(medications);
      if (standardizeResponse.error) {
        throw new Error(standardizeResponse.error);
      }

      const standardized = standardizeResponse.data!.standardized;
      setStandardizedDrugs(standardized);

      // Filter out drugs with errors for interaction checking
      const validDrugs = standardized.filter(drug => !drug.error);
      
      if (validDrugs.length < 2) {
        // If less than 2 valid drugs, skip interaction checking
        setInteractions([]);
        setCurrentStep('results');
        return;
      }

      // Step 2: Find interactions
      const interactionsResponse = await apiClient.findInteractions(validDrugs);
      if (interactionsResponse.error) {
        throw new Error(interactionsResponse.error);
      }

      const foundInteractions = interactionsResponse.data?.interactions || [];
      
      if (foundInteractions.length === 0) {
        // No interactions found
        setInteractions([]);
        setCurrentStep('results');
        return;
      }

      // Step 3: Assess severity
      const severityResponse = await apiClient.assessSeverity(foundInteractions, patient);
      if (severityResponse.error) {
        throw new Error(severityResponse.error);
      }

      const assessedInteractions = severityResponse.data?.assessed_interactions || [];
      setInteractions(assessedInteractions);
      setCurrentStep('results');

    } catch (error) {
      console.error('Error processing medications:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Please check if the backend server is running on http://localhost:5000');
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastAction = () => {
    if (currentStep === 'patient') {
      handlePatientNext();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MedCheck Pro</h1>
                <p className="text-sm text-gray-600">Medication Interaction Checker</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              <span>Healthcare Professional Tool</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProgressIndicator currentStep={getStepNumber(currentStep)} totalSteps={3} />

        {error && (
          <ErrorDisplay 
            message={error} 
            onRetry={retryLastAction}
            onReset={resetApp}
          />
        )}

        {!error && currentStep === 'medications' && (
          <MedicationForm
            medications={medications}
            onMedicationsChange={setMedications}
            onNext={handleMedicationNext}
            isLoading={isLoading}
          />
        )}

        {!error && currentStep === 'patient' && (
          <PatientForm
            patient={patient}
            onPatientChange={setPatient}
            onNext={handlePatientNext}
            onBack={handlePatientBack}
            isLoading={isLoading}
          />
        )}

        {!error && currentStep === 'results' && (
          <ResultsDisplay
            standardizedDrugs={standardizedDrugs}
            interactions={interactions}
            onReset={resetApp}
            isLoading={isLoading}
          />
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>⚠️ For healthcare professional use only. This tool provides clinical decision support but should not replace professional medical judgment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;