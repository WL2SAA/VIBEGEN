/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles, 
  Download, 
  RefreshCcw, 
  ChevronLeft, 
  Settings2, 
  X, 
  Maximize2,
  Loader2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

/// Constants
const ASPECT_RATIOS = ["1:1", "3:4", "4:3", "9:16", "16:9"] as const;
type AspectRatio = typeof ASPECT_RATIOS[number];

const RESOLUTIONS = ["1K", "2K", "4K"] as const;
type Resolution = typeof RESOLUTIONS[number];

const QUICK_MOODS = ["Solarpunk", "Minimalist", "Desert Gold", "Analog Horror", "Ethereal"];

const MODELS = [
  { id: 'gemini-2.5-flash-image', name: 'Standard' },
  { id: 'gemini-3.1-flash-image-preview', name: 'High Quality (BYOK)' },
  { id: 'gemini-3-pro-image-preview', name: 'Studio (BYOK)' }
];

interface GeneratedImage {
  url: string;
  id: string;
  prompt: string;
  base64: string;
  style?: string;
  colors?: string;
  negativePrompt?: string;
}

interface UserCollection {
  id: string;
  name: string;
  images: GeneratedImage[];
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [savedImages, setSavedImages] = useState<GeneratedImage[]>(() => {
    const saved = localStorage.getItem('vibegen_collection');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeTab, setActiveTab] = useState<'generate' | 'gallery'>('generate');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [resolution, setResolution] = useState<Resolution>("1K");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [refImage, setRefImage] = useState<GeneratedImage | null>(null);
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [hasPlatformKey, setHasPlatformKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        setHasPlatformKey(await window.aistudio.hasSelectedApiKey());
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    localStorage.setItem('vibegen_collection', JSON.stringify(savedImages));
  }, [savedImages]);

  const generateImages = useCallback(async (currentPrompt: string, imageToRemix?: GeneratedImage | null) => {
    if (!currentPrompt.trim()) return;
    
    // Always create a fresh instance right before the call to pick up the most recent key
    // precedence: Platform Selection (API_KEY) -> Environment (GEMINI_API_KEY)
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      setError("AI Engine not initialized. Please configure your API key in the platform settings.");
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    
    setIsLoading(true);
    setError(null);
    const newImages: GeneratedImage[] = [];

    try {
      for (let i = 0; i < 4; i++) {
        const parts = [];
        
        let fullPrompt = `High quality image, ${aspectRatio} aspect ratio, concept art, artistic, cinematic lighting, ${currentPrompt}.`;
        if (style) fullPrompt += ` Style: ${style}.`;
        if (colors) fullPrompt += ` Palette: ${colors}.`;
        if (negativePrompt) fullPrompt += ` Avoid: ${negativePrompt}.`;

        if (imageToRemix) {
          parts.push({
            inlineData: {
              data: imageToRemix.base64,
              mimeType: "image/png"
            }
          });
          parts.push({ text: `Remix this image with the following vibe: ${fullPrompt}. Maintain the style and spirit but create a new unique composition.` });
        } else {
          parts.push({ text: fullPrompt });
        }

        const imageConfig: any = {
          aspectRatio: aspectRatio,
        };

        // imageSize is only supported for nano banana 3.x preview models
        if (modelId.includes('preview') && modelId.includes('image')) {
          imageConfig.imageSize = resolution;
        }

        const response = await ai.models.generateContent({
          model: modelId,
          contents: { parts },
          config: {
            imageConfig
          }
        });

        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("No image generated");

        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64 = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64}`;
            newImages.push({
              url: imageUrl,
              base64,
              id: Math.random().toString(36).substring(7),
              prompt: currentPrompt,
              style,
              colors,
              negativePrompt
            });
          }
        }
      }
      
      setImages(newImages);
      setRefImage(null); 
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate images. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [modelId, resolution, aspectRatio, style, colors, negativePrompt]);

  const toggleSave = (img: GeneratedImage) => {
    setSavedImages(prev => {
      const isSaved = prev.some(item => item.id === img.id || item.url === img.url);
      if (isSaved) {
        return prev.filter(item => item.id !== img.id && item.url !== img.url);
      } else {
        return [...prev, img];
      }
    });
  };

  const isImageSaved = (img: GeneratedImage) => {
    return savedImages.some(item => item.id === img.id || item.url === img.url);
  };

  const handleDownload = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.url;
    link.download = `vibe-wall-${img.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRemix = (img: GeneratedImage) => {
    setRefImage(img);
    setSelectedImage(null);
    setPrompt(img.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* App Header */}
      <header className="h-16 px-8 flex items-center justify-between border-bottom border-border shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-[18px] font-extrabold tracking-[4px] text-accent uppercase">VIBEGEN</h1>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={cn(
              "px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 hidden sm:flex",
              hasPlatformKey || process.env.GEMINI_API_KEY 
                ? "bg-accent/10 border-accent/20 text-accent" 
                : "bg-red-500/10 border-red-500/20 text-red-500"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", hasPlatformKey || process.env.GEMINI_API_KEY ? "bg-accent" : "bg-red-500 animate-pulse")} />
            {hasPlatformKey || process.env.GEMINI_API_KEY ? "Engine Active" : "Key Required"}
          </button>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[11px] uppercase tracking-[1px] text-text-s font-medium">
          <button 
            onClick={() => setActiveTab('generate')}
            className={cn("hover:text-text-p transition-colors", activeTab === 'generate' && "text-accent")}
          >
            History
          </button>
          <button 
            onClick={() => setActiveTab('gallery')}
            className={cn("hover:text-text-p transition-colors", activeTab === 'gallery' && "text-accent")}
          >
            Collection
          </button>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors flex items-center justify-center border border-border"
          >
            <Settings2 className="w-5 h-5 text-text-p" />
          </button>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="md:hidden p-2 border border-border rounded-lg"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] p-8 gap-8 overflow-hidden">
        {/* Left Panel: Inputs */}
        <section className="geometric-panel p-8 flex flex-col gap-8 h-fit lg:sticky lg:top-8">
          <div className="flex bg-bg rounded-xl p-1 gap-1">
            <button 
              onClick={() => setActiveTab('generate')}
              className={cn(
                "flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all",
                activeTab === 'generate' ? "bg-panel text-text-p shadow-sm" : "text-text-s"
              )}
            >
              Vibe
            </button>
            <button 
              onClick={() => setActiveTab('gallery')}
              className={cn(
                "flex-1 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all",
                activeTab === 'gallery' ? "bg-panel text-text-p shadow-sm" : "text-text-s"
              )}
            >
              Collection
            </button>
          </div>

          <div className="space-y-4">
            <div className="geometric-label">Current Prompt</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your vibe..."
              className="w-full bg-transparent border border-border rounded-[12px] p-4 text-[15px] text-text-p resize-none min-h-[120px] outline-none focus:border-accent transition-colors"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="geometric-label">Advanced Filters</div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-accent uppercase font-bold tracking-wider hover:underline"
              >
                {showAdvanced ? "Hide" : "Show"}
              </button>
            </div>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-s uppercase font-bold">Primary Style</label>
                    <input 
                      type="text"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="e.g. Watercolor, Cyberpunk, 3D Render"
                      className="w-full bg-bg border border-border rounded-[10px] px-3 py-2 text-[13px] text-text-p focus:border-accent outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-s uppercase font-bold">Color Palette</label>
                    <input 
                      type="text"
                      value={colors}
                      onChange={(e) => setColors(e.target.value)}
                      placeholder="e.g. Blues and Greens, Vibrant Oranges"
                      className="w-full bg-bg border border-border rounded-[10px] px-3 py-2 text-[13px] text-text-p focus:border-accent outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-s uppercase font-bold">Negative Prompt</label>
                    <input 
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="Exclude (e.g. no people, text)"
                      className="w-full bg-bg border border-border rounded-[10px] px-3 py-2 text-[13px] text-text-p focus:border-accent outline-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            <div className="geometric-label">Quick Moods</div>
            <div className="flex flex-wrap gap-2">
              {QUICK_MOODS.map(mood => (
                <button
                  key={mood}
                  onClick={() => setPrompt(mood)}
                  className="bg-bg border border-border px-3 py-1.5 rounded-full text-[11px] text-text-s hover:border-accent hover:text-text-p transition-all"
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
          
          {refImage && (
            <div className="p-3 bg-white/5 border border-border rounded-[12px] flex items-center gap-3">
              <div className="relative w-10 h-16 rounded-lg overflow-hidden shrink-0 border border-border">
                <img src={refImage.url} alt="Reference" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-[11px] text-text-s uppercase tracking-wider font-bold">
                Remix Active
              </div>
              <button 
                onClick={() => setRefImage(null)}
                className="p-1 hover:bg-white/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {(!hasPlatformKey && !process.env.GEMINI_API_KEY) && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 bg-accent/20 border border-accent rounded-[16px] relative"
            >
              <div className="absolute -top-2 left-8 w-4 h-4 bg-accent/20 border-l border-t border-accent rotate-45" />
              <p className="text-[11px] font-bold text-accent uppercase tracking-wider mb-2">API Key Required</p>
              <p className="text-[10px] text-text-p leading-relaxed mb-3">
                To start generating, you need to connect a Gemini API key. 
              </p>
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="text-[10px] bg-accent text-bg px-3 py-1.5 rounded-lg font-bold uppercase"
              >
                Set Up Now
              </button>
            </motion.div>
          )}

          <div className="mt-auto pt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[12px] text-text-s">
              <div className="status-dot" />
              <span>AI Engine Ready: {MODELS.find(m => m.id === modelId)?.name}</span>
            </div>
            
            <button
              onClick={() => generateImages(prompt, refImage)}
              disabled={isLoading || !prompt.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-5 bg-accent text-bg rounded-[12px] text-[14px] font-bold uppercase tracking-[1px] transition-all",
                isLoading || !prompt.trim() ? "opacity-30 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-5 h-5" />
                  Generating...
                </>
              ) : (
                "Generate Variations"
              )}
            </button>
          </div>
        </section>

        {/* Right Panel: Content */}
        <section className="flex flex-col gap-6">
          {activeTab === 'generate' ? (
            <>
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {images.length > 0 ? (
                  images.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setSelectedImage(img)}
                      className={cn(
                        "group relative bg-panel border rounded-[16px] overflow-hidden cursor-pointer transition-all hover:border-accent",
                        aspectRatio === "9:16" ? "aspect-[9/16]" : 
                        aspectRatio === "16:9" ? "aspect-[16/9]" : 
                        "aspect-square",
                        "border-border"
                      )}
                    >
                      <img 
                        src={img.url} 
                        alt={`Generation ${idx + 1}`} 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemix(img);
                          }}
                          className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[8px] text-[10px] font-bold uppercase"
                        >
                          Remix
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(img);
                          }}
                          className={cn(
                            "px-3 py-1.5 backdrop-blur-md border rounded-[8px] text-[10px] font-bold uppercase transition-colors",
                            isImageSaved(img) ? "bg-accent text-bg border-accent" : "bg-white/10 border-white/20 text-white"
                          )}
                        >
                          {isImageSaved(img) ? "Saved" : "Save"}
                        </button>
                      </div>
                    </motion.div>
                  ))
                ) : !isLoading && (
                  <div className="col-span-full border-2 border-dashed border-border rounded-[24px] py-32 flex flex-col items-center justify-center opacity-30">
                    <Sparkles className="w-12 h-12 mb-4" />
                    <p className="text-sm font-medium tracking-wide">Enter a vibe to start generating</p>
                  </div>
                )}
                
                {isLoading && (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className={cn(
                      "bg-panel border border-border rounded-[16px] animate-pulse flex items-center justify-center",
                      aspectRatio === "9:16" ? "aspect-[9/16]" : 
                        aspectRatio === "16:9" ? "aspect-[16/9]" : 
                        "aspect-square"
                    )}>
                      <RefreshCcw className="w-6 h-6 animate-spin text-text-s/30" />
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-extrabold uppercase tracking-widest text-text-p">My Collection</h2>
                <span className="text-xs text-text-s font-bold">{savedImages.length} Assets</span>
              </div>
              
              {savedImages.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {savedImages.map((img, idx) => (
                    <motion.div
                      key={img.id}
                      layoutId={img.id}
                      onClick={() => setSelectedImage(img)}
                      className={cn(
                        "group relative bg-panel border border-border rounded-[16px] overflow-hidden cursor-pointer transition-all hover:border-accent",
                        aspectRatio === "9:16" ? "aspect-[9/16]" : 
                        aspectRatio === "16:9" ? "aspect-[16/9]" : 
                        "aspect-square"
                      )}
                    >
                      <img 
                        src={img.url} 
                        alt="Collection item" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSave(img);
                          }}
                          className="px-3 py-1.5 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-500 rounded-[8px] text-[10px] font-bold uppercase hover:bg-red-500 hover:text-white transition-colors"
                        >
                          Remove
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(img);
                          }}
                          className="px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-[8px] text-[10px] font-bold uppercase transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-[32px] opacity-30">
                  <Trash2 className="w-10 h-10 mb-4" />
                  <p className="text-sm font-bold uppercase tracking-widest text-center">Collection Empty</p>
                  <button 
                    onClick={() => setActiveTab('generate')}
                    className="mt-4 text-[10px] text-accent font-bold uppercase tracking-widest hover:underline"
                  >
                    Start Generating
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* Selected Image Fullscreen Overlay */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
          >
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-8 right-8 p-3 bg-panel border border-border rounded-full hover:border-accent transition-colors z-50"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-12">
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className={cn(
                  "relative h-auto shadow-2xl shadow-black rounded-[24px] overflow-hidden border border-border",
                  aspectRatio === "9:16" ? "aspect-[9/16] h-[70vh]" : 
                  aspectRatio === "16:9" ? "aspect-[16/9] w-full" : 
                  "aspect-square h-[60vh]"
                )}
              >
                <img 
                  src={selectedImage.url} 
                  alt="Selected preview" 
                  className="w-full h-full object-cover"
                />
              </motion.div>

              <div className="flex flex-col gap-6 max-w-md w-full text-center lg:text-left">
                <div className="space-y-4">
                  <div className="geometric-label">Prompt Content</div>
                  <h2 className="text-2xl font-bold leading-tight uppercase tracking-wide">
                    {selectedImage.prompt}
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button
                    onClick={() => handleDownload(selectedImage)}
                    className="flex items-center justify-center gap-2 py-4 bg-accent text-bg rounded-[12px] text-[12px] font-bold uppercase tracking-[1px] hover:scale-[1.05] transition-transform"
                  >
                    <Download className="w-4 h-4" />
                    Save Asset
                  </button>
                  <button
                    onClick={() => toggleSave(selectedImage)}
                    className={cn(
                      "flex items-center justify-center gap-2 py-4 border rounded-[12px] text-[12px] font-bold uppercase tracking-[1px] transition-all hover:scale-[1.05]",
                      isImageSaved(selectedImage) 
                        ? "bg-red-500/20 border-red-500 text-red-500" 
                        : "bg-panel border-border text-white hover:border-accent"
                    )}
                  >
                    {isImageSaved(selectedImage) ? <Trash2 className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                    {isImageSaved(selectedImage) ? "Remove Collection" : "Save Collection"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-panel border border-border p-10 rounded-[40px] w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-extrabold uppercase tracking-widest flex items-center gap-2">
                  Config
                </h3>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:text-accent"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-8">
                <section>
                  <label className="geometric-label block mb-4">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={cn(
                          "py-3 rounded-[12px] border text-[11px] font-bold uppercase tracking-wider transition-all",
                          aspectRatio === ar 
                            ? "bg-accent border-accent text-bg" 
                            : "bg-bg border-border text-text-s hover:border-text-s"
                        )}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="geometric-label block mb-4">Model Engine</label>
                  <div className="grid grid-cols-1 gap-2">
                    {MODELS.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setModelId(m.id)}
                        className={cn(
                          "py-3 rounded-[12px] border text-[11px] font-bold uppercase tracking-wider transition-all px-4 text-left flex justify-between items-center",
                          modelId === m.id 
                            ? "bg-accent border-accent text-bg" 
                            : "bg-bg border-border text-text-s hover:border-text-s"
                        )}
                      >
                        {m.name}
                        {modelId === m.id && <div className="w-2 h-2 rounded-full bg-bg" />}
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <label className="geometric-label block mb-4">Target Resolution</label>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTIONS.map((res) => (
                      <button
                        key={res}
                        onClick={() => setResolution(res)}
                        className={cn(
                          "py-3 rounded-[12px] border text-[11px] font-bold uppercase tracking-wider transition-all",
                          resolution === res 
                            ? "bg-accent border-accent text-bg" 
                            : "bg-bg border-border text-text-s hover:border-text-s"
                        )}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </section>

                {/* API Info / Text Bubble */}
                <section className="mt-8 p-6 bg-accent/5 rounded-[24px] border border-accent/20">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-accent/10 rounded-full shrink-0">
                      <Sparkles className="w-4 h-4 text-accent" />
                    </div>
                    <div className="space-y-2">
                    <h4 className="text-[12px] font-extrabold uppercase tracking-widest text-accent">Key Management</h4>
                    <p className="text-[11px] leading-relaxed text-text-s">
                      High-quality generation requires a personal API key. For security, keys are managed by the platform.
                    </p>
                    
                    {window.aistudio ? (
                      <button 
                        onClick={async () => {
                          await window.aistudio?.openSelectKey();
                          setHasPlatformKey(true);
                        }}
                        className="mt-2 px-4 py-2 bg-accent text-bg text-[10px] font-bold uppercase tracking-widest rounded-lg hover:scale-[1.05] transition-transform"
                      >
                        {hasPlatformKey ? "Update Custom Key" : "Connect Custom Key"}
                      </button>
                    ) : (
                      <div className="mt-2 text-[10px] text-accent/60 font-medium italic">
                        Standard API key detected from environment.
                      </div>
                    )}
                    </div>
                  </div>
                </section>
              </div>

              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-full mt-10 py-5 bg-accent text-bg rounded-[12px] text-[12px] font-bold uppercase tracking-[2px] shadow-lg shadow-accent/10"
              >
                Apply Changes
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
