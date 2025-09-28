// functions/src/index.ts
import {onRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import {GoogleGenAI, Type, Modality, GenerateVideosOperation} from "@google/genai";
import {
  ConsultationData,
  DetailedPost,
  Prescription,
  SimplePost,
  AnalyticsData,
} from "./types";
import { Buffer } from "buffer";

// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();
const app = express();
// FIX: Moved middleware to the apiRouter to avoid type conflicts with onRequest.
const apiRouter = express.Router();
apiRouter.use(cors({origin: true}));
apiRouter.use(express.json({limit: "10mb"}));


const geminiApiKey = defineSecret("API_KEY");

// --- LAZY AI INITIALIZATION (async safe) ---
let ai: GoogleGenAI | null = null;
const getAi = async (): Promise<GoogleGenAI> => {
  if (!ai) {
    const apiKey = await geminiApiKey.value();
    if (!apiKey) {
      throw new Error("Gemini API key secret is not available. Ensure the secret is set and the function has permissions to access it.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const textModel = "gemini-2.5-flash";
const imageModel = "imagen-4.0-generate-001";
const videoModel = "veo-2.0-generate-001";
const imageEditModel = "gemini-2.5-flash-image-preview";

// --- SAFETY: ensure fetch exists in this runtime (Firebase Functions Node 18+ has global fetch)
const ensureFetch = async () => {
  if (typeof globalThis.fetch === 'undefined') {
    // eslint-disable-next-line no-console
    console.warn('global fetch is not available; trying to dynamically import node-fetch');
    try {
      // @ts-ignore
      const mod = await import('node-fetch');
      // @ts-ignore
      globalThis.fetch = mod.default || mod;
    } catch (e) {
      console.error('Failed to import node-fetch dynamically. Video proxy endpoints may fail.', e);
    }
  }
};

ensureFetch();

// --- API: AUTH ENDPOINTS ---
apiRouter.post("/auth/login", async (req, res) => {
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
    const client = clientDoc.data() as any;
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
apiRouter.get("/clients", async (_req, res) => {
  try {
    const snapshot = await db.collection("clients").get();
    const clients = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    clients.sort((a: any, b: any) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });
    return res.status(200).json(clients);
  } catch (error) {
    console.error("Error getting clients:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `لم نتمكن من جلب العملاء: ${errorMessage}`});
  }
});

apiRouter.get("/clients/:id", async (req, res) => {
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

apiRouter.post("/clients", async (req, res) => {
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
    } as any;
    const docRef = await db.collection("clients").add(newClient);
    await docRef.update({id: docRef.id});
    return res.status(201).json({id: docRef.id, ...newClient});
  } catch (error) {
    console.error("Error creating client:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل إنشاء العميل: ${errorMessage}`});
  }
});

apiRouter.put("/clients/:id", async (req, res) => {
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

apiRouter.post("/clients/:id/activate", async (req, res) => {
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

apiRouter.post("/ai/generatePrescription", async (req, res) => {
  try {
    const aiInstance = await getAi();
    const {consultationData}: {consultationData: ConsultationData} = req.body;

    const businessContext = `
        - Business Name: ${consultationData.business.name}
        - Field: ${consultationData.business.field}
        - Description: ${consultationData.business.description}
        - Target Audience: ${consultationData.audience.description}
        - Goals: ${Object.entries(consultationData.goals).filter(([, v]) => v).map(([k]) => k).join(", ")}
    `;

    // FIX: Refactored Promise.all to use an intermediate variable to avoid a TypeScript scope/inference issue.
    const responses = await Promise.all([
      aiInstance.models.generateContent({
        model: textModel,
        contents: `Based on the same business profile:\n${businessContext}\nCreate a high-level, concise viral marketing strategy. Provide a catchy, powerful title, a one-paragraph persuasive summary, and 3-5 clear, actionable strategic steps, all in ARABIC.`,
        config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.OBJECT, properties: {title: {type: Type.STRING}, summary: {type: Type.STRING}, steps: {type: Type.ARRAY, items: {type: Type.STRING}}}, required: ["title", "summary", "steps"]}},
      }),
      aiInstance.models.generateContent({
        model: textModel,
        contents: `Based on this business profile:\n${businessContext}\nGenerate a detailed social media plan for the FIRST WEEK ONLY. Create exactly 7 posts (Sunday to Saturday). For each, provide: A powerful ARABIC caption with a strong hook and CTA. Relevant ARABIC hashtags. A detailed, artistic visual prompt in ENGLISH with NO spelling mistakes. The post's platform and type.`,
        config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, postType: {type: Type.STRING}, caption: {type: Type.STRING}, hashtags: {type: Type.STRING}, visualPrompt: {type: Type.STRING}}, required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"]}}},
      }),
      aiInstance.models.generateContent({
        model: textModel,
        contents: `Based on the same business profile:\n${businessContext}\nGenerate a summary and simple post ideas for the next three weeks (Week 2, 3, 4). For each week, provide a one-sentence strategic summary and 3-4 simple, creative post ideas (day, platform, idea) in ARABIC.`,
        config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json", responseSchema: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {week: {type: Type.INTEGER}, summary: {type: Type.STRING}, posts: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, idea: {type: Type.STRING}}, required: ["day", "platform", "idea"]}}}}, required: ["week", "summary", "posts"]}}},
      }),
    ]);

    const strategyResponse = responses[0];
    const week1Response = responses[1];
    const futureWeeksResponse = responses[2];

    if (!strategyResponse || !strategyResponse.text) throw new Error("AI failed to generate a marketing strategy.");
    const strategy = JSON.parse(strategyResponse.text);

    if (!week1Response || !week1Response.text) throw new Error("AI failed to generate the week 1 content plan.");
    const week1Plan: DetailedPost[] = JSON.parse(week1Response.text);

    if (!futureWeeksResponse || !futureWeeksResponse.text) throw new Error("AI failed to generate future week ideas.");
    const futureWeeksPlan = JSON.parse(futureWeeksResponse.text);

    const imagePromises = week1Plan.map((post) =>
      aiInstance.models.generateImages({
        model: imageModel,
        prompt: post.visualPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1",
        },
      }).catch((err) => {
        console.error(`Image generation failed for prompt "${post.visualPrompt}":`, err);
        return null;
      })
    );
    const imageGenerationResults = await Promise.all(imagePromises);

    imageGenerationResults.forEach((result, index) => {
      if (result && result.generatedImages && result.generatedImages.length > 0) {
        const base64ImageBytes = result.generatedImages[0].image.imageBytes;
        week1Plan[index].generatedImage = `data:image/jpeg;base64,${base64ImageBytes}`;
      } else {
        week1Plan[index].generatedImage = "";
      }
    });

    const prescription: Prescription = {
      strategy,
      week1Plan,
      futureWeeksPlan,
    };

    return res.status(200).json(prescription);
  } catch (error) {
    console.error("Error in /ai/generatePrescription:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `فشل إنشاء الروشتة: ${errorMessage}`});
  }
});


apiRouter.post("/ai/generateDetailedWeekPlan", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { consultationData, posts }: { consultationData: ConsultationData; posts: SimplePost[] } = req.body;
        const businessContext = `Business: ${consultationData.business.name} in ${consultationData.business.field}. Audience: ${consultationData.audience.description}.`;
        const postIdeas = posts.map((p) => `- ${p.day} on ${p.platform}: ${p.idea}`).join("\n");

        const planResponse = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Based on:\n${businessContext}\nAnd these ideas:\n${postIdeas}\nGenerate a detailed plan. For each idea, provide: A powerful ARABIC caption with a hook and CTA. Relevant ARABIC hashtags. A detailed, artistic visual prompt in ENGLISH. The post's platform and type.`,
            config: {
                systemInstruction: DR_BUSINESS_PERSONA_PROMPT,
                responseMimeType: "application/json",
                responseSchema: {type: Type.ARRAY, items: {type: Type.OBJECT, properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, postType: {type: Type.STRING}, caption: {type: Type.STRING}, hashtags: {type: Type.STRING}, visualPrompt: {type: Type.STRING}}, required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"]}},
            },
        });

        if (!planResponse || !planResponse.text) {
             throw new Error("AI failed to generate detailed week plan.");
        }
        const detailedPlan: DetailedPost[] = JSON.parse(planResponse.text);

        const imagePromises = detailedPlan.map((post) =>
          aiInstance.models.generateImages({
            model: imageModel,
            prompt: post.visualPrompt,
            config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "1:1" },
          }).catch((err) => {
            console.error(`Image generation failed for prompt "${post.visualPrompt}":`, err);
            return null;
          })
        );
        const imageResults = await Promise.all(imagePromises);
        imageResults.forEach((result, index) => {
            if (result && result.generatedImages && result.generatedImages.length > 0) {
                const base64ImageBytes = result.generatedImages[0].image.imageBytes;
                detailedPlan[index].generatedImage = `data:image/jpeg;base64,${base64ImageBytes}`;
            } else {
                 detailedPlan[index].generatedImage = "";
            }
        });

        return res.status(200).json(detailedPlan);
    } catch (error) {
        console.error("Error in /ai/generateDetailedWeekPlan:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
        return res.status(500).json({message: `Failed to generate plan: ${errorMessage}`});
    }
});

apiRouter.post("/ai/generateImage", async (req, res) => {
  try {
    const aiInstance = await getAi();
    const {prompt} = req.body;
    const response = await aiInstance.models.generateImages({
        model: imageModel,
        prompt: prompt,
        config: { numberOfImages: 1, outputMimeType: "image/jpeg", aspectRatio: "1:1" },
    });
    const base64ImageBytes = response?.generatedImages?.[0]?.image?.imageBytes;
    if (!base64ImageBytes) throw new Error('No image returned from model');
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    return res.status(200).json({imageBase64: imageUrl});
  } catch (error) {
    console.error("Error in /ai/generateImage:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown server error occurred.";
    return res.status(500).json({message: `Failed to generate image: ${errorMessage}`});
  }
});

apiRouter.post("/ai/generateCaptionVariations", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { originalCaption, businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Given the context: ${businessContext}\nAnd the original caption: "${originalCaption}"\nGenerate 3 alternative ARABIC captions. Each should have a different tone (e.g., more professional, more humorous, more direct).`,
            config: {
                systemInstruction: DR_BUSINESS_PERSONA_PROMPT,
                responseMimeType: "application/json",
                responseSchema: {type: Type.OBJECT, properties: {variations: {type: Type.ARRAY, items: {type: Type.STRING}}}, required: ["variations"]},
            },
        });
        if (!response || !response.text) throw new Error("AI returned empty response.");
        return res.status(200).json(JSON.parse(response.text));
    } catch (error) {
        console.error("Error in /ai/generateCaptionVariations:", error);
        return res.status(500).json({ message: "Failed to generate caption variations." });
    }
});

apiRouter.post("/ai/elaborateOnStrategyStep", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { businessContext, step } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `For the business context: ${businessContext}\nElaborate on this strategic step: "${step}". Provide a detailed, actionable explanation in ARABIC, using markdown for formatting (like bullet points and bold text).`,
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT },
        });
        if (!response || !response.text) throw new Error("AI returned empty response.");
        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error("Error in /ai/elaborateOnStrategyStep:", error);
        return res.status(500).json({ message: "Failed to elaborate on step." });
    }
});

apiRouter.post("/ai/generateAnalyticsData", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { businessContext } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Generate plausible but MOCK social media analytics data for a business like this: ${businessContext}. Provide numbers for follower growth (value and trend %), engagement rate (value and trend %), and total reach (value and trend %). Also provide an array of 7 numbers (0-100) representing weekly performance from Sunday to Saturday.`,
            config: {
                systemInstruction: "You are a data generation bot. ONLY output JSON.",
                responseMimeType: "application/json",
                responseSchema: {type: Type.OBJECT, properties: {followerGrowth: {type: Type.OBJECT, properties: {value: {type: Type.INTEGER}, trend: {type: Type.NUMBER}}}, engagementRate: {type: Type.OBJECT, properties: {value: {type: Type.NUMBER}, trend: {type: Type.NUMBER}}}, reach: {type: Type.OBJECT, properties: {value: {type: Type.INTEGER}, trend: {type: Type.NUMBER}}}, weeklyPerformance: {type: Type.ARRAY, items: {type: Type.INTEGER}}}, required: ["followerGrowth", "engagementRate", "reach", "weeklyPerformance"]},
            },
        });
        if (!response || !response.text) throw new Error("AI returned empty response.");
        const analyticsData: AnalyticsData = JSON.parse(response.text);
        return res.status(200).json(analyticsData);
    } catch (error) {
        console.error("Error in /ai/generateAnalyticsData:", error);
        return res.status(500).json({ message: "Failed to generate analytics data." });
    }
});

apiRouter.post("/ai/editImageWithPrompt", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { base64ImageData, mimeType, prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: imageEditModel,
            contents: { parts: [{ inlineData: { data: base64ImageData, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const candidates = response?.candidates;
        if (!candidates || candidates.length === 0) throw new Error("No candidates returned from image edit model.");

        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                return res.status(200).json({ imageUrl });
            }
        }
        throw new Error("No image part found in the response.");
    } catch (error) {
        console.error("Error in /ai/editImageWithPrompt:", error);
        return res.status(500).json({ message: "Failed to edit image." });
    }
});

apiRouter.post("/ai/enhanceVisualPrompt", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { prompt } = req.body;
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: `Enhance this visual prompt to be more artistic, detailed, and evocative for an image generation AI. Return only the enhanced prompt in ENGLISH:\n"${prompt}"`,
            config: { systemInstruction: "You are a creative prompt engineer." },
        });
        if (!response || !response.text) throw new Error("AI returned empty response.");
        return res.status(200).json({ text: response.text });
    } catch (error) {
        console.error("Error in /ai/enhanceVisualPrompt:", error);
        return res.status(500).json({ message: "Failed to enhance prompt." });
    }
});

apiRouter.get("/ai/getTrendingTopics", async (_req, res) => {
    try {
        const aiInstance = await getAi();
        const response = await aiInstance.models.generateContent({
            model: textModel,
            contents: "What are the top 3 trending categories on social media in Egypt today? For each category, list 3-4 specific trending topics as bullet points. Use ARABIC, markdown format with '###' for category titles.",
            config: { systemInstruction: DR_BUSINESS_PERSONA_PROMPT },
        });

        if (response && typeof response.text === "string" && response.text.trim().length > 0) {
            return res.status(200).json({ text: response.text });
        }
        
        console.warn("Gemini API returned an invalid or empty response for trending topics.");
        return res.status(200).json({ text: "### تعذر تحديد الترندات\n- حدث خطأ أثناء جلب أحدث المواضيع الرائجة. يرجى المحاولة مرة أخرى." });
    } catch (error) {
        console.error("Error in /ai/getTrendingTopics:", error);
        return res.status(500).json({ text: "### خطأ فني\n- لم نتمكن من الاتصال بخادم الترندات. فريقنا يعمل على إصلاح المشكلة." });
    }
});


apiRouter.post("/ai/generateVideo", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { prompt, image } = req.body;
        const operation: GenerateVideosOperation = await aiInstance.models.generateVideos({
            model: videoModel,
            prompt,
            image: image ? { imageBytes: image.imageBytes, mimeType: image.mimeType } : undefined,
            config: { numberOfVideos: 1 },
        });
        return res.status(200).json(operation);
    } catch (error) {
        console.error("Error starting video generation:", error);
        return res.status(500).json({ message: "Failed to start video generation." });
    }
});

apiRouter.post("/ai/getVideoOperationStatus", async (req, res) => {
    try {
        const aiInstance = await getAi();
        const { operation: op } = req.body;
        const operation: GenerateVideosOperation = await aiInstance.operations.getVideosOperation({ operation: op });
        return res.status(200).json(operation);
    } catch (error) {
        console.error("Error checking video status:", error);
        return res.status(500).json({ message: "Failed to check video status." });
    }
});

apiRouter.get("/ai/getVideo", async (req, res) => {
    const { uri } = req.query;
    if (typeof uri !== 'string') {
        return res.status(400).send('Missing URI');
    }
    try {
        const apiKey = await geminiApiKey.value();
        const videoUrl = `${uri}&key=${apiKey}`;
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const videoBuffer = Buffer.from(arrayBuffer);
        res.setHeader('Content-Type', 'video/mp4');
        res.send(videoBuffer);
    } catch (error) {
        console.error('Error proxying video:', error);
        res.status(500).send('Error fetching video');
    }
});

app.use("/api", apiRouter);

export const api = onRequest({secrets: ["API_KEY"]}, app as any);