import React, { useState, useEffect, useRef } from 'react';
import { PresentationData, PresentationSlide } from '../types';
import SlidePreview from './SlidePreview';
import { createPptxFromImages } from '../services/pptService';
import { X, Download, ChevronRight, ChevronLeft, StickyNote, Loader2, Pencil, Save, Code } from 'lucide-react';
import { toPng } from 'html-to-image';

interface SlideViewerProps {
  data: PresentationData;
  onClose: () => void;
  onDownload: () => void;
}

const SlideViewer: React.FC<SlideViewerProps> = ({ data, onClose, onDownload }) => {
  // Initialize local state with props data to allow editing
  const [slides, setSlides] = useState<PresentationSlide[]>(data.slides);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingPptx, setIsGeneratingPptx] = useState(false);
  
  // HTML Editor Modal State
  const [showHtmlEditor, setShowHtmlEditor] = useState(false);
  const [tempHtml, setTempHtml] = useState('');

  // A hidden container used for rendering slides off-screen for snapshotting
  const captureContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable keyboard nav if editing text to prevent accidental jumps
      if (showHtmlEditor) return;
      if (isEditing && document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === ' ') {
        setCurrentIndex(curr => Math.min(curr + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(curr => Math.max(curr - 1, 0));
      } else if (e.key === 'Escape') {
        if (showHtmlEditor) setShowHtmlEditor(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, onClose, isEditing, showHtmlEditor]);

  const handleUpdateSlide = (index: number, updates: Partial<PresentationSlide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    setSlides(newSlides);
  };

  const openHtmlEditor = () => {
    setTempHtml(slides[currentIndex].htmlContent);
    setShowHtmlEditor(true);
  };

  const saveHtmlChanges = () => {
    handleUpdateSlide(currentIndex, { htmlContent: tempHtml });
    setShowHtmlEditor(false);
  };

  const handleRichDownload = async () => {
    if (isGeneratingPptx) return;
    setIsGeneratingPptx(true);

    try {
        const container = captureContainerRef.current;
        if (!container) throw new Error("Capture container not found");

        const capturedSlides: { dataUrl: string, notes: string }[] = [];

        // Temporarily render each slide into the hidden container and snapshot it
        // IMPORTANT: We iterate over 'slides' (local state) not 'data.slides' to capture edits
        for (const slide of slides) {
            // We inject the HTML directly. We apply the same wrapper classes as SlidePreview
            // to ensure it looks identical.
            container.innerHTML = `
                <div class="w-full h-full bg-white text-slate-900 font-sans overflow-hidden relative">
                    <div class="h-full w-full">
                        ${slide.htmlContent}
                    </div>
                </div>
            `;
            
            // Allow a brief moment for fonts/images to settle if needed.
            await new Promise(r => setTimeout(r, 200));

            const dataUrl = await toPng(container, {
                quality: 0.95,
                pixelRatio: 1.5,
                width: 1280,
                height: 720,
                skipFonts: true,
                backgroundColor: 'white',
                style: {
                    opacity: '1',
                    visibility: 'visible',
                    zIndex: 'auto'
                }
            });

            capturedSlides.push({
                dataUrl,
                notes: slide.speakerNotes
            });
        }

        // Generate PPTX from images
        const pptx = createPptxFromImages(capturedSlides, data.title);
        await pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}.pptx` });

    } catch (e) {
        console.error("Failed to generate rich PPTX", e);
        alert("Could not generate high-fidelity slides. Downloading simplified version instead.");
        onDownload(); 
    } finally {
        setIsGeneratingPptx(false);
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-m3-surface bg-dot-grid flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-m3-primaryContainer/30 to-transparent pointer-events-none" />

      {/* Capture Container (Hidden) */}
      <div 
        ref={captureContainerRef}
        style={{ 
            position: 'fixed', top: 0, left: 0, width: '1280px', height: '720px', 
            zIndex: -1, opacity: 0, pointerEvents: 'none'
        }}
      ></div>

      {/* Top Bar */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
         <div className="flex flex-col">
            <h2 className="text-xl font-medium text-m3-onSurface">{data.title}</h2>
            <span className="text-sm text-m3-onSurfaceVariant">Slide {currentIndex + 1} of {slides.length}</span>
         </div>
         <button 
           onClick={onClose}
           className="w-12 h-12 rounded-full hover:bg-m3-onSurface/10 flex items-center justify-center transition-colors text-m3-onSurface"
         >
           <X className="w-6 h-6" />
         </button>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full h-full max-w-6xl max-h-[80vh] flex flex-col md:flex-row gap-6 z-10">
         
         {/* Slide Preview Container */}
         <div className="flex-1 bg-white rounded-[2rem] shadow-elevation-1 overflow-hidden relative border border-m3-outline/20 group">
            <SlidePreview slide={currentSlide} index={currentIndex} variant="full" />
            
            {/* Edit HTML Overlay Button */}
            {isEditing && (
              <div className="absolute inset-0 bg-m3-onSurface/5 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                 <button 
                    onClick={openHtmlEditor}
                    className="flex items-center gap-2 px-6 py-3 bg-m3-primaryContainer text-m3-onPrimaryContainer rounded-full font-medium shadow-elevation-3 hover:scale-105 transition-transform"
                 >
                    <Code className="w-5 h-5" />
                    Edit Slide Source
                 </button>
              </div>
            )}
         </div>

         {/* Speaker Notes (Side Panel) */}
         {showNotes && (
             <div className={`w-full md:w-80 backdrop-blur-sm rounded-[2rem] p-6 overflow-hidden animate-in slide-in-from-right-10 shrink-0 border border-white/40 flex flex-col ${isEditing ? 'bg-m3-surfaceVariant/80' : 'bg-m3-primaryContainer/30'}`}>
                <div className="flex items-center gap-2 mb-4 text-m3-primary shrink-0">
                    <StickyNote className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wide">Speaker Notes</span>
                </div>
                
                {isEditing ? (
                  <textarea 
                    className="w-full h-full bg-transparent resize-none outline-none text-m3-onSurface text-base leading-relaxed p-2 -ml-2 rounded-lg focus:bg-white/50 transition-colors"
                    value={currentSlide.speakerNotes}
                    onChange={(e) => handleUpdateSlide(currentIndex, { speakerNotes: e.target.value })}
                    placeholder="Enter speaker notes here..."
                  />
                ) : (
                  <div className="overflow-y-auto h-full">
                    <p className="text-m3-onSurface text-base leading-relaxed whitespace-pre-wrap">
                        {currentSlide.speakerNotes || "No notes for this slide."}
                    </p>
                  </div>
                )}
             </div>
         )}
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-8 bg-m3-surfaceVariant/90 backdrop-blur-md border border-white/20 shadow-elevation-3 rounded-full h-16 px-2 flex items-center gap-2 z-20">
          
          <button 
            onClick={() => setCurrentIndex(c => Math.max(c - 1, 0))}
            disabled={currentIndex === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-m3-onSurface/10 disabled:opacity-30 text-m3-onSurface transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="h-8 w-px bg-m3-onSurfaceVariant/20 mx-1"></div>

          {/* Toggle Notes */}
          <button 
             onClick={() => setShowNotes(!showNotes)}
             className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium transition-colors ${showNotes && !isEditing ? 'bg-m3-primaryContainer text-m3-onPrimaryContainer' : 'hover:bg-m3-onSurface/10 text-m3-onSurface'}`}
          >
             <StickyNote className="w-4 h-4" />
             <span className="hidden sm:inline">Notes</span>
          </button>

          {/* Toggle Edit Mode */}
          <button 
             onClick={() => setIsEditing(!isEditing)}
             className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm font-medium transition-colors ${isEditing ? 'bg-m3-secondary text-white shadow-inner' : 'hover:bg-m3-onSurface/10 text-m3-onSurface'}`}
          >
             <Pencil className="w-4 h-4" />
             <span className="hidden sm:inline">{isEditing ? 'Done Editing' : 'Edit'}</span>
          </button>

          <div className="h-8 w-px bg-m3-onSurfaceVariant/20 mx-1"></div>

          <button 
             onClick={handleRichDownload}
             disabled={isGeneratingPptx}
             className="h-10 px-6 rounded-full bg-m3-primary text-m3-onPrimary flex items-center gap-2 text-sm font-medium hover:bg-opacity-90 transition-transform active:scale-95 shadow-sm disabled:opacity-70 disabled:active:scale-100"
          >
             {isGeneratingPptx ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                </>
             ) : (
                <>
                    <Download className="w-4 h-4" />
                    Download
                </>
             )}
          </button>

          <div className="h-8 w-px bg-m3-onSurfaceVariant/20 mx-1"></div>

          <button 
            onClick={() => setCurrentIndex(c => Math.min(c + 1, slides.length - 1))}
            disabled={currentIndex === slides.length - 1}
            className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-m3-onSurface/10 disabled:opacity-30 text-m3-onSurface transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

      </div>

      {/* HTML Editor Modal */}
      {showHtmlEditor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-m3-surface w-full max-w-4xl h-[80vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
              <div className="p-6 border-b border-m3-outline/20 flex justify-between items-center bg-m3-surfaceVariant/30">
                 <div>
                    <h3 className="text-lg font-bold text-m3-onSurface">Edit Slide Source</h3>
                    <p className="text-xs text-m3-onSurfaceVariant">Modify the HTML/Tailwind classes directly.</p>
                 </div>
                 <button onClick={() => setShowHtmlEditor(false)} className="p-2 hover:bg-m3-onSurface/10 rounded-full">
                    <X className="w-6 h-6 text-m3-onSurface" />
                 </button>
              </div>
              
              <div className="flex-1 p-0 relative">
                 <textarea 
                    className="w-full h-full p-6 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] resize-none outline-none focus:ring-0"
                    value={tempHtml}
                    onChange={(e) => setTempHtml(e.target.value)}
                    spellCheck={false}
                 />
              </div>

              <div className="p-4 border-t border-m3-outline/20 flex justify-end gap-3 bg-m3-surfaceVariant/30">
                 <button 
                   onClick={() => setShowHtmlEditor(false)}
                   className="px-6 py-2 rounded-full font-medium text-m3-primary hover:bg-m3-primary/10 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={saveHtmlChanges}
                   className="px-6 py-2 rounded-full font-medium bg-m3-primary text-m3-onPrimary hover:opacity-90 transition-opacity flex items-center gap-2"
                 >
                   <Save className="w-4 h-4" />
                   Save Changes
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default SlideViewer;