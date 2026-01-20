import React, { useState } from 'react';
import { RepoConfig, PresentationData, AppStatus } from './types';
import { fetchCommits } from './services/githubService';
import { generatePresentation } from './services/geminiService';
import { createPptx } from './services/pptService';
import ConfigForm from './components/ConfigForm';
import SlideViewer from './components/SlideViewer';
import { Sparkles, AlertCircle } from 'lucide-react';

export default function App() {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const handleGenerate = async (config: RepoConfig) => {
    setStatus(AppStatus.FETCHING_COMMITS);
    setError(null);
    setStatusMessage('Connecting to GitHub...');

    try {
      setStatusMessage(`Fetching commits...`);
      const commits = await fetchCommits(config.owner, config.repo, config.token, config.startDate, config.endDate);
      
      if (commits.length === 0) {
        throw new Error('No commits found in the selected date range.');
      }

      setStatus(AppStatus.ANALYZING);
      setStatusMessage(`Analyzing ${commits.length} commits with Gemini 3...`);
      const data = await generatePresentation(config.repo, commits, config.startDate, config.endDate);
      
      setPresentationData(data);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred');
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDownload = () => {
    if (!presentationData) return;
    const pptx = createPptx(presentationData);
    pptx.writeFile({ fileName: `${presentationData.title.replace(/\s+/g, '_')}.pptx` });
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setPresentationData(null);
    setError(null);
  };

  // --- VIEWER MODE ---
  if (status === AppStatus.SUCCESS && presentationData) {
    return (
      <SlideViewer 
        data={presentationData} 
        onClose={handleReset} 
        onDownload={handleDownload} 
      />
    );
  }

  // --- HERO / FORM LAYOUT ---
  return (
    <div className="h-full w-full bg-dot-grid flex flex-col items-center justify-center p-4 relative">
      
      {/* Decorative Blur */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-m3-primaryContainer/30 to-transparent pointer-events-none" />

      {/* Main Content Card */}
      <div className="w-full max-w-lg z-10 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header */}
        <div className="text-center space-y-2">
           <h1 className="text-4xl md:text-5xl font-normal text-m3-onSurface tracking-tight">
             CommitToSlides
           </h1>
           <p className="text-m3-onSurfaceVariant text-lg">
             Turn your git history into a presentation instantly.
           </p>
           
           {/* Invisible SEO Tags - Visible to bots, hidden from users (Screen Reader Only) */}
           <div className="sr-only">
             <h1>GitHub to PPT Converter</h1>
             <h2>Turn Git Commits into PowerPoint Presentation</h2>
             <p>
               Generate GitHub commits to PPT slides with AI. 
               Convert git log to PowerPoint presentation. 
               Automated changelog generator for developers. 
               GitHub repository to slides converter tool. 
               Git history visualizer for software engineering teams.
               Export commit history to PPTX file.
               AI-powered presentation tool for software engineers.
               Sprint review slide generator.
               Hackathon presentation maker from code.
               Visualize git contributions for performance reviews.
               Gemini AI for code analysis and reporting.
               Create slides from GitHub repo automatically.
             </p>
           </div>
        </div>

        {/* M3 Card */}
        <div className="bg-m3-surface rounded-[2rem] p-8 shadow-elevation-3 border border-white/50">
           
           {status === AppStatus.IDLE ? (
              <ConfigForm onSubmit={handleGenerate} isLoading={false} />
           ) : (
              /* Loading / Error State */
              <div className="py-12 flex flex-col items-center text-center">
                 
                 {(status === AppStatus.FETCHING_COMMITS || status === AppStatus.ANALYZING) && (
                    <>
                      <div className="w-16 h-16 mb-6 relative">
                         <div className="absolute inset-0 rounded-full border-4 border-m3-surfaceVariant"></div>
                         <div className="absolute inset-0 rounded-full border-4 border-m3-primary border-t-transparent animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-m3-primary animate-pulse" />
                         </div>
                      </div>
                      <h3 className="text-xl text-m3-onSurface font-medium mb-2">{statusMessage}</h3>
                      <p className="text-m3-onSurfaceVariant text-sm">This might take a moment.</p>
                    </>
                 )}

                 {status === AppStatus.ERROR && (
                    <div className="flex flex-col items-center">
                       <div className="w-12 h-12 bg-red-100 text-m3-error rounded-full flex items-center justify-center mb-4">
                          <AlertCircle className="w-6 h-6" />
                       </div>
                       <h3 className="text-xl text-m3-onSurface font-medium mb-2">Something went wrong</h3>
                       <p className="text-m3-onSurfaceVariant text-sm mb-6 max-w-xs">{error}</p>
                       <button 
                         onClick={handleReset}
                         className="h-10 px-6 rounded-full bg-m3-surfaceVariant text-m3-onSurfaceVariant hover:bg-gray-200 font-medium text-sm transition-colors"
                       >
                         Try Again
                       </button>
                    </div>
                 )}
              </div>
           )}

        </div>

      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-6 text-m3-onSurfaceVariant/50 text-xs font-medium">
         Powered by Gemini 3 Flash Preview
      </div>

    </div>
  );
}