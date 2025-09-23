
import { GoogleGenAI, Type } from "@google/genai";
import { ConsultationData, Prescription } from '../types';

// FIX: Initialize GoogleGenAI with named apiKey parameter as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const prescriptionSchema = {
  type: Type.OBJECT,
  properties: {
    strategy: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'A catchy, professional title for the overall marketing strategy.' },
        summary: { type: Type.STRING, description: 'A concise 2-3 sentence summary of the proposed strategy.' },
        steps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'A list of 3-5 actionable steps to implement the strategy.'
        },
      },
      required: ['title', 'summary', 'steps'],
    },
    contentIdeas: {
      type: Type.ARRAY,
      description: 'A list of 5 diverse and creative content ideas.',
      items: {
        type: Type.OBJECT,
        properties: {
          platform: { type: Type.STRING, description: 'The recommended social media platform (e.g., Instagram, TikTok, Facebook, Blog).' },
          title: { type: Type.STRING, description: 'A compelling title or hook for the content piece.' },
          description: { type: Type.STRING, description: 'A brief explanation of the content idea.' },
          format: { type: Type.STRING, description: 'The format of the content (e.g., Reel, Carousel Post, Story, Article).' },
        },
        required: ['platform', 'title', 'description', 'format'],
      },
    },
    visualIdeas: {
      type: Type.ARRAY,
      description: 'A list of 3 distinct and imaginative visual concepts for social media posts. These descriptions will be used to generate images.',
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: 'A detailed, vivid description of the visual. For example: "A minimalist photo of our product on a pastel background with soft lighting."' },
        },
        required: ['description'],
      },
    },
  },
  required: ['strategy', 'contentIdeas', 'visualIdeas'],
};


function buildPrompt(data: ConsultationData): string {
    const goals = Object.entries(data.goals)
        .filter(([, value]) => value === true || (typeof value === 'string' && value.length > 0))
        .map(([key, value]) => key === 'other' ? value : key)
        .join(', ');

    return `
    You are "دكتور بزنس" (Dr. Business), an expert AI marketing consultant for the Arab market.
    Analyze the following business and generate a comprehensive, creative, and actionable marketing "Prescription" (روشتة).
    The tone should be professional, encouraging, and tailored to the Arabic-speaking audience.

    **Business Information:**
    - Name: ${data.business.name}
    - Field: ${data.business.field}
    - Description: ${data.business.description}
    - Website: ${data.business.website || 'Not provided'}
    - Target Location: ${data.business.location}

    **Marketing Goals:**
    - Primary Goals: ${goals}

    **Target Audience:**
    - Description: ${data.audience.description}

    **Your Task:**
    Based on all the provided data, generate a JSON object that follows the specified schema.
    The output must be a single, valid JSON object and nothing else.
    The content should be in Arabic.
    
    The prescription should include:
    1.  **strategy**: A high-level marketing strategy with a title, summary, and concrete steps.
    2.  **contentIdeas**: 5 creative and platform-specific content ideas.
    3.  **visualIdeas**: 3 vivid descriptions for visuals that can be used to generate images. These descriptions should be detailed and creative.
    `;
}


export const generatePrescription = async (data: ConsultationData): Promise<Prescription> => {
    try {
        const prompt = buildPrompt(data);

        // FIX: Use ai.models.generateContent with the correct model and parameters.
        const response = await ai.models.generateContent({
            // FIX: Use 'gemini-2.5-flash' model as per guidelines.
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: prescriptionSchema,
            },
        });

        // FIX: Access the text directly from the response object as per guidelines.
        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        return result as Prescription;
    } catch (error) {
        console.error("Error generating prescription:", error);
        throw new Error("Failed to generate marketing prescription. Please try again.");
    }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        // FIX: Use ai.models.generateImages for image generation.
        const response = await ai.models.generateImages({
            // FIX: Use 'imagen-4.0-generate-001' model for image generation as per guidelines.
            model: 'imagen-4.0-generate-001',
            prompt: `A high-quality, vibrant marketing photograph of: ${prompt}. In Arabic style.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            // FIX: Access the base64 string correctly from the response.
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return base64ImageBytes;
        } else {
            throw new Error("No images were generated.");
        }
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate image.");
    }
};
