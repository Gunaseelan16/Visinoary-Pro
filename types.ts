export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
export type ImageSize = '1K' | '2K' | '4K';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  timestamp: number;
  aspectRatio: AspectRatio;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview'
}

export interface UploadedImage {
  data: string;
  mimeType: string;
  id: string;
}

export interface GenerationParams {
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
  imageSize?: ImageSize;
  images?: UploadedImage[];
  seed?: number;
}

/**
 * Interface definition for the AI Studio key selection utility
 */
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  // Use any to avoid redeclaration conflicts with platform-injected window.aistudio property
  interface Window {
    aistudio: any;
  }

  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      [key: string]: string | undefined;
    }
    // Fix: Augment Process to include the cwd method used in build configuration
    interface Process {
      env: ProcessEnv;
      cwd: () => string;
    }
  }
}