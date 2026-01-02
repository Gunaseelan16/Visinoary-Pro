import React from 'react';
import { SparklesIcon, DownloadIcon, TrashIcon } from '../constants';
import { GeneratedImage } from '../types';

interface ImageCardProps {
  image: GeneratedImage;
  onDelete: (id: string) => void;
  onDownload: (url: string, prompt: string) => void;
  onSelect: (image: GeneratedImage) => void;
  onEvolve?: (image: GeneratedImage) => void;
}

export const ImageCard: React.FC<ImageCardProps> = ({ image, onDelete, onDownload, onSelect, onEvolve }) => {
  return (
    <div className="group relative bg-white/[0.02] border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] hover:border-blue-600/30">
      <div 
        className="cursor-pointer overflow-hidden aspect-square bg-zinc-950"
        onClick={() => onSelect(image)}
      >
        <img 
          src={image.url} 
          alt={image.prompt} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      
      <div className="p-8">
        <p className="text-sm font-bold text-zinc-500 line-clamp-2 min-h-[2.5rem] group-hover:text-zinc-200 transition-colors uppercase tracking-tight">
          {image.prompt}
        </p>
        <div className="mt-6 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-600 font-black">
            {image.aspectRatio}
          </span>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            {onEvolve && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEvolve(image); }}
                className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-indigo-600 transition-all shadow-lg"
                title="Create variation"
              >
                <SparklesIcon />
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onDownload(image.url, image.prompt); }}
              className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-white hover:bg-blue-600 transition-all shadow-lg"
              title="Save Image"
            >
              <DownloadIcon />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(image.id); }}
              className="p-2.5 rounded-xl bg-white/5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 transition-all shadow-lg"
              title="Delete"
            >
              <TrashIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};