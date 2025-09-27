// functions/src/index.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import {GoogleGenAI, Type, Modality} from "@google/genai";
import {
  ConsultationData,
  DetailedPost,
  Prescription,
  SimplePost,
} from "../../src/types"; // Import types from frontend

// --- INITIALIZATION ---
admin.initializeApp();
const db = admin.firestore();
const app = express();
app.use(cors({origin: true}));

// Initialize Gemini AI securely
let ai: GoogleGenAI | null = null;
try {
  // Use a try-catch block for local testing where config might not be available
  const GEMINI_API_KEY = functions.config().gemini.key;
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not found in Firebase config.");
  }
  ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});
} catch (e) {
  console.error(
    "FATAL: Could not initialize GoogleGenAI. Make sure you've set the Gemini API key in your Firebase config by running: firebase functions:config:set gemini.key='YOUR_API_KEY'",
    e,
  );
}
const textModel = "gemini-2.5-flash";

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
    return res.status(500).json({message: "Server error during login."});
  }
});


// --- API: CLIENTS (CRUD) ENDPOINTS ---

// GET all clients
app.get("/clients", async (_req, res) => {
  try {
    const snapshot = await db.collection("clients").get();
    const clients = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    clients.sort((a: any, b: any) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1));
    return res.status(200).json(clients);
  } catch (error) {
    console.error("Error getting clients:", error);
    return res.status(500).json({message: "Could not fetch clients."});
  }
});

// GET a single client by ID
app.get("/clients/:id", async (req, res) => {
  try {
    const doc = await db.collection("clients").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({message: "Client not found."});
    }
    return res.status(200).json({id: doc.id, ...doc.data()});
  } catch (error) {
    console.error("Error getting client:", error);
    return res.status(500).json({message: "Could not fetch client."});
  }
});

// CREATE a new client
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
    return res.status(500).json({message: "Could not create client."});
  }
});

// UPDATE a client
app.put("/clients/:id", async (req, res) => {
  try {
    const clientRef = db.collection("clients").doc(req.params.id);
    const {id, ...clientData} = req.body;
    await clientRef.set(clientData, {merge: true});
    return res.status(200).json({id: req.params.id, ...clientData});
  } catch (error) {
    console.error("Error updating client:", error);
    return res.status(500).json({message: "Could not update client."});
  }
});

// ACTIVATE a client
app.post("/clients/:id/activate", async (req, res) => {
  try {
    const clientRef = db.collection("clients").doc(req.params.id);
    await clientRef.update({status: "active"});
    return res.status(200).json({success: true, message: "Client activated."});
  } catch (error) {
    console.error("Error activating client:", error);
    return res.status(500).json({message: "Could not activate client."});
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
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {consultationData}: {consultationData: ConsultationData} = req.body;

  const businessContext = `
      - Business Name: ${consultationData.business.name}
      - Field: ${consultationData.business.field}
      - Description: ${consultationData.business.description}
      - Target Audience: ${consultationData.audience.description}
      - Goals: ${Object.entries(consultationData.goals).filter(([, v]) => v).map(([k]) => k).join(", ")}
  `;

  try {
    const [week1Response, futureWeeksResponse, strategyResponse] = await Promise.all([
      ai.models.generateContent({
        model: textModel,
        contents: `Based on this business profile:\n${businessContext}\nGenerate a detailed social media plan for the FIRST WEEK ONLY. Create exactly 7 posts (Sunday to Saturday). For each, provide: A powerful ARABIC caption with a strong hook and CTA. Relevant ARABIC hashtags. A detailed, artistic visual prompt in ENGLISH with NO spelling mistakes. The post's platform and type.`,
        config: {
          systemInstruction: DR_BUSINESS_PERSONA_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: {type: Type.STRING},
                platform: {type: Type.STRING},
                postType: {type: Type.STRING},
                caption: {type: Type.STRING},
                hashtags: {type: Type.STRING},
                visualPrompt: {type: Type.STRING},
              },
              required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"],
            },
          },
        },
      }),
      ai.models.generateContent({
        model: textModel,
        contents: `Based on the same business profile:\n${businessContext}\nGenerate a summary and simple post ideas for the next three weeks (Week 2, 3, 4). For each week, provide a one-sentence strategic summary and 3-4 simple, creative post ideas (day, platform, idea) in ARABIC.`,
        config: {
          systemInstruction: DR_BUSINESS_PERSONA_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                week: {type: Type.INTEGER},
                summary: {type: Type.STRING},
                posts: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      day: {type: Type.STRING},
                      platform: {type: Type.STRING},
                      idea: {type: Type.STRING},
                    },
                    required: ["day", "platform", "idea"],
                  },
                },
              },
              required: ["week", "summary", "posts"],
            },
          },
        },
      }),
      ai.models.generateContent({
        model: textModel,
        contents: `Based on the same business profile:\n${businessContext}\nCreate a high-level, concise viral marketing strategy. Provide a catchy, powerful title, a one-paragraph persuasive summary, and 3-5 clear, actionable strategic steps, all in ARABIC.`,
        config: {
          systemInstruction: DR_BUSINESS_PERSONA_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {type: Type.STRING},
              summary: {type: Type.STRING},
              steps: {type: Type.ARRAY, items: {type: Type.STRING}},
            },
            required: ["title", "summary", "steps"],
          },
        },
      }),
    ]);

    const week1Plan: DetailedPost[] = JSON.parse(week1Response.text);
    const finalPrescription: Prescription = {
      strategy: JSON.parse(strategyResponse.text),
      week1Plan: week1Plan,
      futureWeeksPlan: JSON.parse(futureWeeksResponse.text),
    };
    return res.status(200).json(finalPrescription);
  } catch (error) {
    console.error("Error in /ai/generatePrescription:", error);
    return res.status(500).json({message: "Failed to generate prescription."});
  }
});

app.post("/ai/generateDetailedWeekPlan", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {consultationData, posts}: {consultationData: ConsultationData, posts: SimplePost[]} = req.body;
  
  const prompt = `
      Business Profile:\n- Name: ${consultationData.business.name}\n- Field: ${consultationData.business.field}\n- Audience: ${consultationData.audience.description}\n
      Simple Post Ideas for the week:\n${posts.map((p) => `- ${p.day} on ${p.platform}: ${p.idea}`).join("\n")}\n
      Based STRICTLY on the business profile and the ideas above, expand them into a detailed social media plan.
      For each idea, generate: 1. An ARABIC caption with a strong hook and clear CTA. 2. Relevant ARABIC hashtags. 3. A detailed, artistic visual prompt in ENGLISH with NO spelling mistakes. 4. A suitable 'postType'.
      Return the response as a JSON array.`;
   try {
      const response = await ai.models.generateContent({
          model: textModel, contents: prompt,
          config: {
              systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json",
              responseSchema: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {day: {type: Type.STRING}, platform: {type: Type.STRING}, postType: {type: Type.STRING}, caption: {type: Type.STRING}, hashtags: {type: Type.STRING}, visualPrompt: {type: Type.STRING}},
                      required: ["day", "platform", "postType", "caption", "hashtags", "visualPrompt"],
                  },
              },
          },
      });
      const detailedPosts: DetailedPost[] = JSON.parse(response.text);
      return res.status(200).json(detailedPosts);
  } catch (error) {
      console.error("Error in /ai/generateDetailedWeekPlan:", error);
      return res.status(500).json({message: "Failed to generate week plan."});
  }
});

app.post("/ai/generateCaptionVariations", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {originalCaption, businessContext} = req.body;
  try {
      const prompt = `Business Context: ${businessContext}\nOriginal Caption: "${originalCaption}"\n\nGenerate 3 alternative, more engaging captions in ARABIC based on the original.`;
      const response = await ai.models.generateContent({
          model: textModel, contents: prompt,
          config: {
              systemInstruction: DR_BUSINESS_PERSONA_PROMPT, responseMimeType: "application/json",
              responseSchema: {type: Type.OBJECT, properties: {variations: {type: Type.ARRAY, items: {type: Type.STRING}}}, required: ["variations"]},
          },
      });
      return res.status(200).json(JSON.parse(response.text));
  } catch (error) {
      console.error("Error in /ai/generateCaptionVariations:", error);
      return res.status(500).json({message: "Failed to generate variations."});
  }
});

app.post("/ai/elaborateOnStrategyStep", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {businessContext, step} = req.body;
  try {
      const prompt = `Business Context: ${businessContext}\n\nStrategic Step: "${step}"\n\nElaborate on this strategic step in ARABIC. Provide a detailed, actionable explanation with examples, formatted in markdown. Use bolding for emphasis.`;
      const response = await ai.models.generateContent({model: textModel, contents: prompt, config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT}});
      return res.status(200).json({text: response.text});
  } catch (error) {
      console.error("Error in /ai/elaborateOnStrategyStep:", error);
      return res.status(500).json({message: "Failed to elaborate on step."});
  }
});

app.post("/ai/generateAnalyticsData", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {businessContext} = req.body;
  try {
      const prompt = `Business Context: ${businessContext}\n\nGenerate realistic but mock analytics data for a social media dashboard. Provide numbers for follower growth (value and trend %), engagement rate (value and trend %), and reach (value and trend %). Also provide 7 numbers for weekly performance (Sunday to Saturday) as percentages from 0 to 100.`;
      const response = await ai.models.generateContent({
          model: textModel, contents: prompt,
          config: {
              systemInstruction: "You are an analytics data generator. Only return a JSON object, no other text.", responseMimeType: "application/json",
              responseSchema: {type: Type.OBJECT, properties: {followerGrowth: {type: Type.OBJECT, properties: {value: {type: Type.INTEGER}, trend: {type: Type.NUMBER}}, required: ["value", "trend"]}, engagementRate: {type: Type.OBJECT, properties: {value: {type: Type.NUMBER}, trend: {type: Type.NUMBER}}, required: ["value", "trend"]}, reach: {type: Type.OBJECT, properties: {value: {type: Type.INTEGER}, trend: {type: Type.NUMBER}}, required: ["value", "trend"]}, weeklyPerformance: {type: Type.ARRAY, items: {type: Type.NUMBER}}}, required: ["followerGrowth", "engagementRate", "reach", "weeklyPerformance"]},
          },
      });
      return res.status(200).json(JSON.parse(response.text));
  } catch (error) {
      console.error("Error in /ai/generateAnalyticsData:", error);
      return res.status(500).json({message: "Failed to generate analytics data."});
  }
});

app.post("/ai/editImageWithPrompt", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {base64ImageData, mimeType, prompt} = req.body;
  try {
      const imagePart = {inlineData: {data: base64ImageData, mimeType}};
      const textPart = {text: prompt};
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-image-preview", contents: {parts: [imagePart, textPart]},
          config: {responseModalities: [Modality.IMAGE, Modality.TEXT]},
      });
      const imagePartResponse = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (imagePartResponse?.inlineData) {
          const newBase64 = imagePartResponse.inlineData.data;
          const imageUrl = `data:${imagePartResponse.inlineData.mimeType};base64,${newBase64}`;
          return res.status(200).json({imageUrl});
      } else {
          throw new Error("AI did not return an image.");
      }
  } catch (error) {
      console.error("Error in /ai/editImageWithPrompt:", error);
      return res.status(500).json({message: "Failed to edit image."});
  }
});

app.post("/ai/enhanceVisualPrompt", async (req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  const {prompt} = req.body;
  try {
      const enhancePrompt = `You are a creative visual director. Enhance the following user prompt to make it more detailed, artistic, and effective for an AI image generator. Add details about style, lighting, composition, and mood. The output should ONLY be the enhanced prompt text, nothing else. Original prompt: "${prompt}"`;
      const response = await ai.models.generateContent({model: textModel, contents: enhancePrompt, config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT}});
      return res.status(200).json({text: response.text});
  } catch (error) {
      console.error("Error in /ai/enhanceVisualPrompt:", error);
      return res.status(500).json({message: "Failed to enhance prompt."});
  }
});

app.get("/ai/getTrendingTopics", async (_req, res) => {
  if (!ai) return res.status(500).json({message: "AI service not initialized."});
  try {
      const prompt = "What are the top 3 trending marketing topics and social media trends in Egypt right now for small businesses? Present them as a short, engaging markdown list, with each main topic as a level 3 heading (###).";
      const response = await ai.models.generateContent({
          model: textModel, contents: prompt,
          config: {systemInstruction: DR_BUSINESS_PERSONA_PROMPT},
      });
      return res.status(200).json({text: response.text});
  } catch (error) {
      console.error("Error in /ai/getTrendingTopics:", error);
      return res.status(500).json({message: "Failed to fetch trending topics."});
  }
});


// --- EXPORT API ---
// FIX: Cast express app to 'any' to resolve a common type mismatch issue between Express and Firebase Functions v1 SDK.
export const api = functions.https.onRequest(app as any);