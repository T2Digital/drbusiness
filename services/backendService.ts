// services/backendService.ts
import { Client, RegistrationDetails, ConsultationData, Prescription, Package } from '../types';

// ===================================================================================
//
//                              !!! ACTION REQUIRED !!!
//
// PASTE YOUR FIREBASE CLOUD FUNCTION URL HERE.
// Find it in your Firebase Console > Functions > Dashboard. It looks like:
// https://us-central1-your-project-id.cloudfunctions.net/api
//
// ===================================================================================
export const API_BASE_URL = 'https://api-72pksd467q-uc.a.run.app'; // <-- USER'S URL IS NOW LIVE

const ADMIN_EMAIL = 'admin@dr.business';
const ADMIN_PASSWORD = 'password123';

// Helper function to handle fetch requests and errors, now exported
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    // Handle cases where response might be empty
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};


export type LoginResult = {
    role: 'admin' | 'client';
    clientId?: number;
} | {
    role: 'error';
    message: string;
};

export const backendService = {
    login: async (email: string, password?: string): Promise<LoginResult> => {
       // Special hardcoded admin login for now
        if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return { role: 'admin' };
        }
        
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            // Assuming successful login returns { role: 'client', clientId: ... }
            return data;
        } catch (error) {
            return { role: 'error', message: error instanceof Error ? error.message : 'Login failed' };
        }
    },

    getClients: async (): Promise<Client[]> => {
        return apiFetch('/clients');
    },
    
    getClientById: async (id: number): Promise<Client | undefined> => {
        return apiFetch(`/clients/${id}`);
    },

    registerClient: async (
        regDetails: RegistrationDetails,
        consultationData: ConsultationData,
        prescription: Prescription,
        selectedPackage: Package
    ): Promise<Client> => {
        const payload = {
            regDetails,
            consultationData,
            prescription,
            selectedPackage,
        };
        return apiFetch('/clients', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    activateClient: async (clientId: number): Promise<{ success: boolean }> => {
        return apiFetch(`/clients/${clientId}/activate`, {
            method: 'POST',
        });
    },
    
    updateClient: async (updatedClient: Client): Promise<Client> => {
        return apiFetch(`/clients/${updatedClient.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedClient),
        });
    }
};
