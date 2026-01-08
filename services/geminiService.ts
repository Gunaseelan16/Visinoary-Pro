import { GoogleGenAI } from "@google/genai";
import { GenerationParams, ModelType } from "../types";

export class GeminiService {
  private async withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isRateLimit = error?.status === 429 || errorMsg.includes('429');
      
      if (isRateLimit && retries > 0) {
        console.warn(`System busy. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 1.5);
      }
      throw error;
    }
  }

  async generateImage(params: GenerationParams): Promise<string> {
    const { prompt, aspectRatio, model, imageSize, images, seed } = params;

    return this.withRetry(async () => {
      // MANDATORY: Obtain API key exclusively from process.env.API_KEY
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error("API Key Missing: Please ensure a valid API key is selected via the key selection dialog.");
      }

      // MANDATORY: Create a new GoogleGenAI instance right before the call
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [];
      
      if (images && images.length > 0) {
        images.forEach(img => parts.push({ 
          inlineData: { data: img.data, mimeType: img.mimeType } 
        }));
      }
      
      if (prompt.trim()) {
        parts.push({ text: prompt });
      } else if (parts.length > 0) {
        parts.push({ text: "Enhance and generate a high-quality image based on these references." });
      } else {
        throw new Error("Input required: Please provide a description or image.");
      }

      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(model === ModelType.PRO && imageSize ? { imageSize: imageSize } : {}),
        },
        // UNRESTRICTED: Set all safety thresholds to BLOCK_NONE
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
        ],
        ...(seed !== undefined ? { seed: seed } : {}),
      };

      if (model === ModelType.PRO) {
        config.tools = [{ google_search: {} }];
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts.length > 0 ? parts : [{ text: prompt }] },
        config: config,
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error('Generation failed: The server returned no results.');
      }

      // Iterate through parts to find the image part
      const responseParts = candidate.content?.parts;
      if (responseParts) {
        for (const part of responseParts) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new Error("Generation was unexpectedly blocked by a filter. Try rephrasing your prompt.");
      } else if (candidate.finishReason === 'STOP') {
        throw new Error("The model stopped generating before completion. Please try again.");
      }

      throw new Error(`Error: ${candidate.finishReason || 'Unknown issue'}`);
    });
  }
}

export const geminiService = new GeminiService();