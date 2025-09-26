import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const imageModel = 'imagen-4.0-generate-001';

export interface ImageSearchResult {
  id: string;
  url: string;
  fullUrl: string;
  alt: string;
  user: string;
}

// MOCK API KEYS - in a real app, these would be in .env
const UNSPLASH_API_KEY = 'YOUR_UNSPLASH_ACCESS_KEY';
const PIXABAY_API_KEY = 'YOUR_PIXABAY_API_KEY';


export const imageService = {
  /**
   * Generates an image using Gemini and returns a base64 data URL.
   */
  generateWithGemini: async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    const imageBase64 = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${imageBase64}`;
  },

  /**
   * Simulates generating an image with another service (e.g., Stable Diffusion via OpenRouter).
   * For this demo, it just calls Gemini again with a style modifier.
   */
  generateWithOpenRouter: async (prompt: string): Promise<string> => {
    const modifiedPrompt = `${prompt}, photorealistic, 8k, cinematic lighting`;
    
    const response = await ai.models.generateImages({
        model: imageModel,
        prompt: modifiedPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });
    
    const imageBase64 = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${imageBase64}`;
  },

  /**
   * Searches Unsplash for images. MOCKED for this demo.
   */
  searchUnsplash: async (query: string): Promise<ImageSearchResult[]> => {
      console.log(`Mock searching Unsplash for: ${query}`);
      await new Promise(res => setTimeout(res, 500)); // Simulate network
      // In a real app:
      // const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${UNSPLASH_API_KEY}`);
      // const data = await response.json();
      // return data.results.map(...);
      
      // Mocked response:
      return Array.from({ length: 8 }).map((_, i) => ({
          id: `unsplash_${i}`,
          url: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/200`,
          fullUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}${i}/1080`,
          alt: `mock image for ${query}`,
          user: 'Mock User',
      }));
  },

  /**
   * Searches Pixabay for images. MOCKED for this demo.
   */
  searchPixabay: async (query: string): Promise<ImageSearchResult[]> => {
      console.log(`Mock searching Pixabay for: ${query}`);
      await new Promise(res => setTimeout(res, 500)); // Simulate network
      // In a real app:
      // const response = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}`);
      // const data = await response.json();
      // return data.hits.map(...);

      // Mocked response:
       return Array.from({ length: 8 }).map((_, i) => ({
          id: `pixabay_${i}`,
          url: `https://picsum.photos/seed/${encodeURIComponent(query)}pix${i}/200`,
          fullUrl: `https://picsum.photos/seed/${encodeURIComponent(query)}pix${i}/1080`,
          alt: `mock image for ${query}`,
          user: 'Mock User',
      }));
  },
  
  /**
   * Adds a logo to an image using the Canvas API.
   * @param imageUrl The URL of the image to brand (can be a data URL).
   * @param logoUrl The URL of the logo to add (can be a data URL).
   * @returns A promise that resolves with the branded image as a base64 data URL.
   */
  brandImageWithCanvas: async (imageUrl: string, logoUrl?: string): Promise<string> => {
    if (!logoUrl) return imageUrl;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Could not get canvas context');

      const baseImage = new Image();
      baseImage.crossOrigin = "Anonymous"; // Important for external URLs
      baseImage.onload = () => {
        canvas.width = baseImage.width;
        canvas.height = baseImage.height;
        ctx.drawImage(baseImage, 0, 0);

        const logo = new Image();
        logo.crossOrigin = "Anonymous";
        logo.onload = () => {
          // Position logo at bottom right, with some padding
          const padding = canvas.width * 0.05;
          const logoWidth = canvas.width * 0.2; // Logo is 20% of image width
          const logoHeight = (logo.height / logo.width) * logoWidth;
          const x = canvas.width - logoWidth - padding;
          const y = canvas.height - logoHeight - padding;

          ctx.globalAlpha = 0.8; // Make logo slightly transparent
          ctx.drawImage(logo, x, y, logoWidth, logoHeight);
          ctx.globalAlpha = 1.0;
          
          resolve(canvas.toDataURL('image/png'));
        };
        logo.onerror = () => resolve(imageUrl); // If logo fails, return original
        logo.src = logoUrl;
      };
      baseImage.onerror = () => reject('Failed to load base image');
      baseImage.src = imageUrl;
    });
  },

  /**
   * "Uploads" an image. In this mock, it just returns the base64 data URL.
   * A real implementation would upload to a CDN (S3, Cloudinary, etc.) and return a permanent URL.
   * @param base64Image The base64 encoded image string (can be a data URL).
   * @returns A promise that resolves with a URL to the image (in this case, the data URL itself).
   */
  uploadImage: async (base64Image: string): Promise<string> => {
      // Simulate upload delay
      await new Promise(res => setTimeout(res, 500));
      // In a real app, this would be an API call to your backend/CDN.
      // For the demo, we just return the data URL which works for display and linking.
      if (base64Image.startsWith('data:')) {
          return base64Image;
      }
      // Assuming it's just the base64 part
      return `data:image/png;base64,${base64Image}`;
  },
};
