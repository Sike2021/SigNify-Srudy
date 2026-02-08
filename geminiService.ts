import { GoogleGenAI, Type } from "@google/genai";
import { Source, TranslatorResponse } from './types';

// Using gemini-2.5-flash as explicitly requested for broad compatibility
const GEMINI_MODEL = 'gemini-2.5-flash';

let aiInstance: GoogleGenAI | null = null;

function getAi() {
    // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key is missing. Ensure it is set in your environment variables.");
    }
    if (!aiInstance) {
        aiInstance = new GoogleGenAI({ apiKey });
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
        console.error("Gemini stream error:", e);
        yield { text: "Error: Could not connect to the AI tutor. Please check your internet connection or API key status.", sources: [] };
    }
}

export async function* streamQaResponse(prompt: string, subject: string, language: string, className: string): AsyncGenerator<{ text: string, sources: Source[] }> {
    const systemInstruction = {
        parts: [{ text: `You are Signify AI, the premier digital tutor developed by Sikandar Ali Malik (Sike).
Your knowledge base is strictly defined by the Sindh Text Book Board Jamshoro curriculum for ${className}.
Current Subject: ${subject}.
Output Language: ${language}.

Operational Directives:
1. Ground every answer in official Sindh Board standards.
2. Use Google Search to find specific chapter names or lesson contexts if the query relates to specific board syllabus.
3. Structure responses with bold section headings, bullet points, and short, impactful paragraphs.
4. If asked about your origin, state: "I am Signify AI, an academic assistant built by Sikandar Ali Malik (Sike) to empower Sindh Board students."`}]
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
        parts: [{ text: `You are the Digital Librarian for Signify Study.
Task: Retrieve and summarize specific lesson content for ${className} ${subject}, specifically the lesson named: "${lessonQuery}".
1. Search specifically for the contents of the Sindh Text Book Board version of this lesson using Google Search.
2. Provide a 'Lesson Overview', 'Key Definitions', and 'Standard Exercise Solutions'.
3. Respond in ${language}. Use clear, academic tone.`}]
    };
    
    const prompt = `Provide the detailed lesson content and exercise guide for Class ${className}, Subject ${subject}, Lesson: ${lessonQuery} (Sindh Board).`;

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
        parts: [{ text: `You are a Master Grammarian specializing in English, Urdu, and Sindhi.
1. Explain rules (Tenses, Passive Voice, Parts of Speech, Sentence Structure) with extreme clarity.
2. Always provide well-formatted Markdown tables for conjugations or comparison rules.
3. Include exactly 5 varied, practical examples for every rule you explain.
4. Keep the language level suitable for Class ${_class} students.`}]
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
        parts: [{ text: `You are a high-fidelity linguistic engine for educational translation in the Sindh region.
Task: Translate the user's input into ${language}.
Format: You MUST return a JSON object with:
- 'mainTranslation': The fluent, context-aware translation.
- 'wordByWord': An array of objects mapping 'original' to 'translation'.
- 'explanation': A short note on any cultural or grammatical nuances.
Return ONLY valid JSON.`}]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            mainTranslation: { type: Type.STRING },
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
            explanation: { type: Type.STRING }
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
        return JSON.parse(response.text.trim()) as TranslatorResponse;
    } catch (e) {
        console.error("Linguistic processing error:", e);
        throw new Error("Translator failed to parse text.");
    }
};