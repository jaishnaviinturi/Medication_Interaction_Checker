import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  onReset?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry, onReset }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Processing Request</h3>
        <div className="text-gray-600 mb-6">
          <p>{message}</p>
          {message.includes('backend server') && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
              <h4 className="font-semibold text-yellow-800 mb-2">Backend Setup Required:</h4>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Ensure Python Flask backend is running</li>
                <li>Install required dependencies: <code className="bg-yellow-100 px-1 rounded">pip install flask flask-cors requests google-generativeai</code></li>
                <li>Set GEMINI_API_KEY environment variable</li>
                <li>Run: <code className="bg-yellow-100 px-1 rounded">python app.py</code></li>
                <li>Backend should be accessible at http://localhost:5000</li>
              </ol>
            </div>
          )}
        </div>
        
        <div className="flex justify-center gap-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          )}
          
          {onReset && (
            <button
              onClick={onReset}
              className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;