
import React, { useState, useEffect, useMemo } from 'react';
import { Icons, ASPECT_RATIOS } from './constants';
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

  useEffect(() => {
    const saved = localStorage.getItem('visionary_studio_vault');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setImages(parsed);
      } catch (e) {
        localStorage.removeItem('visionary_studio_vault');
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('visionary_studio_vault', JSON.stringify(images));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError')) {
        setError('Vault storage full. Purge old productions.');
      }
    }
  }, [images]);

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

    Array.from(files).forEach(file => {
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

  const handleGenerate = async () => {
    if (!prompt.trim() && uploadedImages.length === 0) {
      setError('Command or Reference required.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      if (selectedModel === ModelType.PRO) {
        const hasKey = await geminiService.checkProKeyStatus();
        if (!hasKey) await geminiService.openKeySelection();
      }

      const resultUrl = await geminiService.generateImage({
        prompt: prompt || 'unrestricted cinematic visual',
        aspectRatio,
        model: selectedModel,
        imageSize,
        images: uploadedImages,
        seed
      });

      const newImage: GeneratedImage = {
        id: crypto.randomUUID(),
        url: resultUrl,
        prompt: prompt || 'Studio Production',
        model: selectedModel,
        timestamp: Date.now(),
        aspectRatio,
      };

      setImages(prev => [newImage, ...prev]);
      setPrompt('');
      setSortOrder('newest');
    } catch (err: any) {
      setError(err.message || 'Engine failed to render.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000] text-zinc-100 selection:bg-blue-600/40">
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-700 flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            <Icons.Sparkles />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase leading-none">Visionary Studio</h1>
            <p className="text-[10px] text-zinc-500 font-black tracking-[0.5em] uppercase mt-1.5">Mastery Engine</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10">
          <button 
            onClick={() => { setSelectedModel(ModelType.FLASH); setError(null); }} 
            className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${selectedModel === ModelType.FLASH ? 'bg-white text-black' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            Flash Core (Free)
          </button>
          <button 
            onClick={() => { setSelectedModel(ModelType.PRO); setError(null); }} 
            className={`px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${selectedModel === ModelType.PRO ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
          >
            Pro Grade (Paid)
          </button>
        </nav>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row max-w-[2000px] mx-auto w-full p-8 lg:p-12 gap-12">
        <aside className="w-full lg:w-[480px] flex flex-col gap-10">
          <section className="bg-white/[0.03] backdrop-blur-3xl rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl">
            
            <div className="space-y-4">
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                <Icons.Sparkles /> Execution Command
              </label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="What should the AI create?"
                className="w-full bg-black/40 border border-white/10 rounded-[2rem] p-8 text-base text-zinc-100 placeholder:text-zinc-800 focus:ring-4 focus:ring-blue-600/20 outline-none min-h-[200px] transition-all resize-none leading-relaxed shadow-inner"
              />
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  <Icons.Upload /> Image Upload
                </label>
                {uploadedImages.length > 0 && <button onClick={() => setUploadedImages([])} className="text-[10px] text-red-600 uppercase font-black hover:text-red-500">Clear</button>}
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div onClick={() => document.getElementById('imageUpload')?.click()} className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[1.5rem] hover:border-blue-600/50 hover:bg-blue-600/5 cursor-pointer group transition-all">
                  <input id="imageUpload" type="file" multiple onChange={handleFileUpload} className="hidden" accept="image/*" />
                  <div className="text-zinc-700 group-hover:text-blue-600"><Icons.Upload /></div>
                </div>
                {uploadedImages.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-[1.5rem] overflow-hidden group border border-white/10 shadow-lg">
                    <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-full object-cover" alt="Source" />
                    <button onClick={() => setUploadedImages(prev => prev.filter(x => x.id !== img.id))} className="absolute inset-0 bg-red-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Icons.Trash /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Aspect</label>
                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value as AspectRatio)} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black text-zinc-300 outline-none appearance-none cursor-pointer uppercase text-center">
                  {ASPECT_RATIOS.map(ar => <option key={ar.value} value={ar.value}>{ar.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em]">Seed</label>
                <input 
                  type="number" 
                  value={seed || ''} 
                  onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)} 
                  placeholder="AUTO"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-black text-zinc-300 outline-none placeholder:text-zinc-700 text-center"
                />
              </div>
            </div>

            {error && (
              <div className={`p-6 rounded-[2rem] border animate-in fade-in zoom-in-95 ${error.includes('PRO_PERMISSION_DENIED') ? 'bg-orange-600/10 border-orange-600/30' : 'bg-red-600/10 border-red-600/30'}`}>
                <p className={`text-[11px] font-black uppercase tracking-widest mb-2 ${error.includes('PRO_PERMISSION_DENIED') ? 'text-orange-600' : 'text-red-600'}`}>
                  {error.includes('PRO_PERMISSION_DENIED') ? 'Switch Recommended' : 'System Notice'}
                </p>
                <p className="text-sm text-zinc-200 leading-relaxed font-semibold">
                  {error.includes('PRO_PERMISSION_DENIED') 
                    ? 'Your API Key lacks permission for Gemini 3 Pro. Please use "Flash Core (Free)" instead.' 
                    : error}
                </p>
                {error.includes('PRO_PERMISSION_DENIED') && (
                  <button 
                    onClick={() => { setSelectedModel(ModelType.FLASH); setError(null); }}
                    className="mt-4 w-full py-2 bg-orange-600/20 hover:bg-orange-600/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-orange-600 transition-all"
                  >
                    Switch to Flash Core Now
                  </button>
                )}
              </div>
            )}

            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              className="w-full h-20 rounded-[2.5rem] text-base font-black uppercase tracking-[0.5em] shadow-[0_20px_50px_-10px_rgba(37,99,235,0.4)] transition-all active:scale-[0.97]" 
              variant={selectedModel === ModelType.PRO ? 'primary' : 'secondary'}
            >
              Ignite Engine
            </Button>
          </section>

          <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-10 hidden lg:block">
            <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em] mb-6">Environment Specs</h3>
            <div className="space-y-5 text-xs text-zinc-600 font-bold leading-relaxed">
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedModel === ModelType.FLASH ? 'bg-green-500' : 'bg-blue-600 animate-pulse'}`}></div>
                <p>Engine: {selectedModel === ModelType.FLASH ? 'FLASH_CORE_IMAGE' : 'PRO_GRADE_IMAGE'}</p>
              </div>
              <div className="flex items-center gap-4"><div className="w-2.5 h-2.5 rounded-full bg-zinc-800"></div><p>Sovereignty: BLOCK_NONE</p></div>
            </div>
          </section>
        </aside>

        <section className="flex-1 flex flex-col gap-10 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h2 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-5"><Icons.History /> Production Vault</h2>
            <div className="bg-white/5 border border-white/10 px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest text-zinc-500">{filteredImages.length} Artifacts</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-12 pb-48">
            {isGenerating && (
              <div className="bg-white/[0.03] rounded-[3rem] aspect-square flex flex-col items-center justify-center space-y-10 border border-blue-600/30 shimmer order-first shadow-[0_30px_100px_-20px_rgba(37,99,235,0.4)]">
                <div className="w-20 h-20 border-8 border-zinc-900 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-center"><p className="text-sm font-black uppercase tracking-[0.6em] text-white animate-pulse">Rendering...</p></div>
              </div>
            )}
            {filteredImages.map((img) => (
              <ImageCard 
                key={img.id} 
                image={img} 
                onDelete={(id) => setImages(prev => prev.filter(x => x.id !== id))}
                onDownload={(url) => { const l = document.createElement('a'); l.href = url; l.download = `STILL_${Date.now()}.png`; l.click(); }}
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
            <div className="bg-white/[0.02] p-5 rounded-[4rem] shadow-[0_0_150px_rgba(37,99,235,0.2)] border border-white/10">
              <img src={selectedPreview.url} className="max-h-[75vh] w-auto rounded-[3.5rem] shadow-2xl" alt="Artifact Preview" />
            </div>
            <div className="mt-12 text-center">
              <p className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500 mb-6 max-w-2xl">{selectedPreview.prompt}</p>
              <Button onClick={() => { const l = document.createElement('a'); l.href = selectedPreview.url; l.download = `VISION_${selectedPreview.id}.png`; l.click(); }} className="h-20 px-16 rounded-[2rem] font-black uppercase tracking-[0.4em]">Save Master Copy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
