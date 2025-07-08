import { Medication, StandardizedDrug, Interaction, AssessedInteraction, Patient, ApiResponse } from '../types/medication';

const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
  private async request<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return { data: result };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return { error: error instanceof Error ? error.message : 'An unexpected error occurred' };
    }
  }

  async standardizeMedications(medications: Medication[]): Promise<ApiResponse<{ standardized: StandardizedDrug[]; timestamp: string }>> {
    return this.request('/standardize', { medications });
  }

  async findInteractions(standardized: StandardizedDrug[]): Promise<ApiResponse<{ interactions: Interaction[]; timestamp: string }>> {
    const response = await this.request<{ data: Interaction[]; timestamp: string }>('/interactions', { standardized });
    // Transform response to match expected format
    if (response.data) {
      return {
        data: {
          interactions: response.data.data,
          timestamp: response.data.timestamp
        }
      };
    }
    return response as ApiResponse<{ interactions: Interaction[]; timestamp: string }>;
  }

  async assessSeverity(interactions: Interaction[], patient: Patient): Promise<ApiResponse<{ assessed_interactions: AssessedInteraction[]; timestamp: string }>> {
    return this.request('/severity', { interactions, patient });
  }
}

export const apiClient = new ApiClient();