import React, { useState } from 'react';
import { Search, Apple, Clock, AlertTriangle } from 'lucide-react';

export const FoodInteractionsPage: React.FC = () => {
  const [drugName, setDrugName] = useState('');
  const [foodInteractions, setFoodInteractions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:5000/api/food-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drug_name: drugName.trim() })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch food interactions');
      }

      const data = await response.json();
      setFoodInteractions(data.food_interactions);
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
            Food Interactions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Learn about food interactions with your medications
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
                    placeholder="Enter medication name (e.g., Warfarin)"
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
                    <span>Check Food Interactions</span>
                  </>
                )}
              </button>
            </form>

            {/* Educational Content */}
            <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
              <div className="flex items-start space-x-3">
                <Apple className="h-6 w-6 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">
                    Food-Drug Interactions
                  </h3>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Certain foods can affect how medications work in your body. Some foods may increase or 
                    decrease the effectiveness of medications, while others may cause adverse reactions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Food Interaction Information
            </h3>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {foodInteractions ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3 mb-4">
                  <Apple className="h-6 w-6 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {drugName} - Food Interactions
                    </h4>
                    <div className="text-gray-700 dark:text-gray-300 leading-relaxed space-y-2">
                      {foodInteractions.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> Always consult your healthcare provider or pharmacist 
                    about food interactions with your medications.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 dark:text-gray-400">
                <Apple className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a medication name to check food interactions</p>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
};