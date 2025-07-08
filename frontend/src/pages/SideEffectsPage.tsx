import React, { useState } from 'react';
import { Search, AlertTriangle, Info, Clock } from 'lucide-react';

export const SideEffectsPage: React.FC = () => {
  const [drugName, setDrugName] = useState('');
  const [sideEffects, setSideEffects] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/side-effects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drug_name: drugName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch side effects');
      }

      const data = await response.json();
      setSideEffects(data.side_effects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-24 bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Side Effects Information
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Get comprehensive information about medication side effects
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Search Form */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medication Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter medication name (e.g., Aspirin)"
                    required
                  />
                  <Search className="h-5 w-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Clock className="h-5 w-5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Get Side Effects</span>
                  </>
                )}
              </button>
            </form>

            {/* Educational Content */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <Info className="h-6 w-6 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Understanding Side Effects
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Side effects vary by individual and dosage. Always consult your healthcare provider 
                    if you experience any concerning symptoms. This information is for educational purposes only.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Side Effects Information
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {sideEffects ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3 mb-4">
                  <AlertTriangle className="h-6 w-6 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {drugName} - Side Effects
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                      {sideEffects}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> This information is for educational purposes only. 
                    Always consult your healthcare provider for personalized medical advice.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a medication name to get side effects information</p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information */}
        
      </div>
    </div>
  );
};