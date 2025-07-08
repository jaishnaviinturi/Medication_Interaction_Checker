export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface StandardizedDrug {
  rxnorm_id: string;
  generic_name: string;
  dosage: string;
  frequency: string;
  error?: string;
  original?: Medication;
}

export interface Interaction {
  drug1: string;
  drug2: string;
  interaction: string;
  details: string;
}

export interface AssessedInteraction {
  drug1: string;
  drug2: string;
  interaction: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'none';
  patient_factors: string[];
  suggestions: string[];
}

export interface Patient {
  age: number;
  weight: number;
  conditions: string[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  timestamp?: string;
}