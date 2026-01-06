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
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error("API Key Missing: Please ensure the environment is configured correctly.");
      }

      // Create a new GoogleGenAI instance right before making an API call to ensure current key usage
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
        ...(seed !== undefined ? { seed: seed } : {}),
      };

      // Ensure googleSearch tool is correctly named and only used with Pro model
      if (model === ModelType.PRO) {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config,
      });

      if (!response.candidates?.[0]) {
        throw new Error('Generation failed: The server returned no results.');
      }

      const candidate = response.candidates[0];
      
      // Iterate through parts to find the image, as it might not be the first part
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      if (candidate.finishReason === 'SAFETY') {
        throw new Error("Generation stopped by safety filters. Try changing your description.");
      } else if (candidate.finishReason === 'STOP' && !candidate.content.parts.some(p => p.inlineData)) {
        throw new Error("Generation stopped unexpectedly. Please try again.");
      }

      throw new Error(`Error: ${candidate.finishReason || 'Unknown issue'}`);
    });
  }
}

export const geminiService = new GeminiService();