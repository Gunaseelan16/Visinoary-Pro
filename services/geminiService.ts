
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
      // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
      // It is injected automatically by the runtime environment.
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        throw new Error("API Authentication Failed: No API key found in the environment. Please ensure you have selected a key using the 'High Quality' toggle or the key selection dialog.");
      }

      // Create a new GoogleGenAI instance right before making the API call
      const ai = new GoogleGenAI({ apiKey });
      
      const parts: any[] = [];
      
      // Handle reference images
      if (images && images.length > 0) {
        images.forEach(img => parts.push({ 
          inlineData: { data: img.data, mimeType: img.mimeType } 
        }));
      }
      
      // Handle prompt text
      if (prompt.trim()) {
        parts.push({ text: prompt });
      } else if (parts.length > 0) {
        parts.push({ text: "Please generate a high-quality image based on the provided visual references." });
      } else {
        throw new Error("Input required: Please provide a description or upload an image.");
      }

      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(model === ModelType.PRO && imageSize ? { imageSize: imageSize } : {}),
        },
        // Unrestricted generation: set all safety filters to BLOCK_NONE
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' }
        ],
        ...(seed !== undefined ? { seed: seed } : {}),
      };

      // Google Search tool is only available for gemini-3-pro-image-preview
      if (model === ModelType.PRO) {
        config.tools = [{ google_search: {} }];
      }

      const response = await ai.models.generateContent({
        model: model,
        contents: { parts: parts },
        config: config,
      });

      const candidate = response.candidates?.[0];
      if (!candidate) {
        throw new Error('Generation failed: The model returned an empty response.');
      }

      // Find the image part in the response (do not assume it is the first part)
      const responseParts = candidate.content?.parts;
      if (responseParts) {
        for (const part of responseParts) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      // Handle cases where no image was returned (e.g., safety block despite settings)
      if (candidate.finishReason === 'SAFETY') {
        throw new Error("The request was blocked by internal safety filters. Try a different prompt.");
      }

      throw new Error(`Generation error: ${candidate.finishReason || 'No image data returned.'}`);
    });
  }
}

export const geminiService = new GeminiService();
