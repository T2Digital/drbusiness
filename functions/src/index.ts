// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
// FIX: Changed import from `require` to standard ES module `import` syntax to resolve "Import assignment cannot be used" error.
import express from "express";
import cors from "cors";
import {GoogleGenAI, Type, Modality} from "@google/genai";
import {
    ConsultationData,
    SimplePost,
} from "../../../types";
import { Buffer } from "buffer";


// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(cors({origin: true}));
app.use(express.json({limit: "10mb"}));

const geminiApiKey = defineSecret("API_KEY");

// --- LAZY AI INITIALIZATION ---
let ai: GoogleGenAI | null = null;
function getAi() {
    if (!ai) {
        // NOTE: .value() only works in deployed functions, not locally
        const apiKey = geminiApiKey.value();
        if (!apiKey) {
            throw new Error("Gemini API key secret is not available. Ensure the secret is set and the function has permissions to access it.");
        }
        ai = new GoogleGenAI({ apiKey });
    }
    return ai;
}
const textModel = "gemini-2.5-flash";
const imageModel = "imagen-4.0-generate-001";
const videoModel = "veo-2.0-generate-001";
const imageEditModel = "gemini-2.5-flash-image-preview";


// ...existing code...

app.post("/clients/:id/activate", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const clientRef = db.collection("clients").doc(req.params.id);
    await clientRef.update({status: "active"});
    return res.status(200).json({success: true, message: "Client activated."});
  } catch (error) {
    console.error("Error activating client:", error);
    next(error);
  }
    return null;
});

// --- API: AI PROXY ENDPOINTS ---

const DR_BUSINESS_PERSONA_PROMPT = `
You are 'Dr. Business', a world-class, witty strategic marketing consultant from Egypt.
Your persona is defined by a blend of high-level professionalism and sharp, 'classy colloquial' Egyptian Arabic.
You must simplify complex marketing concepts with intelligence and confidence, as if you are a successful entrepreneur mentoring another.
Your advice must always be direct, actionable, and laser-focused on results and viral growth.
Your language must be impactful and natural, completely avoiding generic AI phrases, robotic language, or overly casual/street slang.
Every piece of Arabic content you generate must be grammatically perfect with zero spelling mistakes.
You must strictly adhere to the business details provided in the prompt and not invent or assume information for other businesses.
`;


// ...existing code...

app.post("/ai/generateDetailedWeekPlan", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { consultationData, posts }: { consultationData: ConsultationData; posts: SimplePost[] } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Business Profile: ${consultationData.business.name} - ${consultationData.business.description}. Based on these simple ideas: ${JSON.stringify(posts)}. For each idea, generate a detailed post: powerful ARABIC caption, ARABIC hashtags, and a detailed ENGLISH visual prompt.`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, platform: { type: Type.STRING }, adType: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.STRING }, visualPrompt: { type: Type.STRING } }, required: ["day", "platform", "adType", "caption", "hashtags", "visualPrompt"] } } },
        });
        if (!response.text) {
            return res.status(500).json({ error: "No text returned from AI for detailedPosts" });
        }
        const detailedPosts = JSON.parse(response.text);
        return res.status(200).json(detailedPosts);
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/generateCaptionVariations", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { originalCaption, businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Business context: ${businessContext}. Original caption: "${originalCaption}". Generate 3 distinct, powerful alternative captions in ARABIC. They should vary in tone (e.g., one professional, one witty, one direct).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { variations: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
        });
        if (!response.text) {
            return res.status(500).json({ error: "No text returned from AI for caption variations" });
        }
        return res.status(200).json(JSON.parse(response.text));
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/elaborateOnStrategyStep", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { businessContext, step } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Business context: ${businessContext}. Elaborate on this strategic step: "${step}". Provide a detailed, actionable explanation in ARABIC, using markdown for formatting (like **bold** and lists).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT },
        });
        return res.status(200).json({ text: response.text });
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/generateAnalyticsData", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `For a business like this: ${businessContext}, generate realistic but MOCK social media analytics data for a dashboard. Provide follower growth (value, trend), engagement rate (value, trend), reach (value, trend), and weekly performance (an array of 7 numbers from 0-100 for Sun-Sat).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { followerGrowth: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, engagementRate: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.NUMBER } } }, reach: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, weeklyPerformance: { type: Type.ARRAY, items: { type: Type.INTEGER } } } } },
        });
        if (!response.text) {
            return res.status(500).json({ error: "No text returned from AI for analytics data" });
        }
        return res.status(200).json(JSON.parse(response.text));
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/editImageWithPrompt", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { base64ImageData, mimeType, prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: imageEditModel,
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
                if (response.candidates && response.candidates[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                            return res.status(200).json({ imageUrl });
                        }
                    }
                }
                throw new Error("AI did not return an image.");
    } catch (error) {
        next(error);
        return;
    }
    return;
});

app.post("/ai/enhanceVisualPrompt", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Enhance this visual prompt for an AI image generator to be more artistic, detailed, and professional. Keep the core concept but add cinematic and stylistic elements. Your response must ONLY be the enhanced prompt in ENGLISH. Original prompt: "${prompt}"`,
        });
        return res.status(200).json({ text: response.text });
    } catch (error) {
        next(error);
        return;
    }
});

app.get("/ai/getTrendingTopics", async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: "What are the top 3 trending topics in Egypt right now across different categories (e.g., News, Entertainment, Technology)? For each category, list the main topic and 2-3 related sub-points. Format the response in ARABIC using markdown with '###' for categories.",
            config: { tools: [{ googleSearch: {} }] },
        });
        
        const responseText = response?.text;
        if (typeof responseText !== "string" || !responseText.trim()) {
            console.warn("Trending topics response from AI was empty or invalid.", { response });
            throw new Error("لم نتمكن من جلب الترندات حاليًا لأن الرد من خدمة البحث كان فارغًا. حاول مرة أخرى لاحقًا.");
        }

        return res.status(200).json({ text: responseText });
    } catch (error) {
        console.error("Error in /ai/getTrendingTopics:", error);
        next(error);
        return;
    }
});

app.post("/ai/generateImage", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { prompt } = req.body;
        const response = await aiInstance.models.generateImages({
            model: imageModel,
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' },
        });
                if (response.generatedImages && response.generatedImages[0]?.image?.imageBytes) {
                    const imageBase64 = response.generatedImages[0].image.imageBytes;
                    return res.status(200).json({ imageBase64: `data:image/png;base64,${imageBase64}` });
                }
                throw new Error("AI did not return an image.");
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/generateVideo", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { prompt, image } = req.body;
        const operation = await aiInstance.models.generateVideos({
            model: videoModel,
            prompt,
            image: image || undefined,
            config: { numberOfVideos: 1 },
        });
        return res.status(200).json(operation);
    } catch (error) {
        next(error);
        return;
    }
});

app.post("/ai/getVideoOperationStatus", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const aiInstance = getAi();
        const { operation } = req.body;
        const status = await aiInstance.operations.getVideosOperation({ operation });
        return res.status(200).json(status);
    } catch (error) {
        next(error);
        return;
    }
});

app.get("/ai/getVideo", async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        const videoUri = req.query.uri as string;
        if (!videoUri) {
            return res.status(400).send("Video URI is required.");
        }
        const apiKey = geminiApiKey.value();
        const videoUrl = `${videoUri}&key=${apiKey}`;
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        res.setHeader("Content-Type", response.headers.get("Content-Type") || "video/mp4");
        res.setHeader("Content-Length", response.headers.get("Content-Length") || "");
        const videoBuffer = await response.arrayBuffer();
        res.send(Buffer.from(videoBuffer));
        return;
    } catch (error) {
        next(error);
        return;
    }
});

// --- GLOBAL ERROR HANDLER ---
// This middleware will catch any error passed to next()
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("An error occurred:", err.stack || err.message);
    const errorMessage = err.message || "An unknown server error occurred.";
    res.status(500).json({ message: errorMessage });
});


// --- EXPORT THE API ---
export const api = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 540, // Increased timeout for heavy operations
    secrets: [geminiApiKey],
    cpu: 2,
  },
  app,
);