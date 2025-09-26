export interface BusinessData {
  name: string;
  field: string;
  description: string;
  logo: string; // base64 string
  website: string;
  location: string;
}

export interface MarketingGoals {
  awareness: boolean;
  sales: boolean;
  leads: boolean;
  engagement: boolean;
  other: string;
}

export interface TargetAudience {
  description: string;
}

export interface ConsultationData {
  business: BusinessData;
  goals: MarketingGoals;
  audience: TargetAudience;
}

export interface DetailedPost {
  day: string;
  platform: string;
  postType: string;
  caption: string;
  hashtags: string;
  visualPrompt: string;
  // FIX: Added optional generatedImage property to align with its usage in dashboard components.
  generatedImage?: string;
}

export interface SimplePost {
  day: string;
  platform: string;
  idea: string;
}

export interface FutureWeek {
  week: number;
  summary: string;
  posts: SimplePost[];
}

export interface Prescription {
  strategy: {
    title: string;
    summary: string;
    steps: string[];
  };
  week1Plan: DetailedPost[]; // Sample for the initial prescription page
  futureWeeksPlan: FutureWeek[]; // Ideas for future weeks
  detailedPlans?: { // Holds dynamically generated weekly plans
    [weekKey: string]: DetailedPost[];
  };
}


export interface Package {
  name: string;
  price: number;
  features: string[];
  postsPerMonth: number;
  videosPerMonth: number;
  isFeatured: boolean;
  notes?: string[];
}

export interface SocialConnections {
    facebook: boolean;
    instagram: boolean;
    tiktok: boolean;
    x: boolean;
    linkedin: boolean;
}

export interface Client {
    id: number;
    consultationData: ConsultationData;
    prescription: Prescription;
    selectedPackage: Package;
    connections: SocialConnections;
    email: string;
    password?: string; // Stored temporarily during registration
    status: 'pending' | 'active';
}

// Data for new client registration flow
export interface RegistrationDetails {
    name: string;
    email: string;
    password?: string;
}


// Types for Admin Dashboard Simulation
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  plan: string;
  status: 'Active' | 'Cancelled' | 'Pending';
  joinDate: string;
}

export interface AdCampaign {
  id: number;
  name: string;
  platform: 'Facebook' | 'Instagram' | 'TikTok';
  status: 'Running' | 'Paused' | 'Completed';
  budget: number;
  reach: number;
}

export interface VideoOperation {
    name: string;
    done: boolean;
    response?: {
        generatedVideos: {
            video: {
                uri: string;
            }
        }[];
    };
}