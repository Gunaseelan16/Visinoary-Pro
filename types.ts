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

declare global {
  interface Window {
    // Fixed: Use 'any' to avoid conflict with the existing 'AIStudio' type provided by the environment.
    aistudio?: any;
  }
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      [key: string]: string | undefined;
    }
  }
  // Fixed: Use 'var' for global process declaration instead of 'const' to resolve augmentation errors with non-module entities.
  var process: {
    env: NodeJS.ProcessEnv;
  };
}
