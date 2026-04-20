
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
    private client: GoogleGenAI;

    constructor(apiKey: string) {
        if (!apiKey) {
            throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY");
        }
        this.client = new GoogleGenAI({ apiKey });
    }

    async generateContent(modelId: string, messages: any[], stream: boolean = false) {
        // Adjust model ID if necessary (remove prefix if present in UI but not in SDK)
        const cleanModelId = modelId.replace(/^gemini-/, "");

        // Use a default Gemini model if the passed modelId is generic "gemini"
        const targetModel = cleanModelId === "gemini" || cleanModelId === "" ? "gemini-1.5-flash" : cleanModelId;

        const model = this.client.getGenerativeModel({ model: targetModel });

        const contents = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
        }));

        if (stream) {
            return model.generateContentStream({ contents });
        } else {
            return model.generateContent({ contents });
        }
    }
}
