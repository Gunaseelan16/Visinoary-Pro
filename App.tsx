
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
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('visionary_gallery_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setImages(parsed);
      } catch (e) {
        localStorage.removeItem('visionary_gallery_v2');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('visionary_gallery_v2', JSON.stringify(images));
  }, [images]);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => setCooldownSeconds(p => p - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

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

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setError(null);
    }
  };

  const handleEvolve = (img: GeneratedImage) => {
    // Extract base64 from data URL
    const base64 = img.url.split(',')[1];
    setUploadedImages(prev => [{
      id: crypto.randomUUID(),
      data: base64,
      mimeType: 'image/png'
    }, ...prev]);
    setPrompt(`Variation of: ${img.prompt}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (cooldownSeconds > 0) return;
    
    setError(null);
    setIsGenerating(true);

    try {
      const resultUrl = await geminiService.generateImage({
        prompt,
        aspectRatio,
        model: selectedModel,
        imageSize,
        images: uploadedImages,
        seed
      });

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: resultUrl,
        prompt: prompt || "Visual Creation",
        model: selectedModel,
        timestamp: Date.now(),
        aspectRatio,
      };

      setImages(prev => [newImage, ...prev]);
      setPrompt('');
      setUploadedImages([]);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg === "API_KEY_MISSING" || msg.includes("401") || msg.includes("403") || msg.includes("entity was not found")) {
        setError("API Key Required: Please select a valid key from a paid project to continue.");
        await handleOpenKeySelection();
      } else if (msg.includes("429")) {
        setError("Server Busy: High traffic detected. Retrying...");
        setCooldownSeconds(10);
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <LogoIcon />
          </div>
          <div>
            <h1 className="font-black uppercase tracking-tighter text-xl leading-none">Visionary Pro</h1>
            <p className="text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-bold mt-1">Unrestricted Creative Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Safety: Unrestricted</span>
          </div>
          <nav className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setSelectedModel(ModelType.FLASH)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedModel === ModelType.FLASH ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            >Flash</button>
            <button 
              onClick={() => { setSelectedModel(ModelType.PRO); handleOpenKeySelection(); }}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${selectedModel === ModelType.PRO ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}
            >Pro HQ</button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1800px] mx-auto w-full p-6 lg:p-12 flex flex-col lg:flex-row gap-12">
        <aside className="w-full lg:w-[420px] flex flex-col gap-8">
          <div className="bg-zinc-900/50 border border-white/10 rounded-[2.5rem] p-8 space-y-8 shadow-2xl">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                <SparklesIcon /> Imagination Prompt
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="An astronaut riding a glowing jellyfish through a neon nebula..."
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-6 text-sm focus:ring-2 focus:ring-blue-600 outline-none min-h-[140px] resize-none leading-relaxed transition-all"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                  <UploadIcon /> Reference Images
                </label>
                {uploadedImages.length > 0 && <button onClick={() => setUploadedImages([])} className="text-[9px] font-black text-red-500 uppercase">Clear</button>}
              </div>
              <div className="grid grid-cols-4 gap-3">
                <button 
                  onClick={() => document.getElementById('imageInput')?.click()}
                  className="aspect-square border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center hover:border-blue-600 hover:bg-blue-600/5 transition-all group"
                >
                  <UploadIcon />
                  <input type="file" id="imageInput" multiple hidden accept="image/*" onChange={handleFileUpload} />
                </button>
                {uploadedImages.map(img => (
                  <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" />
                    <button onClick={() => setUploadedImages(p => p.filter(x => x.id !== img.id))} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                      <TrashIcon />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Ratio</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold appearance-none text-center cursor-pointer">
                  {ASPECT_RATIOS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Seed</label>
                <input 
                  type="number" 
                  value={seed || ''} 
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs font-bold text-center placeholder:text-zinc-800"
                  placeholder="Random"
                />
              </div>
            </div>

            {error && (
              <div className="p-5 bg-red-600/10 border border-red-600/20 rounded-2xl">
                <p className="text-xs text-red-400 font-bold leading-relaxed">{error}</p>
                {window.aistudio && (
                  <button onClick={handleOpenKeySelection} className="mt-3 text-[10px] font-black uppercase text-blue-500 hover:underline">Select New API Key</button>
                )}
              </div>
            )}

            <Button 
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={cooldownSeconds > 0}
              variant={selectedModel === ModelType.PRO ? 'primary' : 'secondary'}
              className="w-full h-16 rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-transform"
            >
              {cooldownSeconds > 0 ? `Retry in ${cooldownSeconds}s` : 'Unrestricted Generate'}
            </Button>
          </div>
        </aside>

        <section className="flex-1 flex flex-col gap-10">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-4">
              <HistoryIcon /> Creative Gallery
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {isGenerating && (
              <div className="aspect-square bg-zinc-900 rounded-[2.5rem] border border-blue-600/20 flex flex-col items-center justify-center gap-6 shimmer order-first">
                <div className="w-12 h-12 border-4 border-white/5 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 animate-pulse">Igniting Vision...</p>
              </div>
            )}
            {images.length === 0 && !isGenerating && (
              <div className="col-span-full h-80 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-zinc-700">
                <p className="text-xs font-black uppercase tracking-[0.4em]">Empty Canvas</p>
              </div>
            )}
            {images.map(img => (
              <ImageCard 
                key={img.id}
                image={img}
                onDelete={(id) => setImages(p => p.filter(x => x.id !== id))}
                onDownload={(url) => { const a = document.createElement('a'); a.href = url; a.download = `Vision_${Date.now()}.png`; a.click(); }}
                onSelect={setSelectedPreview}
                onEvolve={handleEvolve}
              />
            ))}
          </div>
        </section>
      </main>

      {selectedPreview && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8" onClick={() => setSelectedPreview(null)}>
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={selectedPreview.url} className="max-h-[80vh] rounded-[2.5rem] shadow-2xl border border-white/10" />
            <div className="mt-8 flex gap-4">
              <Button onClick={() => handleEvolve(selectedPreview)} className="rounded-xl px-10">Evolve</Button>
              <Button variant="secondary" onClick={() => setSelectedPreview(null)} className="rounded-xl px-10">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
