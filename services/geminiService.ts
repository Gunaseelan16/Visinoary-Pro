
import { GoogleGenAI } from "@google/genai";
import { GenerationParams, ModelType } from "../types";

export class GeminiService {
  /**
   * Helper to get the API key from the environment.
   * Bridges the gap between local Vite dev and the production environment.
   */
  private getApiKey(): string | undefined {
    // Check standard process.env (Studio environment)
    if (process.env.API_KEY) return process.env.API_KEY;
    
    // Check Vite's import.meta.env (Local dev environment)
    // @ts-ignore - Vite environment variable access
    const viteKey = import.meta.env?.VITE_API_KEY;
    if (viteKey) return viteKey;

    return undefined;
  }

  /**
   * Generates or edits an image based on provided parameters.
   */
  async generateImage(params: GenerationParams): Promise<string> {
    const { prompt, aspectRatio, model, imageSize, images, seed } = params;
    
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('API_KEY_MISSING: No API key detected. Create a .env file with VITE_API_KEY=your_key or ensure process.env.API_KEY is set.');
    }

    const parts: any[] = [];

    if (images && images.length > 0) {
      images.forEach(img => {
        parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType,
          },
        });
      });
    }

    parts.push({ text: prompt });

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const config: any = {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(model === ModelType.PRO && imageSize ? { imageSize: imageSize } : {}),
        },
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

      if (!result?.candidates?.[0]) {
        throw new Error('Empty response from engine.');
      }

      const candidate = result.candidates[0];

      if (candidate.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData?.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }

      const finishReason = candidate.finishReason;
      if (finishReason === 'SAFETY') {
        throw new Error('The request was blocked by provider-side safety filters. Try a different prompt.');
      }

      throw new Error(`Rendering failed with status: ${finishReason}`);
    } catch (error: any) {
      const errorStr = typeof error === 'object' ? JSON.stringify(error) : String(error);
      console.error('Core Engine Error:', errorStr);

      if (errorStr.includes('403') || errorStr.includes('PERMISSION_DENIED')) {
        if (model === ModelType.PRO) {
          throw new Error('PRO_PERMISSION_DENIED: Your API Key does not have access to Gemini 3 Pro (requires a paid GCP project with billing enabled). Switch to "Flash Core" in the header to continue for free.');
        }
        throw new Error('PERMISSION_DENIED: Your API key is invalid or lacks necessary permissions for image generation.');
      }

      throw new Error(error.message || 'An unexpected failure occurred in the generation core.');
    }
  }

  async checkProKeyStatus(): Promise<boolean> {
    if (typeof window.aistudio?.hasSelectedApiKey === 'function') {
      try {
        return await window.aistudio.hasSelectedApiKey();
      } catch {
        return false;
      }
    }
    return true; 
  }

  async openKeySelection(): Promise<void> {
    if (typeof window.aistudio?.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
    }
  }
}

export const geminiService = new GeminiService();
