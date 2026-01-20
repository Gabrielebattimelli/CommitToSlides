# Architecture Overview

## Data Flow

1.  **Input**: User provides Repo URL + Date Range.
2.  **GitHub Service** (`services/githubService.ts`):
    - Fetches the list of commits within the date range.
    - Fetches detailed data (diffs/patches) for the top 50 commits to understand code changes.
3.  **Gemini Analysis** (`services/geminiService.ts`):
    - The commit data (messages, authors, diff snippets) is packaged into a prompt.
    - **Model**: `gemini-3-flash-preview` is used for its large context window and reasoning speed.
    - **Output**: The model returns a structured JSON object containing:
        - `htmlContent`: Raw HTML string for the slide visual (using Tailwind classes).
        - `speakerNotes`: A script for the presenter.
        - `pptxContent`: Structured text data (titles, bullets) as a fallback.
4.  **Presentation** (`components/SlideViewer.tsx`):
    - Renders the `htmlContent` safely inside a container.
    - Allows editing of local state (`slides` array).
5.  **Export** (`services/pptService.ts`):
    - **High Fidelity**: We render each slide into a hidden DOM container, use `html-to-image` to create a PNG, and place that PNG onto a PowerPoint slide using `pptxgenjs`. This ensures the exported file looks exactly like the web app.

## Key Design Decisions

-   **HTML Generation**: Instead of asking the AI for a JSON schema that maps to specific React components (which limits design flexibility), we ask the AI to generate raw **HTML strings with Tailwind classes**. This allows Gemini to be creative with layouts, grids, and typography without us needing to maintain a library of slide templates.
-   **Security**: HTML injection is generally dangerous. In this app, we assume the input comes strictly from the LLM. In a production environment with user sharing, sanitization (e.g., `DOMPurify`) would be mandatory.
-   **Snapshot Export**: PowerPoint's native rendering engine is very limited compared to CSS/HTML. To support gradients, rounded corners, and complex grids, we use the "Screenshot" approach for export.

## Directory Structure

```
/
├── components/         # React UI components
│   ├── ConfigForm.tsx  # Input form
│   ├── SlideViewer.tsx # Main presentation view & editor
│   └── SlidePreview.tsx# Individual slide renderer
├── services/           # Logic layer
│   ├── geminiService.ts# AI interaction
│   ├── githubService.ts# GitHub API interaction
│   └── pptService.ts   # Export logic
├── types.ts            # TypeScript interfaces
├── App.tsx             # Main entry controller
└── index.html          # Entry point & Tailwind config
```
