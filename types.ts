
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
