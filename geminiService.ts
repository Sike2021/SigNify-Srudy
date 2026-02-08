import { GoogleGenAI, Type } from "@google/genai";
import { Source, TranslatorResponse } from './types';

// Updated to the latest high-performance model
const GEMINI_MODEL = 'gemini-3-flash-preview';

let aiInstance: GoogleGenAI | null = null;

function getAi() {
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return aiInstance;
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
            const text = chunk.text || "";
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
        console.error("Gemini Error:", e);
        const detailedError = e instanceof Error ? e.message : "Connection failed.";
        yield { text: `Error: ${detailedError}. Please check your connection.`, sources: [] };
    }
}

export async function* streamQaResponse(prompt: string, subject: string, language: string, className: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    const systemInstruction = {
        parts: [{ text: `You are an expert AI tutor for Signify Study, developed by Sikandar Ali Malik (Sike).
Context: ${className}, Sindh Text Book Board Jamshoro.
Subject: ${subject}.
Language: ${language}.

Your goal is to provide answers derived STRICTLY from the official Sindh Board curriculum.
1. Use Google Search to find relevant textbook snippets.
2. Structure answers clearly with bold headings and bullet points.
3. Keep the tone friendly and encouraging.
4. If asked about the app, say: "I am Signify AI, developed by Sike to help students of the Sindh Board."`}]
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

export async function* streamLessonResponse(className: string, subject: string, lessonQuery: string, language: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    const systemInstruction = {
        parts: [{ text: `You are a Digital Textbook Assistant.
Task: Retrieve and format lesson content for ${className} ${subject}, Lesson: "${lessonQuery}" from the Sindh Text Book Board.
1. Use Google Search to find the specific chapter or lesson contents.
2. Provide a summary of the lesson.
3. Include key definitions.
4. List solved exercise questions if available.
Respond primarily in ${language}.`}]
    };
    
    const prompt = `Fetch the content for Class ${className}, Subject ${subject}, Lesson: ${lessonQuery} (Sindh Board).`;

    yield* streamResponse(
        GEMINI_MODEL,
        prompt,
        {
            systemInstruction,
            tools: [{ googleSearch: {} }],
        }
    );
}

export async function* streamGrammarResponse(prompt: string, _type: string, language: string, _class: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    const systemInstruction = {
        parts: [{ text: `You are a Grammar Expert AI Tutor.
Task: Explain grammar rules (tenses, parts of speech, syntax) in ${language}.
1. Use Markdown tables to show conjugations or comparisons.
2. Provide at least 5 examples for every rule.
3. Break complex concepts into "Easy to Remember" notes.`}]
    };
    
    yield* streamResponse(
        GEMINI_MODEL,
        prompt,
        { systemInstruction }
    );
}

export const getTranslatorResponse = async (text: string, language: string): Promise<TranslatorResponse> => {
    const ai = getAi();
    const systemInstruction = {
        parts: [{ text: `You are a Master Translator.
Task: Translate the given text into ${language} and provide a linguistic breakdown.
You MUST respond with ONLY a JSON object.`}]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            mainTranslation: { type: Type.STRING, description: `The full translation into ${language}.` },
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
            },
            explanation: { type: Type.STRING, description: "A brief cultural or grammatical note." }
        },
        required: ["mainTranslation", "wordByWord"]
    };

    try {
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: `Translate to ${language}: "${text}"`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        
        return JSON.parse(response.text.trim()) as TranslatorResponse;
    } catch (e) {
        console.error("Translation Error:", e);
        throw new Error("Failed to process translation.");
    }
};