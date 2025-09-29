// services/backendService.ts
import { Client, RegistrationDetails, ConsultationData, Prescription, Package } from '../types';

const ADMIN_EMAIL = 'admin@dr.business';
const ADMIN_PASSWORD = 'password123';
const DB_KEY = 'dr_business_db';

// Helper functions to interact with localStorage as a mock database
const getDb = (): { clients: Client[], nextId: number } => {
    try {
        const dbString = localStorage.getItem(DB_KEY);
        if (dbString) {
            const parsed = JSON.parse(dbString);
            // Basic validation to ensure structure is correct
            if (Array.isArray(parsed.clients) && typeof parsed.nextId === 'number') {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Could not parse DB from localStorage", e);
    }
    // Return default structure if anything goes wrong
    return { clients: [], nextId: 1 };
};

const saveDb = (db: { clients: Client[], nextId: number }) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    } catch (e) {
        console.error("Could not save DB to localStorage", e);
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
       // Special hardcoded admin login
        if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return { role: 'admin' };
        }
        
        // Client login
        const db = getDb();
        const client = db.clients.find((c: Client) => c.email.toLowerCase() === email.toLowerCase());

        if (client) {
             if (client.status === 'pending') {
                return { role: 'error', message: 'الحساب قيد المراجعة والتفعيل.' };
            }
            // For mock, we don't strictly check password for clients unless it was set during registration
            // The original logic checked `password === undefined` for admin bypass. Here we check for client.
            if (!client.password || client.password === password) {
                return { role: 'client', clientId: client.id };
            }
        }

        return { role: 'error', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    },

    getClients: async (): Promise<Client[]> => {
        const db = getDb();
        return db.clients;
    },
    
    getClientById: async (id: number): Promise<Client | undefined> => {
        const db = getDb();
        return db.clients.find(c => c.id === id);
    },

    registerClient: async (
        regDetails: RegistrationDetails,
        consultationData: ConsultationData,
        prescription: Prescription,
        selectedPackage: Package
    ): Promise<Client> => {
        const db = getDb();
        const newClient: Client = {
            id: db.nextId,
            email: regDetails.email,
            password: regDetails.password,
            consultationData,
            prescription,
            selectedPackage,
            connections: { facebook: false, instagram: false, tiktok: false, x: false, linkedin: false },
            status: 'pending',
        };
        db.clients.push(newClient);
        db.nextId++;
        saveDb(db);
        return newClient;
    },

    activateClient: async (clientId: number): Promise<{ success: boolean }> => {
        const db = getDb();
        const clientIndex = db.clients.findIndex(c => c.id === clientId);
        if (clientIndex > -1) {
            db.clients[clientIndex].status = 'active';
            // Set flag for notification system in App.tsx
            localStorage.setItem(`client_activated__${db.clients[clientIndex].email}`, 'true');
            saveDb(db);
            return { success: true };
        }
        return { success: false };
    },
    
    updateClient: async (updatedClient: Client): Promise<Client> => {
        const db = getDb();
        db.clients = db.clients.map(c => c.id === updatedClient.id ? updatedClient : c);
        saveDb(db);
        return updatedClient;
    }
};