import React, { useState } from 'react';
import { RepoConfig } from '../types';
import { ArrowRight } from 'lucide-react';

interface ConfigFormProps {
  onSubmit: (config: RepoConfig) => void;
  isLoading: boolean;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ onSubmit, isLoading }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(lastMonth);
  const [endDate, setEndDate] = useState(today);

  const extractRepoDetails = (url: string) => {
    try {
      let clean = url.trim().replace(/\/+$/, '').replace(/\.git$/, '');
      if (/^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(clean)) {
         const [owner, repo] = clean.split('/');
         return { owner, repo };
      }
      if (!clean.startsWith('http')) {
        clean = 'https://' + clean;
      }
      const urlObj = new URL(clean);
      if (!urlObj.hostname.includes('github.com')) {
        return null;
      }
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return { owner: parts[0], repo: parts[1] };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const details = extractRepoDetails(repoUrl);
    if (!details) {
      setError('Invalid GitHub URL');
      return;
    }
    if (startDate && endDate) {
      onSubmit({ 
        owner: details.owner, 
        repo: details.repo, 
        token: token.trim(), 
        startDate, 
        endDate 
      });
    }
  };

  // M3 Filled Input Component
  const M3Input = ({ label, type = "text", value, onChange, placeholder, required = false, helperText }: any) => (
    <div className="mb-4">
      <div className="relative group bg-m3-surfaceVariant rounded-t-xl border-b border-m3-onSurfaceVariant/40 hover:bg-m3-onSurface/5 focus-within:border-m3-primary transition-colors">
        <label className="absolute top-2 left-4 text-xs text-m3-onSurfaceVariant group-focus-within:text-m3-primary transition-colors">
          {label} {required && '*'}
        </label>
        <input
          type={type}
          className="w-full h-14 pt-6 pb-2 px-4 bg-transparent outline-none text-m3-onSurface placeholder-transparent"
          value={value}
          onChange={onChange}
          placeholder={placeholder || label} // Placeholder needed for layout but hidden visually typically in M3 unless focused, but simple here.
          required={required}
        />
      </div>
      {helperText && <p className="mt-1 ml-4 text-xs text-m3-onSurfaceVariant/80">{helperText}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      
      <M3Input 
         label="GitHub Repository URL"
         value={repoUrl}
         onChange={(e: any) => { setRepoUrl(e.target.value); setError(''); }}
         helperText={error ? <span className="text-m3-error font-bold">{error}</span> : "e.g., https://github.com/facebook/react"}
         required
      />

      <M3Input 
         label="Personal Access Token"
         type="password"
         value={token}
         onChange={(e: any) => setToken(e.target.value)}
         helperText="Optional for public repos."
      />

      <div className="grid grid-cols-2 gap-4">
         <M3Input 
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e: any) => setStartDate(e.target.value)}
            required
         />
         <M3Input 
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e: any) => setEndDate(e.target.value)}
            required
         />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className={`
            h-12 px-8 rounded-full font-medium text-sm flex items-center gap-2 transition-all shadow-elevation-1 hover:shadow-elevation-3
            ${isLoading 
               ? 'bg-m3-onSurface/10 text-m3-onSurface/40 cursor-not-allowed shadow-none' 
               : 'bg-m3-primary text-m3-onPrimary hover:bg-opacity-90 active:scale-95'
            }
          `}
        >
          {isLoading ? 'Processing...' : 'Generate Slides'}
          {!isLoading && <ArrowRight className="w-5 h-5" />}
        </button>
      </div>

    </form>
  );
};

export default ConfigForm;