import { AnalyticsData, ConsultationData, DetailedPost, Prescription, SimplePost } from '../types';
import { apiFetch } from './backendService'; 

/**
 * Generates a marketing prescription by calling the secure backend endpoint.
 */
export const generatePrescription = async (data: ConsultationData): Promise<Prescription> => {
    return apiFetch('/ai/generatePrescription', {
        method: 'POST',
        body: JSON.stringify({ consultationData: data }),
    });
};

/**
 * Generates a detailed week plan by calling the secure backend endpoint.
 */
export const generateDetailedWeekPlan = async (
    consultationData: ConsultationData,
    posts: SimplePost[]
): Promise<DetailedPost[]> => {
    return apiFetch('/ai/generateDetailedWeekPlan', {
        method: 'POST',
        body: JSON.stringify({ consultationData, posts }),
    });
};

/**
 * Generates caption variations by calling the secure backend endpoint.
 */
export const generateCaptionVariations = async (originalCaption: string, businessContext: string): Promise<string[]> => {
    const { variations } = await apiFetch('/ai/generateCaptionVariations', {
        method: 'POST',
        body: JSON.stringify({ originalCaption, businessContext }),
    });
    return variations || [];
};

/**
 * Elaborates on a strategy step by calling the secure backend endpoint.
 */
export const elaborateOnStrategyStep = async (businessContext: string, step: string): Promise<string> => {
    const { text } = await apiFetch('/ai/elaborateOnStrategyStep', {
        method: 'POST',
        body: JSON.stringify({ businessContext, step }),
    });
    return text;
};

/**
 * Generates mock analytics data by calling the secure backend endpoint.
 */
export const generateAnalyticsData = async (businessContext: string): Promise<AnalyticsData> => {
    return apiFetch('/ai/generateAnalyticsData', {
        method: 'POST',
        body: JSON.stringify({ businessContext }),
    });
};


/**
 * Edits an image by calling the secure backend endpoint.
 */
export const editImageWithPrompt = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const { imageUrl } = await apiFetch('/ai/editImageWithPrompt', {
        method: 'POST',
        body: JSON.stringify({ base64ImageData, mimeType, prompt }),
    });
    return imageUrl;
};

/**
 * Enhances a visual prompt by calling the secure backend endpoint.
 */
export const enhanceVisualPrompt = async (prompt: string): Promise<string> => {
    const { text } = await apiFetch('/ai/enhanceVisualPrompt', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    });
    return text.trim();
};

/**
 * Gets trending topics by calling the secure backend endpoint.
 */
export const getTrendingTopics = async (): Promise<string> => {
    const { text } = await apiFetch('/ai/getTrendingTopics', { method: 'GET' });
    return text;
};
