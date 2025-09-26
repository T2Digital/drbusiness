import { Client, RegistrationDetails, ConsultationData, Prescription, Package } from '../types';

// --- MOCK DATABASE ---
const DB_KEY = 'dr_business_clients';
const ADMIN_EMAIL = 'admin@dr.business';
const ADMIN_PASSWORD = 'password123';

const initialClients: Client[] = [
    {
        id: 1,
        consultationData: {
            business: { name: 'متجر أزياء عصري', field: 'تجارة ملابس', description: 'متجر إلكتروني متخصص في بيع الملابس العصرية للشباب.', logo: '', website: 'fashion.example.com', location: 'مصر' },
            goals: { awareness: true, sales: true, leads: false, engagement: true, other: '' },
            audience: { description: 'شباب وشابات تتراوح أعمارهم بين 18 و 30 عامًا، يهتمون بآخر صيحات الموضة.' }
        },
        prescription: {
            strategy: { title: 'استراتيجية السيطرة على الموضة 2024', summary: 'خطة سنوية للتحول إلى المرجع الأول للموضة الشبابية في مصر.', steps: ['بناء هوية بصرية قوية على انستجرام', 'إطلاق حملات مؤثرين شهرية', 'إنشاء محتوى فيديو جذاب على تيك توك وريلز'] },
            week1Plan: [ { day: 'الأحد', platform: 'Instagram', postType: 'تفاعلي', caption: 'إيه أكتر لون بتحبوا تلبسوه في الصيف؟ 👕☀️ قولولنا في الكومنتات!', hashtags: '#موضة #صيف #ألوان', visualPrompt: 'A vibrant flat-lay of colorful summer t-shirts against a bright yellow background, with sunglasses and sandals as props. Professional product photography style.' } ],
            futureWeeksPlan: [],
        },
        selectedPackage: { name: 'باقة الحضور اللامع', price: 15000, postsPerMonth: 15, videosPerMonth: 2, features: [], isFeatured: true },
        connections: { facebook: true, instagram: true, tiktok: false, x: false, linkedin: false },
        email: 'client1@example.com',
        status: 'active',
    }
];

const getDb = (): Client[] => {
    try {
        const db = localStorage.getItem(DB_KEY);
        if (db) {
            return JSON.parse(db);
        } else {
            localStorage.setItem(DB_KEY, JSON.stringify(initialClients));
            return initialClients;
        }
    } catch (error) {
        console.error("Failed to read from localStorage", error);
        return initialClients;
    }
};

const saveDb = (clients: Client[]) => {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(clients));
    } catch (error) {
        console.error("Failed to save to localStorage", error);
    }
};

// --- MOCK API FUNCTIONS ---
// All functions are async to simulate real network requests.

export type LoginResult = {
    role: 'admin' | 'client';
    clientId?: number;
} | {
    role: 'error';
    message: string;
};

export const backendService = {
    login: async (email: string, password?: string): Promise<LoginResult> => {
        await new Promise(res => setTimeout(res, 500)); // Simulate network delay
        
        // Admin login
        if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            return { role: 'admin' };
        }

        // Client login
        const clients = getDb();
        const client = clients.find(c => c.email.toLowerCase() === email.toLowerCase());
        
        if (client) {
            if (client.status === 'pending') {
                return { role: 'error', message: 'الحساب قيد المراجعة والتفعيل من قبل الإدارة.' };
            }
            if (client.status === 'active') {
                // In a real app, you would check a hashed password.
                // Since we don't store passwords after registration, we'll just log them in.
                return { role: 'client', clientId: client.id };
            }
        }

        return { role: 'error', message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' };
    },

    getClients: async (): Promise<Client[]> => {
        await new Promise(res => setTimeout(res, 300));
        return getDb();
    },
    
    getClientById: async (id: number): Promise<Client | undefined> => {
        await new Promise(res => setTimeout(res, 300));
        return getDb().find(c => c.id === id);
    },

    registerClient: async (
        regDetails: RegistrationDetails,
        consultationData: ConsultationData,
        prescription: Prescription,
        selectedPackage: Package
    ): Promise<Client> => {
        await new Promise(res => setTimeout(res, 500));
        const clients = getDb();
        const newClient: Client = {
            id: Date.now(),
            email: regDetails.email,
            // DO NOT store the password in the DB in a real app! HASH IT.
            // We're omitting it here to simulate it being handled securely.
            consultationData,
            prescription,
            selectedPackage,
            connections: { facebook: false, instagram: false, tiktok: false, x: false, linkedin: false },
            status: 'pending',
        };
        saveDb([...clients, newClient]);
        return newClient;
    },

    activateClient: async (clientId: number): Promise<boolean> => {
        await new Promise(res => setTimeout(res, 500));
        const clients = getDb();
        const clientIndex = clients.findIndex(c => c.id === clientId);
        if (clientIndex !== -1) {
            clients[clientIndex].status = 'active';
            saveDb(clients);
            return true;
        }
        return false;
    },
    
    updateClient: async (updatedClient: Client): Promise<Client> => {
        await new Promise(res => setTimeout(res, 300));
        const clients = getDb();
        const index = clients.findIndex(c => c.id === updatedClient.id);
        if (index > -1) {
            clients[index] = updatedClient;
            saveDb(clients);
            return updatedClient;
        }
        throw new Error("Client not found for update");
    }
};