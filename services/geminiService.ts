import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ConsultationData, Prescription, VideoOperation, FutureWeek, DetailedPost, SimplePost } from '../types';

// IMPORTANT: The API key is sourced from an environment variable for security.
// In your Vercel project settings, you MUST add an environment variable named 'API_KEY'
// with your Gemini API key for the deployed application to work.
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    // This check is primarily for local development. Vercel will fail the build if the env var is missing.
    console.error('Gemini API key is missing. Please set it in your environment variables.');
}

// In a production-grade application, you should not call the Gemini API directly from the client-side.
// Instead, you should create a backend endpoint (e.g., a Vercel Serverless Function) that receives
// the request from your frontend, adds the API key securely on the server, and then forwards
// the request to the Gemini API. This prevents your API key from ever being exposed to the public.
export const ai = new GoogleGenAI({ apiKey: API_KEY });

const detailedPostSchema = {
    type: Type.OBJECT,
    properties: {
        day: { type: Type.STRING, description: 'Day of the week for the post (e.g., "الأحد", "الاثنين").' },
        platform: { type: Type.STRING, description: 'Recommended platform (e.g., "Instagram", "TikTok", "Facebook").' },
        postType: { type: Type.STRING, description: 'Type of content in Arabic (e.g., "تثقيفي", "ترويجي", "تفاعلي").' },
        caption: { type: Type.STRING, description: 'The full, ready-to-post caption in Egyptian Colloquial Arabic. It MUST start with a strong, catchy hook. It should be engaging, well-written, and include relevant emojis.' },
        hashtags: { type: Type.STRING, description: 'A string of relevant hashtags in Arabic, separated by spaces (e.g., "#تسويق_رقمي #ريادة_أعمال").' },
        visualPrompt: { type: Type.STRING, description: 'A detailed, vivid description in English for an AI image generator. IMPORTANT: This should describe a professional, high-impact social media AD GRAPHIC, not a photograph. Think bold colors, dynamic composition, and clear focus. For example: "A sleek, professional marketing graphic for a coffee brand. A dynamic splash of coffee in the background with a modern, clean product shot in the foreground. Use a color palette of deep browns and vibrant oranges. Minimalist style."' },
    },
    required: ['day', 'platform', 'postType', 'caption', 'hashtags', 'visualPrompt'],
};

const simplePostSchema = {
    type: Type.OBJECT,
    properties: {
        day: { type: Type.STRING, description: 'Day of the week (e.g., "الأحد").' },
        platform: { type: Type.STRING, description: 'Recommended platform.' },
        idea: { type: Type.STRING, description: 'A brief content idea or title in Arabic.' },
    },
    required: ['day', 'platform', 'idea'],
};

const prescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    strategy: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'A catchy, professional title for the overall marketing strategy in Arabic. This should be a high-level, yearly goal.' },
        summary: { type: Type.STRING, description: 'A concise 2-3 sentence summary of the proposed annual strategy in Arabic.' },
        steps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'A list of 3-5 high-level, actionable steps to implement the annual strategy in Arabic.'
        },
      },
      required: ['title', 'summary', 'steps'],
    },
    week1Plan: {
        type: Type.ARRAY,
        description: 'A detailed list of 5-7 posts for the first week. This will serve as a sample.',
        items: detailedPostSchema,
    },
    futureWeeksPlan: {
        type: Type.ARRAY,
        description: 'An overview of content ideas for the next 3 weeks (Weeks 2, 3, 4), with 7 ideas per week.',
        items: {
            type: Type.OBJECT,
            properties: {
                week: { type: Type.INTEGER, description: 'Week number (2, 3, or 4).' },
                summary: { type: Type.STRING, description: 'A brief summary of the focus for this week in Arabic.' },
                posts: { type: Type.ARRAY, description: "Exactly 7 post ideas for this week.", items: simplePostSchema }
            },
             required: ['week', 'summary', 'posts'],
        }
    }
  },
  required: ['strategy', 'week1Plan', 'futureWeeksPlan'],
};


function buildPrompt(data: ConsultationData): string {
    const goals = Object.entries(data.goals)
        .filter(([, value]) => value === true || (typeof value === 'string' && value.length > 0))
        .map(([key, value]) => key === 'other' ? value : key)
        .join(', ');

    return `
    You are "دكتور بزنس" (Dr. Business), an expert AI marketing consultant. Your persona is sharp, modern, and speaks fluent, persuasive EGYPTIAN COLLOquial ARABIC.
    Analyze the following business and generate a comprehensive, creative, and actionable marketing "Prescription" (روشتة).
    All text outputs must be in EGYPTIAN ARABIC, except for the 'visualPrompt' which must be in ENGLISH.

    **Critical Instructions for Captions:**
    1.  **Use Egyptian Dialect:** All captions must be in a natural, engaging Egyptian colloquial style. Use common Egyptian phrases and words.
    2.  **Strong Hooks:** Every caption MUST start with a powerful, attention-grabbing "hook" (هوك). Make it irresistible. Ask a question, state a shocking fact, or create a curiosity gap.
    3.  **Persuasive & Actionable:** The tone should be professional yet friendly, encouraging action.

    **Business Information:**
    - Name: ${data.business.name}
    - Field: ${data.business.field}
    - Description: ${data.business.description}
    - Website: ${data.business.website || 'Not provided'}
    - Target Location: ${data.business.location}
    - Has Logo: ${data.business.logo ? 'Yes' : 'No'}

    **Marketing Goals:**
    - Primary Goals: ${goals}

    **Target Audience:**
    - Description: ${data.audience.description}

    **Your Task:**
    Generate a JSON object that follows the specified schema. The output must be a single, valid JSON object.
    
    The prescription must include:
    1.  **strategy**: A high-level ANNUAL marketing strategy.
    2.  **week1Plan**: A detailed plan for 7 days to act as a sample.
    3.  **visualPrompt IMPORTANT RULE**: The 'visualPrompt' for each post must describe a professional, high-impact social media AD GRAPHIC, not a simple photograph. It must describe visual elements ONLY. DO NOT include any Arabic text to be rendered on the image itself.
    4.  **futureWeeksPlan**: A high-level plan for weeks 2, 3, and 4, with 7 simple post ideas for EACH week.
    `;
}


export const generatePrescription = async (data: ConsultationData): Promise<Prescription> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    try {
        const prompt = buildPrompt(data);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: prescriptionSchema,
            },
        });

        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        return result as Prescription;
    } catch (error) {
        console.error("Error generating prescription:", error);
        if (error instanceof Error) {
           throw new Error(`فشل في إنشاء خطة التسويق. ${error.message}`);
        }
        throw new Error("فشل في إنشاء خطة التسويق. يرجى المحاولة مرة أخرى.");
    }
};

export const generateVideo = async (prompt: string): Promise<VideoOperation> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    try {
        const enhancedPrompt = `Create a highly dynamic and impactful short video (for Instagram Reels/TikTok). Cinematic quality. Use techniques like dynamic camera movements, drone shots, slow motion for emphasis, and energetic fast cuts. The mood should be professional and engaging. Creative brief: "${prompt}"`;
        let operation = await ai.models.generateVideos({
            model: 'veo-2.0-generate-001',
            prompt: enhancedPrompt,
            config: {
                numberOfVideos: 1
            }
        });
        return operation as VideoOperation;
    } catch (error) {
        console.error("Error generating video:", error);
        throw new Error("Failed to start video generation.");
    }
};

export const editImageWithPrompt = async (base64ImageData: string, prompt: string): Promise<string> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    try {
        const editResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64ImageData, mimeType: 'image/jpeg' } },
                    { text: prompt },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePart = editResponse.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart && imagePart.inlineData) {
            return imagePart.inlineData.data;
        } else {
            throw new Error("AI image editing did not return a valid image.");
        }
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image.");
    }
};


export const generateCaptionVariations = async (originalCaption: string, businessContext: string): Promise<string[]> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    const prompt = `
        You are an expert Egyptian copywriter.
        Business context: "${businessContext}"
        Original caption: "${originalCaption}"

        Generate 2 alternative versions for this caption in EGYPTIAN COLLOQUIAL ARABIC. They should be distinct in tone and start with a strong hook. For example, one could be more direct and sales-focused, and another more playful or story-driven.
        Return a JSON object with a single key "variations" which is an array of 2 strings.
        Example response: {"variations": ["caption 1", "caption 2"]}
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        variations: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["variations"]
                }
            }
        });
        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        return result.variations;
    } catch (error) {
        console.error("Error generating caption variations:", error);
        throw new Error("Failed to generate caption variations.");
    }
};

export const generateDetailedWeekPlan = async (businessData: ConsultationData, weekIdeas: SimplePost[]): Promise<DetailedPost[]> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    const prompt = `
        You are "دكتور بزنس", an expert AI marketing consultant speaking in EGYPTIAN COLLOQUIAL ARABIC.
        Your task is to expand a list of simple post ideas into a full, detailed, ready-to-publish content plan for one week.

        **Business Information:**
        - Name: ${businessData.business.name}
        - Field: ${businessData.business.field}
        - Description: ${businessData.business.description}
        - Target Audience: ${businessData.audience.description}

        **Post Ideas to Expand:**
        ${JSON.stringify(weekIdeas, null, 2)}

        **CRITICAL INSTRUCTIONS:**
        1.  **Language & Tone:** All captions must be in engaging, persuasive EGYPTIAN COLLOQUIAL ARABIC.
        2.  **Strong Hooks:** Every single caption MUST start with a powerful, attention-grabbing "hook".
        3.  **Visual Prompts:** The 'visualPrompt' must be in ENGLISH and describe a professional, high-impact social media AD GRAPHIC, not a photograph.
        4.  **Output:** Generate a JSON array that contains a detailed post object for each of the provided ideas. The array should directly follow the schema provided.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: detailedPostSchema
                }
            }
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as DetailedPost[];
    } catch (error) {
        console.error("Error generating detailed week plan:", error);
        throw new Error("Failed to generate detailed content for the week.");
    }
};

export const elaborateOnStrategyStep = async (businessContext: string, step: string): Promise<string> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    const prompt = `
        As an expert marketing consultant ("دكتور بزنس"), provide detailed, actionable advice for the following marketing strategy step, keeping the business context in mind.
        The response must be in EGYPTIAN COLLOQUIAL ARABIC.

        Business Context: ${businessContext}
        Strategy Step: "${step}"

        Your elaboration should include:
        1.  **Why it's important:** Briefly explain the value of this step.
        2.  **How to execute:** Provide 3-4 concrete, practical actions to implement this step.
        3.  **Example:** Give a specific, creative example relevant to the business.
        4.  **KPIs to track:** Suggest 2-3 key performance indicators to measure success.

        Format the response as a single block of text using markdown for clarity (e.g., using **bold** titles).
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error elaborating on strategy step:", error);
        throw new Error("Failed to get details for the strategy step.");
    }
};

export interface AnalyticsData {
    followerGrowth: { value: number; trend: number; };
    engagementRate: { value: number; trend: number; };
    reach: { value: number; trend: number; };
    weeklyPerformance: number[]; // Array of 7 numbers (0-100)
}

const analyticsSchema = {
    type: Type.OBJECT,
    properties: {
        followerGrowth: {
            type: Type.OBJECT,
            properties: { value: { type: Type.INTEGER, description: "Total number of followers." }, trend: { type: Type.NUMBER, description: "Percentage change in followers this month." } },
            required: ["value", "trend"]
        },
        engagementRate: {
            type: Type.OBJECT,
            properties: { value: { type: Type.NUMBER, description: "Overall engagement rate percentage." }, trend: { type: Type.NUMBER, description: "Percentage point change in engagement this month." } },
            required: ["value", "trend"]
        },
        reach: {
            type: Type.OBJECT,
            properties: { value: { type: Type.INTEGER, description: "Total reach this month." }, trend: { type: Type.NUMBER, description: "Percentage change in reach this month." } },
             required: ["value", "trend"]
        },
        weeklyPerformance: {
            type: Type.ARRAY,
            items: { type: Type.INTEGER },
            description: "An array of 7 integers between 0 and 100 representing engagement for each day of the week, starting with Sunday."
        }
    },
    required: ["followerGrowth", "engagementRate", "reach", "weeklyPerformance"]
};

export const generateAnalyticsData = async (businessContext: string): Promise<AnalyticsData> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    const prompt = `
        Based on the following business profile, generate a realistic but fictional set of social media analytics data for the last month.
        The data should reflect typical performance for a business of this type.

        Business Context: ${businessContext}

        Return a single, valid JSON object matching the provided schema. The numbers should be plausible.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: analyticsSchema,
            },
        });
        const jsonText = response.text;
        return JSON.parse(jsonText) as AnalyticsData;
    } catch (error) {
        console.error("Error generating analytics data:", error);
        throw new Error("Failed to generate analytics data.");
    }
};

export const enhanceVisualPrompt = async (prompt: string): Promise<string> => {
    if (!API_KEY) throw new Error("مفتاح واجهة برمجة تطبيقات Gemini غير موجود. يرجى التأكد من إعداده بشكل صحيح.");
    const systemInstruction = "You are an expert prompt engineer for AI image generators like Midjourney or Stable Diffusion. Your task is to rewrite and enhance a user's simple prompt into a detailed, artistic, and professional one. The output must be in English.";
    const userPrompt = `
        Enhance the following prompt. Add rich details about style (e.g., photorealistic, cinematic, vector art), lighting (e.g., golden hour, dramatic studio lighting), composition (e.g., close-up, wide-angle shot), and mood. The final prompt should be a single, cohesive paragraph.

        Original prompt: "${prompt}"

        Return a JSON object with a single key "enhancedPrompt" containing the new, enhanced prompt string.
    `;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        enhancedPrompt: { type: Type.STRING }
                    },
                    required: ["enhancedPrompt"]
                }
            }
        });
        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        return result.enhancedPrompt;
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        throw new Error("Failed to enhance prompt.");
    }
};