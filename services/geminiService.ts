
import { AnalyticsData, ConsultationData, DetailedPost, Prescription, SimplePost, VideoOperation } from '../types';
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { imageService } from './imageService';

// Initialize the Gemini AI model
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-flash';
const imageEditModel = 'gemini-2.5-flash-image-preview';
const videoModel = 'veo-2.0-generate-001';

const DR_BUSINESS_PERSONA_PROMPT = `
You are 'Dr. Business,' a master advertising strategist from Egypt. Your voice is a powerful mix of deep expertise and 'classy colloquial' Egyptian Arabic. You are a sharp, results-driven expert crafting high-converting ad campaigns.

**Core Advertising Philosophy:**
Every piece of content is a sponsored ad ('إعلان ممول') designed to achieve a specific business goal (sales, leads, etc.). The goal is to make the user stop scrolling and take immediate action.

**The Anatomy of a Perfect Ad:**
1.  **The Killer Hook (الخطّاف القاتل):** Every ad copy MUST start with a short, scroll-stopping headline that grabs attention instantly. It should target a pain point or a strong desire.
    *   *Good Examples:* "متخليش المنافس بتاعك يسبقك بخطوة.", "الـ 500 جنيه دي ممكن تغير بزنسك.", "كل يوم بتخسر عملاء بسبب الغلطة دي."
    *   *Bad Examples:* "هل تبحث عن حلول تسويقية؟" (Too generic and weak).

2.  **The Persuasive Body (النص المقنع):** The body of the ad must be concise and benefit-driven. 2-3 short sentences max. It must clearly present the value proposition and create a strong sense of urgency or exclusivity. Use natural, persuasive language that speaks directly to the target customer.
    *   *Instruction:* Focus on what the customer gains. Make the offer sound irresistible.

3.  **The Unmissable CTA (الحث على الإجراء المباشر):** Every ad MUST end with a clear, powerful Call to Action that tells the user exactly what to do next.
    *   *Good Examples:* "ابعتلنا رسالة دلوقتي واعرف تفاصيل الباقة.", "اضغط على اللينك واحجز استشارتك المجانية فوراً.", "اكتب 'مهتم' في كومنت وهنتواصل معاك."
    *   *Bad Examples:* "زوروا موقعنا." (Too passive).

**Visual Prompt Rules (CRITICAL):**
*   **English Only:** The 'visualPrompt' field MUST contain ONLY a detailed description in ENGLISH for the image generator. Never write Arabic here.
*   **No Text in Images:** Your visual prompt must NOT ask for any text, words, letters, or numbers to be rendered inside the image. The image should be purely visual. Text overlays are handled separately.
*   **Literal Visualization:** The prompt must be a direct, literal, and detailed visualization of the ad's core message. It should describe a professional, eye-catching ad creative that visually screams the ad's main point.

The 'adType' field should describe the ad format (e.g., 'Image Ad', 'Carousel Ad', 'Video Ad').
`;

/**
 * Generates a marketing prescription using the Gemini API.
 */
export const generatePrescription = async (data: ConsultationData): Promise<Prescription> => {
    const prescriptionSchema = {
      type: Type.OBJECT,
      properties: {
        strategy: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, summary: { type: 'string' }, steps: { type: Type.ARRAY, items: { type: Type.STRING } } } },
        week1Plan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, platform: { type: Type.STRING }, adType: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.STRING }, visualPrompt: { type: Type.STRING } } } },
        futureWeeksPlan: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { week: { type: Type.INTEGER }, summary: { type: 'string' }, posts: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, platform: { type: Type.STRING }, idea: { type: Type.STRING } } } } } } },
      },
    };
    
    const goals = Object.entries(data.goals).filter(([, v]) => v).map(([k]) => k).join(", ");
    const prompt = `Based on this business profile: Name: ${data.business.name}, Field: ${data.business.field}, Description: ${data.business.description}, Location: ${data.business.location}, Website: ${data.business.website}, Goals: ${goals}, Audience: ${data.audience.description}. Generate a comprehensive marketing prescription in ARABIC, framing all content as sponsored ads. The output MUST be a JSON object that strictly follows the schema. It must contain: 1. 'strategy' (title, summary, 4-6 steps). 2. 'week1Plan' (7 DetailedPost objects where each 'caption' is a masterpiece of ad copy following the persona rules: killer hook, persuasive body, and unmissable CTA. The 'visualPrompt' MUST be a detailed ad creative description in ENGLISH ONLY that is a literal visual representation of the caption's core idea, with NO TEXT in it. The 'adType' must be specified). 3. 'futureWeeksPlan' (3 FutureWeek objects for weeks 2, 3, 4 with ad ideas).`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: prescriptionSchema },
    });

    if (!response.text) {
        throw new Error("Failed to generate prescription text from AI.");
    }

    const prescriptionTextData: Omit<Prescription, 'week1Plan'> & { week1Plan: DetailedPost[] } = JSON.parse(response.text);

    // Generate images, upload them, and store URLs to avoid localStorage quota issues.
    const finalWeek1Plan: DetailedPost[] = [];
    for (const post of prescriptionTextData.week1Plan) {
        try {
            // Add a small delay between requests to be safe.
            await new Promise(resolve => setTimeout(resolve, 1000));
            const generatedImageBase64 = await imageService.generateWithGemini(post.visualPrompt);
            const imageUrl = await imageService.uploadImage(generatedImageBase64);
            finalWeek1Plan.push({ ...post, generatedImage: imageUrl });
        } catch (err) {
            console.error(`Failed to generate/upload image for prompt: "${post.visualPrompt}"`, err);
            finalWeek1Plan.push({ ...post, generatedImage: undefined }); // Add post without image on failure
        }
    }

    return {
        ...prescriptionTextData,
        week1Plan: finalWeek1Plan,
    };
};

/**
 * Generates a detailed week plan using the Gemini API.
 */
export const generateDetailedWeekPlan = async (
    consultationData: ConsultationData,
    posts: SimplePost[]
): Promise<DetailedPost[]> => {
    const prompt = `Business Profile: ${consultationData.business.name} - ${consultationData.business.description}. Based on these simple ad ideas: ${JSON.stringify(posts)}. For each idea, generate a detailed ad: a powerful ARABIC ad copy (following the persona rules: killer hook, persuasive body, unmissable CTA), ARABIC hashtags, an 'adType', and a detailed ENGLISH ONLY visual prompt for the ad creative that is a literal visual representation of the copy's core message, with NO TEXT in it.`;
    
    const response = await ai.models.generateContent({
        model: textModel,
        contents: prompt,
        config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, platform: { type: Type.STRING }, adType: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.STRING }, visualPrompt: { type: Type.STRING } }, required: ["day", "platform", "adType", "caption", "hashtags", "visualPrompt"] } } },
    });

    if (!response.text) {
        throw new Error("No text returned from AI for detailedPosts");
    }
    const detailedPosts: DetailedPost[] = JSON.parse(response.text);
    
    // Generate images, upload them, and store URLs to avoid localStorage quota issues.
    const postsWithImages: DetailedPost[] = [];
    for (const post of detailedPosts) {
        try {
             // Add a small delay between requests.
            await new Promise(resolve => setTimeout(resolve, 1000));
            const generatedImageBase64 = await imageService.generateWithGemini(post.visualPrompt);
            const imageUrl = await imageService.uploadImage(generatedImageBase64);
            postsWithImages.push({ ...post, generatedImage: imageUrl });
        } catch (err) {
            console.error(`Failed to generate/upload image for prompt: "${post.visualPrompt}"`, err);
            postsWithImages.push({ ...post, generatedImage: undefined }); // Keep the post even if image generation fails
        }
    }

    return postsWithImages;
};

/**
 * Generates caption variations using the Gemini API.
 */
export const generateCaptionVariations = async (originalCaption: string, businessContext: string): Promise<string[]> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Business context: ${businessContext}. Original ad copy: "${originalCaption}". Generate 3 distinct, powerful alternative ad copies in ARABIC. Each must follow the persona rules (killer hook, persuasive body, CTA) and vary in tone (e.g., one witty, one aggressive, one insightful).`,
        config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { variations: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
    });
    if (!response.text) {
        throw new Error("No text returned from AI for caption variations");
    }
    const { variations } = JSON.parse(response.text);
    return variations || [];
};

/**
 * Elaborates on a strategy step using the Gemini API.
 */
export const elaborateOnStrategyStep = async (businessContext: string, step: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Business context: ${businessContext}. Elaborate on this strategic step: "${step}". Provide a detailed, actionable explanation in ARABIC, using markdown for formatting (like **bold** and lists).`,
        config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT },
    });
    return response.text;
};

/**
 * Generates mock analytics data using the Gemini API.
 */
export const generateAnalyticsData = async (businessContext: string): Promise<AnalyticsData> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `For a business like this: ${businessContext}, generate realistic but MOCK social media analytics data for a dashboard. Provide follower growth (value, trend), engagement rate (value, trend), reach (value, trend), and weekly performance (an array of 7 numbers from 0-100 for Sun-Sat).`,
        config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { followerGrowth: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, engagementRate: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.NUMBER } } }, reach: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, weeklyPerformance: { type: Type.ARRAY, items: { type: Type.INTEGER } } } } },
    });
    if (!response.text) {
        throw new Error("No text returned from AI for analytics data");
    }
    return JSON.parse(response.text);
};

/**
 * Edits an image using the Gemini API.
 */
export const editImageWithPrompt = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const b64Data = base64ImageData.split(',')[1] || base64ImageData;
    const response = await ai.models.generateContent({
        model: imageEditModel,
        contents: { parts: [{ inlineData: { data: b64Data, mimeType } }, { text: prompt }] },
        config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
    });

    if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    throw new Error("AI did not return an image.");
};

/**
 * Enhances a visual prompt using the Gemini API.
 */
export const enhanceVisualPrompt = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: `Enhance this visual prompt for an AI image generator to be more artistic, detailed, and professional. Keep the core concept but add cinematic and stylistic elements. Your response must ONLY be the enhanced prompt in ENGLISH. Original prompt: "${prompt}"`,
    });
    return response.text.trim();
};

/**
 * Gets trending topics using the Gemini API with Google Search grounding.
 */
export const getTrendingTopics = async (): Promise<string> => {
    const response = await ai.models.generateContent({
        model: textModel,
        contents: "Analyze the current social media landscape in Egypt. I need a report in classy colloquial Egyptian Arabic. The output must be formatted in markdown with three specific sections: '### ترندات السوشيال', '### هاشتاجات مولعة', and '### أخبار عاملة قلق'. For each section, list the top 3-4 trending items with a brief, witty explanation for why it's trending.",
        config: { tools: [{ googleSearch: {} }] },
    });
    
    if (typeof response.text !== "string" || !response.text.trim()) {
        throw new Error("لم نتمكن من جلب الترندات حاليًا لأن الرد من خدمة البحث كان فارغًا. حاول مرة أخرى لاحقًا.");
    }
    
    return response.text;
};

/**
 * Starts a video generation job using the Gemini API.
 */
export const startVideoGeneration = async (prompt: string, image?: { imageBytes: string, mimeType: string }): Promise<VideoOperation> => {
    return await ai.models.generateVideos({
        model: videoModel,
        prompt,
        image: image || undefined,
        config: { numberOfVideos: 1 },
    }) as VideoOperation;
};

/**
 * Checks the status of a video generation job using the Gemini API.
 */
export const checkVideoGenerationStatus = async (operation: VideoOperation): Promise<VideoOperation> => {
    return await ai.operations.getVideosOperation({ operation }) as VideoOperation;
};
