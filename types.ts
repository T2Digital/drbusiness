
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

export interface ContentIdea {
  platform: string; // e.g., 'Instagram', 'TikTok', 'Blog'
  title: string;
  description: string;
  format: string; // e.g., 'Reel', 'Carousel Post', 'Article'
}

export interface VisualIdea {
  description: string;
  generatedImage?: string; // base64 string
}

export interface Prescription {
  strategy: {
    title: string;
    summary: string;
    steps: string[];
  };
  contentIdeas: ContentIdea[];
  visualIdeas: VisualIdea[];
}

export interface Package {
  name: string;
  price: number;
  features: string[];
  isFeatured: boolean;
}
