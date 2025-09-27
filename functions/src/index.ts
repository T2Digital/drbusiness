// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import {GoogleGenAI, Type, Modality} from "@google/genai";
import {
  ConsultationData,
  DetailedPost,
  Prescription,
  SimplePost,
} from "../../src/types";
// FIX: Import Buffer to resolve "Cannot find name 'Buffer'" error.
import { Buffer } from "buffer";

// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(cors({origin: true}));
app.use(express.json({limit: "10mb"})); // Increase limit for image data

const geminiApiKey = defineSecret("API_KEY");

// --- LAZY AI INITIALIZATION ---
let ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = geminiApiKey.value();
    if (!apiKey) {
      throw new Error("Gemini API key secret is not available. Ensure the secret is set and the function has permissions to access it.");
    }
    ai = new GoogleGenAI({apiKey});
  }
  return ai;
};

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-4.0-generate-001";
const videoModel = "veo-2.0-generate-001";
const imageEditModel = "gemini-2.5-flash-image-preview";


// --- API: AUTH ENDPOINTS ---
app.post("/auth/login", async (req, res) => {
  const {email} = req.body;
  if (!email) {
    return res.status(400).json({message: "Email is required."});
  }
  try {
    const clientsRef = db.collection("clients");
    const snapshot = await clientsRef.where("email", "==", email.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({message: "الإيميل أو الباسورد فيهم حاجة غلط. حاول تاني."});
    }
    const clientDoc = snapshot.docs[0];
    const client = clientDoc.data();
    if (client.status === "pending") {
      return res.status(403).json({message: "حسابك لسه بيتراجع. فريقنا هيفعله وهيبعتلك إشعار أول ما يخلص."});
    }
    return res.status(200).json({role: "client", clientId: client.id});
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `حدث خطأ في الخادم أثناء تسجيل الدخول: ${errorMessage}`});
  }
});


// --- API: CLIENTS (CRUD) ENDPOINTS ---
app.get("/clients", async (_req, res) => {
  try {
    const snapshot = await db.collection("clients").get();
    const clients = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    clients.sort((a: any, b: any) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
    return res.status(200).json(clients);
  } catch (error) {
    console.error("Error getting clients:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `لم نتمكن من جلب العملاء: ${errorMessage}`});
  }
});

app.get("/clients/:id", async (req, res) => {
  try {
    const doc = await db.collection("clients").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({message: "Client not found."});
    }
    return res.status(200).json({id: doc.id, ...doc.data()});
  } catch (error) {
    console.error("Error getting client:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `لم نتمكن من جلب العميل: ${errorMessage}`});
  }
});

app.post("/clients", async (req, res) => {
  try {
    const {regDetails, consultationData, prescription, selectedPackage} = req.body;
    const newClient = {
      email: regDetails.email.toLowerCase(),
      consultationData,
      prescription,
      selectedPackage,
      connections: {facebook: false, instagram: false, tiktok: false, x: false, linkedin: false},
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const docRef = await db.collection("clients").add(newClient);
    await docRef.update({id: docRef.id});
    return res.status(201).json({id: docRef.id, ...newClient});
  } catch (error) {
    console.error("Error creating client:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل إنشاء العميل: ${errorMessage}`});
  }
});

app.put("/clients/:id", async (req, res) => {
  try {
    const clientRef = db.collection("clients").doc(req.params.id);
    const {id, ...clientData} = req.body;
    await clientRef.set(clientData, {merge: true});
    return res.status(200).json({id: req.params.id, ...clientData});
  } catch (error) {
    console.error("Error updating client:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل تحديث العميل: ${errorMessage}`});
  }
});

app.post("/clients/:id/activate", async (req, res) => {
  try {
    const clientRef = db.collection("clients").doc(req.params.id);
    await clientRef.update({status: "active"});
    return res.status(200).json({success: true, message: "Client activated."});
  } catch (error) {
    console.error("Error activating client:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل تفعيل العميل: ${errorMessage}`});
  }
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

app.post("/ai/generatePrescription", async (req, res) => {
  try {
    const aiInstance = getAi();
    const {consultationData}: {consultationData: ConsultationData} = req.body;

    const businessContext = `
        - Business Name: ${consultationData.business.name}
        - Field: ${consultationData.business.field}
        - Description: ${consultationData.business.description}
        - Target Audience: ${consultationData.audience.description}
        - Goals: ${Object.entries(consultationData.goals).filter(([, v]) => v).map(([k]) => k).join(", ")}
    `;

    // FIX: Refactored Promise.all to sequential awaits to resolve a suspected TypeScript parser/scope issue.
    const week1Response = await aiInstance.models.generateContent({
      model: textModel,
      contents: `Based on this business profile:\n${businessContext}\nGenerate a detailed social media plan for the FIRST WEEK ONLY. Create exactly 7 posts (Sunday to Saturday). For each, provide: A powerful ARABIC caption with a strong hook and CTA. Relevant ARABIC hashtags. A detailed, artistic visual prompt in ENGLISH with NO spelling mistakes. The post's platform and type.`,
      config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, postType: {type: Type.STRING}, caption: {type: Type.STRING}, hashtags: {type: Type.STRING}, visualPrompt: {type: Type.STRING}}, required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"]}}},
    });

    const futureWeeksResponse = await aiInstance.models.generateContent({
      model: textModel,
      contents: `Based on the same business profile:\n${businessContext}\nGenerate a summary and simple post ideas for the next three weeks (Week 2, 3, 4). For each week, provide a one-sentence strategic summary and 3-4 simple, creative post ideas (day, platform, idea) in ARABIC.`,
      config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {week: {type: Type.INTEGER}, summary: {type: Type.STRING}, posts: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, idea: {type: Type.STRING}}, required: ["day", "platform", "idea"]}}}}, required: ["week", "summary", "posts"]}}},
    });

    const strategyResponse = await aiInstance.models.generateContent({
      model: textModel,
      contents: `Based on the same business profile:\n${businessContext}\nCreate a high-level, concise viral marketing strategy. Provide a catchy, powerful title, a one-paragraph persuasive summary, and 3-5 clear, actionable strategic steps, all in ARABIC.`,
      config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.OBJECT, properties: {title: {type: Type.STRING}, summary: {type: Type.STRING}, steps: {type: Type.ARRAY, items: {type: Type.STRING}}}, required: ["title", "summary", "steps"]}},
    });

    const week1Plan: DetailedPost[] = JSON.parse(week1Response.text);
    const futureWeeksPlan = JSON.parse(futureWeeksResponse.text);
    const strategy = JSON.parse(strategyResponse.text);

    const imagePromises = week1Plan.map((post) =>
      aiInstance.models.generateImages({
        model: imageModel,
        prompt: post.visualPrompt,
        config: {numberOfImages: 1, outputMimeType: "image/png"},
      }).catch((e) => {
        console.error(`Image generation failed for prompt: "${post.visualPrompt}"`, e);
        return null;
      })
    );

    const imageResults = await Promise.all(imagePromises);

    const week1PlanWithImages = week1Plan.map((post, index) => {
      const result = imageResults[index];
      if (result && result.generatedImages[0]?.image.imageBytes) {
        return {
          ...post,
          generatedImage: `data:image/png;base64,${result.generatedImages[0].image.imageBytes}`,
        };
      }
      return post;
    });

    const prescription: Prescription = {
      strategy,
      week1Plan: week1PlanWithImages,
      futureWeeksPlan,
    };

    return res.status(200).json(prescription);
  } catch (error) {
    console.error("Error generating prescription:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل إنشاء الروشتة: ${errorMessage}`});
  }
});

app.post("/ai/generateDetailedWeekPlan", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { consultationData, posts }: { consultationData: ConsultationData; posts: SimplePost[] } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Business Profile: ${consultationData.business.name} - ${consultationData.business.description}. Based on these simple ideas: ${JSON.stringify(posts)}. For each idea, generate a detailed post: powerful ARABIC caption, ARABIC hashtags, and a detailed ENGLISH visual prompt.`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { day: { type: Type.STRING }, platform: { type: Type.STRING }, postType: { type: Type.STRING }, caption: { type: Type.STRING }, hashtags: { type: Type.STRING }, visualPrompt: { type: Type.STRING } }, required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"] } } },
        });
        const detailedPosts = JSON.parse(response.text);
        return res.status(200).json(detailedPosts);
    } catch (error) {
        console.error("Error in generateDetailedWeekPlan:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل إنشاء خطة الأسبوع: ${errorMessage}` });
    }
});

app.post("/ai/generateCaptionVariations", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { originalCaption, businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Business context: ${businessContext}. Original caption: "${originalCaption}". Generate 3 distinct, powerful alternative captions in ARABIC. They should vary in tone (e.g., one professional, one witty, one direct).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { variations: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
        });
        return res.status(200).json(JSON.parse(response.text));
    } catch (error) {
        console.error("Error generating caption variations:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل إنشاء الكابشن: ${errorMessage}` });
    }
});

app.post("/ai/elaborateOnStrategyStep", async (req, res) => {
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
        console.error("Error elaborating on strategy step:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل شرح الخطوة: ${errorMessage}` });
    }
});

app.post("/ai/generateAnalyticsData", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `For a business like this: ${businessContext}, generate realistic but MOCK social media analytics data for a dashboard. Provide follower growth (value, trend), engagement rate (value, trend), reach (value, trend), and weekly performance (an array of 7 numbers from 0-100 for Sun-Sat).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { followerGrowth: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, engagementRate: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.NUMBER } } }, reach: { type: Type.OBJECT, properties: { value: { type: Type.INTEGER }, trend: { type: Type.NUMBER } } }, weeklyPerformance: { type: Type.ARRAY, items: { type: Type.INTEGER } } } } },
        });
        return res.status(200).json(JSON.parse(response.text));
    } catch (error) {
        console.error("Error generating analytics data:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل إنشاء التحليلات: ${errorMessage}` });
    }
});

app.post("/ai/editImageWithPrompt", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { base64ImageData, mimeType, prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: imageEditModel,
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                return res.status(200).json({ imageUrl });
            }
        }
        throw new Error("AI did not return an image.");
    } catch (error) {
        console.error("Error editing image:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل تعديل الصورة: ${errorMessage}` });
    }
});

app.post("/ai/enhanceVisualPrompt", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Enhance this visual prompt for an AI image generator to be more artistic, detailed, and professional. Keep the core concept but add cinematic and stylistic elements. Your response must ONLY be the enhanced prompt in ENGLISH. Original prompt: "${prompt}"`,
        });
        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error("Error enhancing prompt:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل تحسين الوصف: ${errorMessage}` });
    }
});

app.get("/ai/getTrendingTopics", async (_req, res) => {
    try {
        const aiInstance = getAi();
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: "What are the top 3 trending topics in Egypt right now across different categories (e.g., News, Entertainment, Technology)? For each category, list the main topic and 2-3 related sub-points. Format the response in ARABIC using markdown with '###' for categories.",
            config: { tools: [{ googleSearch: {} }] },
        });
        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error("Error getting trending topics:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل جلب الترندات: ${errorMessage}` });
    }
});

app.post("/ai/generateImage", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { prompt } = req.body;
        const response = await aiInstance.models.generateImages({
            model: imageModel,
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/png' },
        });
        const imageBase64 = response.generatedImages[0].image.imageBytes;
        return res.status(200).json({ imageBase64: `data:image/png;base64,${imageBase64}` });
    } catch (error) {
        console.error("Error generating image:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل إنشاء الصورة: ${errorMessage}` });
    }
});

app.post("/ai/generateVideo", async (req, res) => {
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
        console.error("Error starting video generation:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل بدء إنشاء الفيديو: ${errorMessage}` });
    }
});

app.post("/ai/getVideoOperationStatus", async (req, res) => {
    try {
        const aiInstance = getAi();
        const { operation } = req.body;
        const status = await aiInstance.operations.getVideosOperation({ operation });
        return res.status(200).json(status);
    } catch (error) {
        console.error("Error checking video status:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({ message: `فشل التحقق من حالة الفيديو: ${errorMessage}` });
    }
});

app.get("/ai/getVideo", async (req, res) => {
    const videoUri = req.query.uri as string;
    if (!videoUri) {
        return res.status(400).send("Video URI is required.");
    }
    try {
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
    } catch (error) {
        console.error("Error proxying video download:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        res.status(500).send(`Failed to download video: ${errorMessage}`);
    }
});


// --- EXPORT THE API ---
export const api = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 300,
    secrets: [geminiApiKey],
    cpu: 2,
  },
  app,
);