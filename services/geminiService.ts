import { GoogleGenAI, Type } from "@google/genai";
import { Commit, PresentationData, PresentationSlide } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generatePresentation = async (
  repoName: string,
  commits: Commit[],
  startDate: string,
  endDate: string
): Promise<PresentationData> => {
  if (commits.length === 0) {
    throw new Error("No commits found in the specified range.");
  }

  // Prepare context for Gemini
  // INCREASED LIMITS: 3000 chars per diff, 15 files per commit.
  const commitsContext = commits.map(c => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message,
    date: c.commit.author.date,
    author: c.commit.author.name,
    files: (c.files || []).map(f => ({
      filename: f.filename,
      status: f.status,
      // Massive increase in diff context to allow Gemini to understand the code changes
      diff: f.patch ? f.patch.substring(0, 3000) + (f.patch.length > 3000 ? '...[truncated]' : '') : 'Binary or large file'
    })).slice(0, 15) 
  }));

  const prompt = `
    You are a World-Class Technical Speaker and UI Designer. 
    You are analyzing the git history of **${repoName}** from ${startDate} to ${endDate}.
    
    **YOUR TASK**: 
    Create a highly detailed, visually stunning presentation about the work done in this period.
    
    **QUANTITY**:
    Generate **15 to 30 slides**. Do not skimp. If there are many commits, group them logically but give each major feature/refactor its own slide.
    
    **VISUAL STYLE (CRITICAL)**:
    - You are NOT generating JSON data for a template. You are generating the **HTML STRING** for each slide directly.
    - Use **Tailwind CSS**.
    - Follow **Material Design 3 (M3) Expressive** guidelines implicitly.
    - Use these tokens/styles in your HTML:
      - Fonts: 'font-sans' (Google Sans).
      - Shapes: 'rounded-[2rem]' or 'rounded-3xl' for cards.
      - Colors: Use soft backgrounds ('bg-[#FEF7FF]', 'bg-[#F3E5F5]') and strong text ('text-[#1D1B20]', 'text-[#6750A4]').
      - Shadows: 'shadow-lg', 'shadow-xl'.
    - **Layouts**: Be creative! Use grids, big hero text, split screens, code blocks with syntax highlighting colors (simulated with spans), stat cards, timeline views.
    - The HTML container will be 16:9 aspect ratio.
    
    **CONTENT STRATEGY**:
    1.  **Title Slide**: Big, bold, impactful.
    2.  **Executive Summary**: High-level achievements.
    3.  **The Story**: Don't just list commits. Narrate the development journey.
    4.  **Deep Dives**: For complex commits, show the code changes in a nice code block component.
    5.  **People**: Celebrate the contributors.
    6.  **Stats**: Use grid layouts to show files changed, insertions, etc.
    
    **DATA STRUCTURE**:
    For each slide, return:
    1.  \`htmlContent\`: The full HTML string (excluding <html>/<body> tags, just the inner slide content).
    2.  \`pptxContent\`: A simplified object for generating a PowerPoint file (since PPTX cannot render HTML).
    3.  \`speakerNotes\`: Detailed script for the presenter.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: JSON.stringify(commitsContext),
    config: {
      systemInstruction: prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subtitle: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                htmlContent: { 
                    type: Type.STRING, 
                    description: "The complete HTML/Tailwind string for the slide visual. Use inline styles or Tailwind classes. Root element should be a div with h-full w-full."
                },
                pptxContent: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        mainPoint: { type: Type.STRING },
                        bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
                        codeBlock: { type: Type.STRING }
                    },
                    required: ['title', 'mainPoint', 'bullets']
                },
                speakerNotes: { type: Type.STRING }
              },
              required: ['htmlContent', 'pptxContent', 'speakerNotes']
            }
          }
        },
        required: ['title', 'subtitle', 'slides']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  const parsed = JSON.parse(text) as PresentationData;
  return parsed;
};