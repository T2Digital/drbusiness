import { apiFetch } from './backendService';

// FIX: Hardcoded API keys to resolve Vercel deployment issues.
const UNSPLASH_API_KEY = 'fPmjcDtV7iErmSDtU-GQ8zShHmfqD5n-E98qNAyJWpA';
const PIXABAY_API_KEY = '52432821-2c50f7ec268d1b7483c3b3d02';
const IMGBB_API_KEY = 'bde613bd4475de5e00274a795091ba04';

export interface ImageSearchResult {
  id: string;
  url: string;
  fullUrl: string;
  alt: string;
  user: string;
}

export const imageService = {
  /**
   * Generates an image using Gemini via the backend proxy and returns a base64 data URL.
   */
  generateWithGemini: async (prompt: string): Promise<string> => {
    const { imageBase64 } = await apiFetch('/ai/generateImage', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
    });
    return imageBase64;
  },

  /**
   * Simulates generating an image with another service by calling the backend proxy.
   */
  generateWithOpenRouter: async (prompt: string): Promise<string> => {
    const modifiedPrompt = `${prompt}, photorealistic, 8k, cinematic lighting`;
    const { imageBase64 } = await apiFetch('/ai/generateImage', {
        method: 'POST',
        body: JSON.stringify({ prompt: modifiedPrompt }),
    });
    return imageBase64;
  },

  /**
   * Searches Unsplash for images.
   */
  searchUnsplash: async (query: string): Promise<ImageSearchResult[]> => {
      const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&client_id=${UNSPLASH_API_KEY}`);
      if (!response.ok) {
          throw new Error('Failed to fetch from Unsplash');
      }
      const data = await response.json();
      return data.results.map((img: any) => ({
          id: img.id,
          url: img.urls.small,
          fullUrl: img.urls.regular,
          alt: img.alt_description,
          user: img.user.name,
      }));
  },

  /**
   * Searches Pixabay for images.
   */
  searchPixabay: async (query: string): Promise<ImageSearchResult[]> => {
      const response = await fetch(`https://pixabay.com/api/?key=${PIXABAY_API_KEY}&q=${encodeURIComponent(query)}&per_page=20`);
       if (!response.ok) {
          throw new Error('Failed to fetch from Pixabay');
      }
      const data = await response.json();
      return data.hits.map((img: any) => ({
          id: img.id,
          url: img.webformatURL,
          fullUrl: img.largeImageURL,
          alt: img.tags,
          user: img.user,
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
   * Uploads an image to ImgBB and returns a permanent URL.
   * @param base64Image The base64 encoded image string (must be a data URL).
   * @returns A promise that resolves with a permanent URL to the uploaded image.
   */
  uploadImage: async (base64Image: string): Promise<string> => {
      if (!base64Image.startsWith('data:image')) {
        throw new Error("Invalid base64 string for upload. Must be a data URL.");
      }
      // Remove data URL prefix
      const base64Data = base64Image.split(',')[1];
      
      const formData = new FormData();
      formData.append('image', base64Data);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`ImgBB upload failed: ${errorText}`);
      }

      const result = await response.json();
      if (result.data && result.data.url) {
          return result.data.url;
      } else {
          throw new Error('ImgBB upload failed: Invalid response format.');
      }
  },
};