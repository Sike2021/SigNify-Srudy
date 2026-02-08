import { GoogleGenAI, Type } from "@google/genai";
import { Source, TranslatorResponse } from './types';

const GEMINI_MODEL = 'gemini-2.5-flash';
let ai: GoogleGenAI;

function getAi() {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
}

async function* streamResponse(
    model: string,
    contents: any,
    config?: any
): AsyncGenerator<{ text: string, sources: Source[] }> {
    const ai = getAi();
    try {
        const result = await ai.models.generateContentStream({ model, contents, config });
        
        for await (const chunk of result) {
            const text = chunk.text;
            const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
            let sources: Source[] = [];
            if (groundingMetadata?.groundingChunks) {
                sources = groundingMetadata.groundingChunks
                    .filter((c: any) => c.web && c.web.uri)
                    .map((c: any) => ({
                        uri: c.web.uri,
                        title: c.web.title || new URL(c.web.uri).hostname,
                    }));
            }
            yield { text, sources };
        }
    } catch (e) {
        console.error("Error streaming from Gemini:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        yield { text: `An error occurred: ${errorMessage}`, sources: [] };
    }
}

export async function* streamQaResponse(prompt: string, subject: string, language: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    // FIX: systemInstruction must be an object with a parts array.
    const systemInstruction = {
        parts: [{ text: `You are Sike’s Tutor Center, an AI tutor for Class X Sindh Board students. Your persona is friendly, teacher-like, and supportive, like the ChatGPT Android app.
Current Subject: ${subject}.
Respond In: ${language}.
Format answers with headings, bold text, and bullet points for clarity. Use short paragraphs. Display responses in chat bubbles. When explaining a long answer, break it into sections.
If the user asks about you, use this info: "This AI tutor is developed by Sikandar Ali Malik (Sike), a private teacher. Contact info is available on the contact page." Only provide contact info if explicitly asked.`}]
    };
    
    yield* streamResponse(
        GEMINI_MODEL,
        prompt,
        {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    );
}

export async function* streamVisualResponse(prompt: string, subject: string, language: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    // FIX: systemInstruction must be an object with a parts array.
    const systemInstruction = {
        parts: [{ text: `You are a Practical Learning Tutor inside Sike’s Tutor Center for Class X Sindh Board students.
Current Subject: ${subject}.
Respond In: ${language}.
Task: When a student asks any question (Physics, Chemistry, Biology, Math), you must:
1. Search the internet for accurate, updated information.
2. Provide a clear step-by-step explanation in simple words.
3. Always include relevant diagrams, models, or pictures (if available) using Markdown images.
4. If the concept has experiments, show how it works.
Important: Always give text + visuals together. Use free educational images/diagrams from the web. If visuals aren’t available, describe them in detail.`}]
    };

    yield* streamResponse(
        GEMINI_MODEL,
        prompt,
        {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    );
}

export async function* streamGrammarResponse(prompt: string, language: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    // FIX: systemInstruction must be an object with a parts array.
    const systemInstruction = {
        parts: [{ text: `You are a Grammar Expert AI Tutor inside Sike's Tutor Center.
Your task is to explain grammar rules, especially tenses, clearly and simply.
Respond In: ${language}.
Use examples and tables (using Markdown) to make the explanation easy to understand for a Class X student. Do not use web search.`}]
    };
    
    yield* streamResponse(
        GEMINI_MODEL,
        prompt,
        { systemInstruction }
    );
}

export const getTranslatorResponse = async (text: string, language: string): Promise<TranslatorResponse> => {
    const ai = getAi();
    // FIX: systemInstruction must be an object with a parts array.
    const systemInstruction = {
        parts: [{ text: `You are an expert linguist and translator. Your task is to translate the given text and provide a word-by-word breakdown.
You MUST respond ONLY with a JSON object that strictly follows this schema. Do not add any other text, just the JSON.`}]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            mainTranslation: {
                type: Type.STRING,
                description: `The full translation of the text into ${language}.`
            },
            wordByWord: {
                type: Type.ARRAY,
                description: "A breakdown of each word or small phrase.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        original: { type: Type.STRING, description: "The word from the original text." },
                        translation: { type: Type.STRING, description: `The translation of that word into ${language}.` }
                    },
                    required: ["original", "translation"]
                }
            }
        },
        required: ["mainTranslation", "wordByWord"]
    };

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `Translate the following text into ${language}: "${text}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as TranslatorResponse;

    } catch (e) {
        console.error("Error getting translation from Gemini:", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Failed to get translation: ${errorMessage}`);
    }
};