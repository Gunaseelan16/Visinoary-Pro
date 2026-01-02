import { GoogleGenAI } from "@google/genai";
import { GenerationParams, ModelType } from "../types";

export class GeminiService {
  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const isRateLimit = error?.status === 429 || errorMsg.includes('429');
      
      if (isRateLimit && retries > 0) {
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  }

  async generateImage(params: GenerationParams): Promise<string> {
    const { prompt, aspectRatio, model, imageSize, images, seed } = params;

    return this.withRetry(async () => {
      // Always pull from process.env.API_KEY directly as per guidelines
      const apiKey = process.env.API_KEY;
      
      if (!apiKey || apiKey.trim() === '') {
        // If key is missing, attempt to open the selection dialog if available
        if (window.aistudio?.openSelectKey) {
          await window.aistudio.openSelectKey();
          // After calling openSelectKey, we proceed assuming success or platform handling
        } else {
          throw new Error("Missing API Credentials. Please link your project.");
        }
      }

      // Initialize AI instance right before usage to catch the most current key
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
        parts.push({ text: "Enhance these visual references into high-fidelity imagery." });
      } else {
        throw new Error("Input required: Description or reference image.");
      }

      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(model === ModelType.PRO && imageSize ? { imageSize: imageSize } : {}),
        },
        // Complete freedom: No safety restrictions
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ],
        ...(seed !== undefined ? { seed: seed } : {}),
      };

      if (model === ModelType.PRO) {
        config.tools = [{ google_search: {} }];
      }

      const result = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config,
      });

      if (!result?.candidates?.[0]) throw new Error('Generation failed: No response from engine.');

      const candidate = result.candidates[0];
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
      }

      throw new Error(`Synthesis halted: ${candidate.finishReason || 'Technical error'}`);
    });
  }

  async checkProKeyStatus(): Promise<boolean> {
    if (window.aistudio?.hasSelectedApiKey) {
      try { 
        return await window.aistudio.hasSelectedApiKey(); 
      } catch { 
        return false; 
      }
    }
    return !!process.env.API_KEY && process.env.API_KEY !== '';
  }

  async openKeySelection(): Promise<void> {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  }
}

export const geminiService = new GeminiService();
