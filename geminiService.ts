import { GoogleGenAI, Type } from "@google/genai";
import { Source, TranslatorResponse } from './types';

// strictly using gemini-2.5-flash as requested
const MODEL = 'gemini-2.5-flash';

function getAi() {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");
  return new GoogleGenAI({ apiKey });
}

async function* streamResponse(
  prompt: string,
  systemInstruction: string,
  useSearch: boolean = false
): AsyncGenerator<{ text: string, sources: Source[] }> {
  const ai = getAi();
  try {
    const result = await ai.models.generateContentStream({
      model: MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        tools: useSearch ? [{ googleSearch: {} }] : undefined,
      },
    });

    for await (const chunk of result) {
      const text = chunk.text || "";
      const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
      let sources: Source[] = [];
      if (groundingMetadata?.groundingChunks) {
        sources = groundingMetadata.groundingChunks
          .filter((c: any) => c.web && c.web.uri)
          .map((c: any) => ({ uri: c.web.uri, title: c.web.title || "Source" }));
      }
      yield { text, sources };
    }
  } catch (e: any) {
    yield { text: `Error: ${e.message || "Failed to connect to AI"}`, sources: [] };
  }
}

export async function* streamQa(prompt: string, subject: string, lang: string) {
  const sys = `You are SigNify AI, an expert tutor for Class 10 Sindh Board students. 
  Subject: ${subject}. Language: ${lang}. 
  Focus strictly on the Sindh Textbook Board curriculum (Jamshoro). 
  Provide accurate, teacher-like responses with markdown formatting.`;
  yield* streamResponse(prompt, sys, true);
}

export async function* streamBooks(query: string, subject: string, lang: string) {
  const sys = `You are the Sindh Board Textbook Assistant. 
  Provide summaries and solved exercise answers for Class 10 ${subject}. 
  Language: ${lang}. Focus on official Jamshoro textbook content only.`;
  yield* streamResponse(query, sys, true);
}

export async function* streamGrammar(prompt: string, lang: string) {
  const sys = `You are a Grammar Expert for Sindh Board Class 10. 
  Explain rules for English, Urdu, or Sindhi grammar as requested. 
  Use tables and clear examples in your response.`;
  yield* streamResponse(prompt, sys);
}

export async function getTranslation(text: string, targetLang: string): Promise<TranslatorResponse> {
  const ai = getAi();
  const schema = {
    type: Type.OBJECT,
    properties: {
      mainTranslation: { type: Type.STRING },
      explanation: { type: Type.STRING },
      wordByWord: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            original: { type: Type.STRING },
            translation: { type: Type.STRING }
          },
          required: ["original", "translation"]
        }
      }
    },
    required: ["mainTranslation", "explanation", "wordByWord"]
  };

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Translate to ${targetLang}: "${text}"`,
    config: {
      systemInstruction: "You are an educational translator for Class 10 students. Return JSON only.",
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  return JSON.parse(response.text.trim());
}