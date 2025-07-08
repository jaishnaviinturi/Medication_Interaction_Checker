import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, XCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { AssessedInteraction, StandardizedDrug } from '../types/medication';

interface ResultsDisplayProps {
  standardizedDrugs: StandardizedDrug[];
  interactions: AssessedInteraction[];
  onReset: () => void;
  isLoading?: boolean;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  standardizedDrugs,
  interactions,
  onReset,
  isLoading = false
}) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'major':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'moderate':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'minor':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'major':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'moderate':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'minor':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-green-50 border-green-200 text-green-800';
    }
  };

  const validDrugs = standardizedDrugs.filter(drug => !drug.error);
  const errorDrugs = standardizedDrugs.filter(drug => drug.error);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-lg text-gray-600">Analyzing interactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standardized Medications Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Standardized Medications</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {validDrugs.map((drug, index) => (
            <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-800">{drug.generic_name}</span>
              </div>
              <p className="text-sm text-gray-600">
                {drug.dosage} • {drug.frequency}
              </p>
              {drug.rxnorm_id && (
                <p className="text-xs text-gray-500 mt-1">RxNorm ID: {drug.rxnorm_id}</p>
              )}
            </div>
          ))}
        </div>
        
        {errorDrugs.length > 0 && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Unrecognized Medications</h3>
            <div className="space-y-2">
              {errorDrugs.map((drug, index) => (
                <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="font-semibold text-red-800">{drug.original?.name || 'Unknown medication'}</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{drug.error}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interaction Results */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Interaction Analysis</h2>
          <span className="text-sm text-gray-500">
            {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {interactions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Interactions Found</h3>
            <p className="text-gray-600">
              No significant drug interactions detected between the current medications.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {interactions.map((interaction, index) => (
              <div key={index} className={`border-2 rounded-lg p-6 ${getSeverityColor(interaction.severity)}`}>
                <div className="flex items-start gap-3">
                  {getSeverityIcon(interaction.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg">
                        {interaction.drug1} + {interaction.drug2}
                      </h3>
                      <span className="px-2 py-1 bg-white rounded-full text-xs font-semibold uppercase">
                        {interaction.severity}
                      </span>
                    </div>
                    
                    <p className="font-semibold mb-2">{interaction.interaction}</p>
                    
                    {interaction.patient_factors.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-semibold text-sm mb-1">Patient Risk Factors:</h4>
                        <ul className="text-sm space-y-1">
                          {interaction.patient_factors.map((factor, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-current rounded-full"></span>
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {interaction.suggestions.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Recommendations:</h4>
                        <ul className="text-sm space-y-1">
                          {interaction.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-current rounded-full"></span>
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Check New Medications
        </button>
      </div>
    </div>
  );
};

export default ResultsDisplay;