import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ConsultationData, Prescription, SimplePost, DetailedPost, AnalyticsData } from '../types';
import { imageService } from './imageService';

// FIX: Hardcoded API key to resolve Vercel deployment issues.
const GEMINI_API_KEY = "AIzaSyD79cpQB0ZNILYRLVkHqod64cihlN-6fs4";
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const model = 'gemini-2.5-flash';

// Schemas for JSON generation
const detailedPostSchema = {
    type: Type.OBJECT,
    properties: {
        day: { type: Type.STRING },
        platform: { type: Type.STRING },
        postType: { type: Type.STRING },
        caption: { type: Type.STRING },
        hashtags: { type: Type.STRING },
        visualPrompt: { type: Type.STRING },
    },
    required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"],
};

const prescriptionSchema = {
    type: Type.OBJECT,
    properties: {
        strategy: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
             required: ["title", "summary", "steps"],
        },
        week1Plan: {
            type: Type.ARRAY,
            items: detailedPostSchema,
        },
        futureWeeksPlan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    week: { type: Type.INTEGER },
                    summary: { type: Type.STRING },
                    posts: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                day: { type: Type.STRING },
                                platform: { type: Type.STRING },
                                idea: { type: Type.STRING },
                            },
                             required: ["day", "platform", "idea"],
                        },
                    },
                },
                required: ["week", "summary", "posts"],
            },
        },
    },
    required: ["strategy", "week1Plan", "futureWeeksPlan"],
};

// Function implementations
export const generatePrescription = async (data: ConsultationData): Promise<Prescription> => {
    const prompt = `Based on the following business consultation data, create a comprehensive marketing prescription.
    Business Name: ${data.business.name}
    Field: ${data.business.field}
    Description: ${data.business.description}
    Location: ${data.business.location}
    Website: ${data.business.website}
    Marketing Goals: ${Object.entries(data.goals).filter(([, v]) => v).map(([k]) => k).join(', ')}
    Target Audience: ${data.audience.description}

    The prescription should include:
    1.  A very catchy, powerful, and viral strategy title, a summary, and 3-4 actionable steps.
    2.  A detailed content plan for the first week (Week 1), with 4-5 posts. For each post, provide: day, platform (e.g., Instagram, Facebook), post type (e.g., engaging question, behind the scenes, product showcase), a full viral-style caption, relevant hashtags, and a detailed visual prompt in English for an AI image generator.
    3.  A plan for the next three weeks (Weeks 2, 3, 4) with a summary for each week and simple, strong post ideas (day, platform, idea) for each day of the week.

    Respond ONLY with the JSON object. The language for the content (captions, strategy, ideas) should be in colloquial Egyptian Arabic. Visual prompts must be in English.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: prescriptionSchema as any,
        },
    });

    const jsonString = response.text;
    const prescription = JSON.parse(jsonString) as Prescription;
    
    // --- NEW: Auto-generate images for week 1 ---
    if (prescription.week1Plan && prescription.week1Plan.length > 0) {
        console.log("Starting automatic image generation for Week 1...");
        const enhancedPosts = await Promise.all(
            prescription.week1Plan.map(async (post) => {
                try {
                    console.log(`Generating image for prompt: "${post.visualPrompt}"`);
                    const imageBase64 = await imageService.generateWithGemini(post.visualPrompt);
                    console.log(`Uploading image for post: "${post.caption}"`);
                    const imageUrl = await imageService.uploadImage(imageBase64);
                    console.log(`Image ready for post: "${post.caption}" at ${imageUrl}`);
                    return { ...post, generatedImage: imageUrl };
                } catch (error) {
                    console.error(`Failed to generate or upload image for post: ${post.caption}`, error);
                    return { ...post, generatedImage: undefined }; // Return post without image on failure
                }
            })
        );
        prescription.week1Plan = enhancedPosts;
        console.log("Finished automatic image generation.");
    }

    return prescription;
};


export const generateDetailedWeekPlan = async (consultationData: ConsultationData, simplePosts: SimplePost[]): Promise<DetailedPost[]> => {
    const prompt = `
        Business Context:
        - Name: ${consultationData.business.name}
        - Field: ${consultationData.business.field}
        - Audience: ${consultationData.audience.description}

        Task: Convert the following simple post ideas into a detailed content plan. For each post, generate a full, viral-style caption in colloquial Egyptian Arabic, relevant hashtags in Arabic, a post type, and a detailed visual prompt in English for an AI image generator.

        Simple Post Ideas:
        ${simplePosts.map(p => `- ${p.day}, ${p.platform}: ${p.idea}`).join('\n')}

        Respond ONLY with a JSON array of detailed post objects.
    `;

    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: detailedPostSchema,
            } as any,
        },
    });

    const jsonString = response.text;
    return JSON.parse(jsonString) as DetailedPost[];
};

export const generateCaptionVariations = async (originalCaption: string, businessContext: string): Promise<string[]> => {
    const prompt = `
        Business Context: ${businessContext}
        Original Caption: "${originalCaption}"

        Generate 3 alternative versions of this caption. They should be different in tone or angle but convey a similar message. Respond in colloquial Egyptian Arabic.
        Respond ONLY with a JSON array of strings.
    `;
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
            },
        },
    });
    const jsonString = response.text;
    return JSON.parse(jsonString) as string[];
};

export const elaborateOnStrategyStep = async (businessContext: string, step: string): Promise<string> => {
    const prompt = `
        Business Context: ${businessContext}
        Strategy Step: "${step}"

        Elaborate on this marketing strategy step. Provide a 2-3 paragraph explanation of why it's important and how to execute it effectively. Use markdown for formatting. Respond in colloquial Egyptian Arabic.
    `;

    const response = await ai.models.generateContent({ model, contents: prompt });
    return response.text;
};

export const enhanceVisualPrompt = async (prompt: string): Promise<string> => {
    const promptForEnhancement = `
        Enhance the following visual prompt for an AI image generator to be more detailed, vivid, and specific. Add details about style, lighting, composition, and mood. The original prompt is in English. The response should also be in English.

        Original prompt: "${prompt}"

        Enhanced prompt:
    `;
    const response = await ai.models.generateContent({ model, contents: promptForEnhancement });
    return response.text.trim();
};

export const editImageWithPrompt = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64ImageData,
                        mimeType: mimeType,
                    },
                },
                {
                    text: prompt,
                },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    // Find the image part in the response
    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return part.inlineData.data;
        }
    }
    throw new Error("No image was returned from the edit operation.");
};

const analyticsSchema = {
  type: Type.OBJECT,
  properties: {
    followerGrowth: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.INTEGER },
        trend: { type: Type.NUMBER },
      }
    },
    engagementRate: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.NUMBER },
        trend: { type: Type.NUMBER },
      }
    },
    reach: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.INTEGER },
        trend: { type: Type.NUMBER },
      }
    },
    weeklyPerformance: {
      type: Type.ARRAY,
      items: { type: Type.NUMBER }
    }
  }
};

export const generateAnalyticsData = async (businessContext: string): Promise<AnalyticsData> => {
    const prompt = `
        Generate a plausible but fictional set of social media analytics for the following business.
        Business Context: ${businessContext}

        Provide data for:
        - followerGrowth: A total number (e.g., 15234) and a trend percentage for the last month (e.g., 5.2).
        - engagementRate: A percentage (e.g., 3.4) and a trend percentage (e.g., -0.5).
        - reach: A total number (e.g., 89432) and a trend percentage (e.g., 12.1).
        - weeklyPerformance: An array of 7 numbers between 0 and 100 representing engagement from Sunday to Saturday.

        Respond ONLY with the JSON object.
    `;
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: analyticsSchema as any,
        }
    });

    return JSON.parse(response.text) as AnalyticsData;
}