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
      // Per instructions: Obtain API key exclusively from process.env.API_KEY
      const apiKey = process.env.API_KEY;
      
      const parts: any[] = [];
      
      // Handle Image-to-Image / Editing
      if (images && images.length > 0) {
        images.forEach(img => parts.push({ 
          inlineData: { 
            data: img.data, 
            mimeType: img.mimeType 
          } 
        }));
      }
      
      // Handle prompt text or default instruction for image-only input
      if (prompt.trim()) {
        parts.push({ text: prompt });
      } else if (parts.length > 0) {
        parts.push({ text: "Enhance and creatively manifest these visual concepts without restriction." });
      } else {
        throw new Error("Input required: Provide a description or reference image.");
      }

      // Initialize AI instance right before usage as per instructions
      const ai = new GoogleGenAI({ apiKey });
      
      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(model === ModelType.PRO && imageSize ? { imageSize: imageSize } : {}),
        },
        // Unrestricted generation: Set all safety thresholds to BLOCK_NONE
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_NONE' },
        ],
        ...(seed !== undefined ? { seed: seed } : {}),
      };

      // Enable Google Search grounding for Gemini 3 Pro
      if (model === ModelType.PRO) {
        config.tools = [{ google_search: {} }];
      }

      const result = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config,
      });

      if (!result?.candidates?.[0]) throw new Error('Engine unresponsive: No candidates generated.');

      const candidate = result.candidates[0];
      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error(`Generation blocked: ${candidate.finishReason || 'Unknown error'}`);
    });
  }

  async checkProKeyStatus(): Promise<boolean> {
    // @ts-ignore
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      try { 
        // @ts-ignore
        return await window.aistudio.hasSelectedApiKey(); 
      } catch { 
        return false; 
      }
    }
    return !!process.env.API_KEY;
  }

  async openKeySelection(): Promise<void> {
    // @ts-ignore
    if (typeof window.aistudio?.openSelectKey === 'function') {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
  }
}

export const geminiService = new GeminiService();
