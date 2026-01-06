import React, { useState, useEffect, useMemo } from 'react';
import { ASPECT_RATIOS, LogoIcon, SparklesIcon, UploadIcon, HistoryIcon, TrashIcon } from './constants';
import { geminiService } from './services/geminiService';
import { GeneratedImage, AspectRatio, ModelType, ImageSize, UploadedImage } from './types';
import { Button } from './components/Button';
import { ImageCard } from './components/ImageCard';

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(ModelType.FLASH);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageSize>('1K');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<GeneratedImage | null>(null);
  const [seed, setSeed] = useState<number | undefined>(undefined);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('visionary_image_gallery');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setImages(parsed);
      } catch (e) {
        localStorage.removeItem('visionary_image_gallery');
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('visionary_image_gallery', JSON.stringify(images));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError')) {
        setError('Storage is full. Please delete some old images.');
      }
    }
  }, [images]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

  const filteredImages = useMemo(() => {
    let result = [...images];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(img => img.prompt.toLowerCase().includes(q));
    }
    result.sort((a, b) => sortOrder === 'newest' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);
    return result;
  }, [images, searchQuery, sortOrder]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        setUploadedImages(prev => [...prev, {
          id: crypto.randomUUID(),
          data: dataUrl.split(',')[1],
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleModelSwitch = async (model: ModelType) => {
    if (model === ModelType.PRO) {
      try {
        // Mandatory step: Check if API key is selected for Pro models
        if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
          // Assume success after triggering the dialog to avoid race conditions
        }
      } catch (e) {
        console.error("Failed to manage API key selection", e);
      }
    }
    setSelectedModel(model);
    setError(null);
  };

  const handleGenerate = async () => {
    if (cooldownSeconds > 0) return;
    
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError('Please enter a description or upload an image.');
      return;
    }

    // Ensure API key is selected if using High Quality mode
    if (selectedModel === ModelType.PRO && window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        return;
      }
    }

    setError(null);
    setIsGenerating(true);

    try {
      const resultUrl = await geminiService.generateImage({
        prompt: prompt,
        aspectRatio,
        model: selectedModel,
        imageSize,
        images: uploadedImages,
        seed
      });

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: resultUrl,
        prompt: prompt || (uploadedImages.length > 0 ? 'Image Transformation' : 'Generated Image'),
        model: selectedModel,
        timestamp: Date.now(),
        aspectRatio,
      };

      setImages(prev => [newImage, ...prev]);

      // Auto-download result
      const link = document.createElement('a');
      link.href = resultUrl;
      link.download = `Generated_${newImage.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setPrompt('');
      setUploadedImages([]);
    } catch (err: any) {
      const msg = err?.message || 'The image generator encountered an error.';
      
      // Reset key selection if entity not found per guidelines
      if (msg.includes('Requested entity was not found.')) {
        setError('API error: Requested entity not found. Please re-select your paid project API key.');
        if (window.aistudio) {
          await window.aistudio.openSelectKey();
        }
      } else if (msg.includes('API key not valid') || msg.includes('403') || msg.includes('API Key Missing')) {
        setError('The API configuration is invalid. Please check your key settings.');
      } else if (msg.includes('429')) {
        setError('System is busy. Please wait a moment...');
        setCooldownSeconds(60);
      } else {
        setError(msg);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000] text-zinc-100 selection:bg-blue-600/40">
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-5 group cursor-default">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] group-hover:shadow-[0_0_50px_rgba(37,99,235,0.6)] transition-all duration-500 overflow-hidden">
            <LogoIcon />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none group-hover:text-blue-500 transition-colors">Visionary Pro</h1>
            <p className="text-[10px] text-zinc-500 font-black tracking-[0.5em] uppercase mt-1.5">Creative Image Studio</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <nav className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
            <button 
              disabled={isGenerating}
              onClick={() => handleModelSwitch(ModelType.FLASH)} 
              className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${selectedModel === ModelType.FLASH ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
            >
              Basic
            </button>
            <button 
              disabled={isGenerating}
              onClick={() => handleModelSwitch(ModelType.PRO)} 
              className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${selectedModel === ModelType.PRO ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'} disabled:opacity-50`}
            >
              High Quality
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[2000px] mx-auto w-full p-8 lg:p-12 gap-12">
        <aside className="w-full lg:w-[480px] flex flex-col gap-10">
          <section className="bg-white/[0.03] backdrop-blur-3xl rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl">
            
            <div className="space-y-4">
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <SparklesIcon /> Prompt
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What would you like to create?"
                className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-base text-zinc-100 placeholder:text-zinc-800 focus:ring-4 focus:ring-blue-600/20 outline-none min-h-[160px] transition-all resize-none leading-relaxed shadow-inner"
              />
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <UploadIcon /> Reference Images
                </label>
                {uploadedImages.length > 0 && <button onClick={() => setUploadedImages([])} className="text-[10px] text-red-600 uppercase font-black hover:text-red-500">Remove All</button>}
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div onClick={() => document.getElementById('imageUpload')?.click()} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[1.5rem] hover:border-blue-600/50 hover:bg-blue-600/5 cursor-pointer group transition-all">
                  <input id="imageUpload" type="file" multiple onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <div className="text-zinc-700 group-hover:text-blue-600"><UploadIcon /></div>
                </div>
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-[1.5rem] overflow-hidden group border border-white/10 shadow-lg">
                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" alt="Uploaded reference" />
                    <button onClick={() => setUploadedImages(prev => prev.filter(x => x.id !== img.id))} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><TrashIcon /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Shape</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black text-zinc-300 outline-none appearance-none cursor-pointer uppercase text-center">
                  {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Seed Number</label>
                <input 
                  type="number" 
                  value={seed || ''} 
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)} 
                  placeholder="Optional"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black text-zinc-300 outline-none placeholder:text-zinc-700 text-center"
                />
              </div>
            </div>

            {error && (
              <div className="p-6 rounded-[2rem] border bg-red-600/10 border-red-600/30 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-black uppercase tracking-widest text-red-600">Error</p>
                  <button onClick={() => setError(null)} className="text-zinc-500 hover:text-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <p className="text-sm text-zinc-200 leading-relaxed font-semibold">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button 
                onClick={handleGenerate} 
                isLoading={isGenerating} 
                disabled={cooldownSeconds > 0}
                className={`w-full h-20 rounded-[2.5rem] text-base font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-[0.97] ${cooldownSeconds > 0 ? 'bg-zinc-800 text-zinc-500 border border-white/5 shadow-none' : ''}`} 
                variant={selectedModel === ModelType.PRO ? 'primary' : 'secondary'}
              >
                {cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : 'Generate Image'}
              </Button>
              
              {selectedModel === ModelType.PRO && (
                <div className="text-center space-y-2">
                  <p className="text-[10px] text-zinc-500 font-bold px-4">
                    High Quality requires a paid project API key.
                  </p>
                  <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline uppercase font-black tracking-widest">
                    Billing Documentation
                  </a>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hidden lg:block">
            <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">Settings Information</h3>
            <div className="space-y-5 text-xs text-zinc-600 font-bold">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${cooldownSeconds > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                <p>Engine: {selectedModel === ModelType.FLASH ? 'Fast Mode' : 'High Quality Mode'}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p>Security: Unrestricted Creative Mode</p>
              </div>
            </div>
          </section>
        </aside>

        <section className="flex-1 flex flex-col gap-10 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-5"><HistoryIcon /> Your Images</h2>
            <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-500">{filteredImages.length} Saved</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-12 pb-48">
            {isGenerating && (
              <div className="bg-white/[0.03] rounded-[3rem] aspect-square flex flex-col items-center justify-center space-y-10 border border-blue-600/30 shimmer order-first">
                <div className="w-16 h-16 border-4 border-zinc-900 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.6em] text-white animate-pulse">Generating image...</p>
                </div>
              </div>
            )}
            {filteredImages.length === 0 && !isGenerating && (
              <div className="col-span-full h-96 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-[3rem] opacity-30">
                <p className="text-sm font-black uppercase tracking-[0.5em]">No images in your gallery</p>
              </div>
            )}
            {filteredImages.map((img) => (
              <ImageCard 
                key={img.id} 
                image={img} 
                onDelete={(id) => setImages(prev => prev.filter(x => x.id !== id))}
                onDownload={(url) => { const l = document.createElement('a'); l.href = url; l.download = `Generated_${Date.now()}.png`; l.click(); }}
                onSelect={setSelectedPreview}
              />
            ))}
          </div>
        </section>
      </main>

      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-3xl flex items-center justify-center p-12" onClick={() => setSelectedPreview(null)}>
          <div className="relative max-w-[90vw] w-full h-full flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPreview(null)} className="absolute top-0 right-0 p-10 text-zinc-600 hover:text-white transition-colors">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div className="bg-white/[0.02] p-4 rounded-[3.5rem] shadow-[0_0_150px_rgba(37,99,235,0.2)] border border-white/10">
              <img src={selectedPreview.url} className="max-h-[70vh] w-auto rounded-[3rem] shadow-2xl" alt="Preview" />
            </div>
            <div className="mt-12 text-center max-w-2xl">
              <p className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500 mb-8">{selectedPreview.prompt}</p>
              <div className="flex justify-center gap-6">
                <Button onClick={() => { const l = document.createElement('a'); l.href = selectedPreview.url; l.download = `Generated_${selectedPreview.id}.png`; l.click(); }} className="h-16 px-16 rounded-[1.5rem] font-black uppercase tracking-[0.4em]">Download Image</Button>
                <Button variant="secondary" onClick={() => setSelectedPreview(null)} className="h-16 px-12 rounded-[1.5rem] font-black uppercase tracking-[0.4em]">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;