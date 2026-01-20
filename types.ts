export interface Commit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}

// Removed rigid 'SlideLayout' enum. Gemini now designs the layout.

export interface PptxSlideContent {
  title: string;
  mainPoint: string;
  bullets: string[];
  codeBlock?: string;
}

export interface PresentationSlide {
  // This is the visual HTML code Gemini generates for the web view
  htmlContent: string;
  
  // This is the structured data for the PPTX export
  pptxContent: PptxSlideContent;
  
  speakerNotes: string;
}

export interface PresentationData {
  title: string;
  subtitle: string;
  slides: PresentationSlide[];
}

export interface RepoConfig {
  owner: string;
  repo: string;
  token: string;
  startDate: string;
  endDate: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  FETCHING_COMMITS = 'FETCHING_COMMITS',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}