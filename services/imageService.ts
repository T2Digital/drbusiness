// @ts-nocheck
import { GoogleGenAI, Modality } from "@google/genai";
import { ai as geminiAI } from './geminiService'; // Reuse the initialized client

// --- API KEYS ---
// FIX: Hardcoded API keys to resolve runtime errors on deployment environments where import.meta.env is unavailable.
const OPENROUTER_API_KEY = "0f8f7f3ce8f6af72c85cf976b03acdc26bea614d04ad1c49882b2fc5765f251c";
const UNSPLASH_ACCESS_KEY = "fPmjcDtV7iErmSDtU-GQ8zShHmfqD5n-E98qNAyJWpA";
const PIXABAY_API_KEY = "5243282-12c50f7ec268d1b7483c3b3d02";

// --- Types ---
export interface ImageSearchResult {
    id: string;
    url: string; // URL for a smaller version for previews
    fullUrl: string; // URL for the full-resolution image
    alt: string;
    photographer: string;
}

// --- Helper to simplify search queries ---
const getKeywordsFromPrompt = (prompt: string): string => {
    // A simple implementation: take the first few important-sounding words.
    // A more advanced version could use another AI call to extract keywords.
    return prompt.split(',')[0].split(' ').slice(0, 5).join(' ');
};

// --- Service Implementation ---
export const imageService = {
    /**
     * Generates an image using Google's Imagen model and optionally brands it with a logo.
     */
    generateWithGemini: async (prompt: string, logoBase64?: string): Promise<string> => {
        try {
            // 1. Generate base image
            const baseImageResponse = await geminiAI.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: `A high-impact, professional social media marketing graphic. Vibrant colors, dynamic composition, clean and modern style, suitable for an Arab audience. Based on this creative brief: "${prompt}". Leave a clean, unobtrusive space in one of the corners for a brand logo. Do not include any text unless specifically asked.`,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '1:1',
                },
            });

            if (!baseImageResponse.generatedImages || baseImageResponse.generatedImages.length === 0) {
                throw new Error("Base image generation failed.");
            }
            
            let finalImageBase64 = baseImageResponse.generatedImages[0].image.imageBytes;

            // 2. If logo is provided, use image editing model to add it
            if (logoBase64) {
                finalImageBase64 = await imageService.brandImage(finalImageBase64, logoBase64);
            }
            return finalImageBase64;
        } catch (error) {
            console.error("Error in generateWithGemini:", error);
            throw new Error("Failed to generate branded image with Gemini.");
        }
    },

    /**
     * Generates an image using an OpenRouter model (e.g., Stable Diffusion).
     */
    generateWithOpenRouter: async (prompt: string): Promise<string> => {
        if (!OPENROUTER_API_KEY) throw new Error("OpenRouter API Key is not configured.");
        try {
            const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "stabilityai/stable-diffusion-xl", // Example model
                    "prompt": `A professional, high-impact social media marketing graphic, vibrant colors, dynamic composition, clean and modern style. Creative brief: "${prompt}"`,
                    "n": 1,
                    "size": "1024x1024"
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`OpenRouter API error: ${response.status} ${errorBody}`);
            }

            const result = await response.json();
            const base64Json = result.data[0].b64_json;
            return base64Json; // OpenRouter returns base64 directly

        } catch (error) {
            console.error("Error generating with OpenRouter:", error);
            throw new Error("Failed to generate image with OpenRouter.");
        }
    },

    /**
     * Searches for photos on Unsplash.
     */
    searchUnsplash: async (prompt: string): Promise<ImageSearchResult[]> => {
        if (!UNSPLASH_ACCESS_KEY) throw new Error("Unsplash API Key is not configured.");
        try {
            const query = getKeywordsFromPrompt(prompt);
            const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20`, {
                headers: {
                    'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
                }
            });
            if (!response.ok) throw new Error(`Unsplash API error: ${response.status}`);
            const data = await response.json();
            return data.results.map((img: any) => ({
                id: img.id,
                url: img.urls.small,
                fullUrl: img.urls.regular,
                alt: img.alt_description,
                photographer: img.user.name,
            }));
        } catch (error) {
            console.error("Error searching Unsplash:", error);
            throw new Error("Failed to search Unsplash.");
        }
    },

    /**
     * Searches for photos on Pixabay.
     */
    searchPixabay: async (prompt: string): Promise<ImageSearchResult[]> => {
        if (!PIXABAY_API_KEY) throw new Error("Pixabay API Key is not configured.");
        try {
            const query = getKeywordsFromPrompt(prompt);
            const response = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=20`);
            if (!response.ok) throw new Error(`Pixabay API error: ${response.status}`);
            const data = await response.json();
            return data.hits.map((img: any) => ({
                id: img.id.toString(),
                url: img.webformatURL,
                fullUrl: img.largeImageURL,
                alt: img.tags,
                photographer: img.user,
            }));
        } catch (error) {
            console.error("Error searching Pixabay:", error);
            throw new Error("Failed to search Pixabay.");
        }
    },

    /**
     * Uses Gemini to brand an image with a logo.
     * This is an AI-based approach.
     */
    brandImage: async(imageBase64: string, logoBase64: string): Promise<string> => {
         const logoData = logoBase64.split(',')[1] || logoBase64;
         const editResponse = await geminiAI.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: [
                    { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
                    { inlineData: { data: logoData, mimeType: 'image/png' } },
                    { text: 'Place the second image (the logo) as a small, professional watermark in the top-right corner of the first image. Ensure it is tastefully sized and does not obscure any important details of the main image.' },
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
             console.warn("Image editing did not return an image, using unbranded version.");
             return imageBase64;
        }
    },

    /**
     * Uses HTML Canvas to brand an image with a logo.
     * This is a deterministic, client-side approach.
     */
    brandImageWithCanvas: async (imageUrl: string, logoBase64: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');

            const mainImage = new Image();
            mainImage.crossOrigin = "Anonymous"; // Important for fetching from other domains
            mainImage.src = imageUrl;

            mainImage.onload = () => {
                canvas.width = mainImage.width;
                canvas.height = mainImage.height;
                ctx.drawImage(mainImage, 0, 0);

                const logoImage = new Image();
                logoImage.src = logoBase64;

                logoImage.onload = () => {
                    // Calculate logo size (e.g., 15% of the main image width)
                    const logoWidth = mainImage.width * 0.15;
                    const logoHeight = (logoImage.height / logoImage.width) * logoWidth;
                    const padding = mainImage.width * 0.02; // 2% padding

                    // Position in top right corner
                    const x = mainImage.width - logoWidth - padding;
                    const y = padding;

                    ctx.globalAlpha = 0.9; // Slightly transparent
                    ctx.drawImage(logoImage, x, y, logoWidth, logoHeight);
                    ctx.globalAlpha = 1.0;

                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };

                logoImage.onerror = () => reject('Failed to load logo image');
            };

            mainImage.onerror = () => reject('Failed to load main image');
        });
    }
};