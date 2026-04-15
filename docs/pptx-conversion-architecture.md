# Why PPTX Viewing Didn't Work — Full Story

## The Core Problem

OpenDoc needs to let users upload PPTX/DOCX/XLSX files and view them in the browser with per-page analytics. Browsers can't render Office files natively, so they must be converted to PDF first. The app used **LibreOffice** (`soffice --convert-to pdf`) to do this conversion — and it worked perfectly in local development.

**But OpenDoc runs on Vercel.** Vercel's serverless functions are lightweight Node.js containers with no system binaries. You can't install LibreOffice on Vercel. So in production, every Office file upload failed with: *"Trackable previews require LibreOffice (`soffice`) in the runtime environment."*

## The Solution: Gotenberg on Render

We needed LibreOffice running somewhere accessible to the Vercel app. The options were:

1. **Cloud conversion APIs** (CloudConvert, ConvertAPI) — per-file costs, third-party dependency
2. **Self-hosted conversion service** — one-time setup, no per-file fees

We went with **Gotenberg** — an open-source Docker container that wraps LibreOffice behind a clean REST API. You POST a file, you get back a PDF. We deployed it on **Render** as a Docker web service because Render supports arbitrary Docker images (unlike Vercel).

The OpenDoc flow became:

```
User uploads PPTX → Vercel receives it → POSTs to Gotenberg on Render → Gets PDF back → Stores in Supabase → Serves to viewer
```

## The Chain of Failures

### 1. Render service wouldn't start — out of memory

The Starter plan (512MB RAM) wasn't enough for LibreOffice. Upgraded to Standard (2GB). LibreOffice is a full office suite — it needs real memory.

### 2. Code wasn't pushed to GitHub

The `services/document-converter/` directory only existed locally. Render tried to build from the repo and couldn't find the directory. Had to commit and push.

### 3. pdfjs worker couldn't load on Vercel

After conversion, OpenDoc uses `pdfjs-dist` server-side to count pages in the PDF. pdfjs tries to load a Web Worker file (`pdf.worker.mjs`), which doesn't exist in Vercel's serverless file structure. Fixed by pre-loading the worker module into `globalThis.pdfjsWorker` so pdfjs uses it directly instead of trying to dynamically import the file.

### 4. react-pdf / pdfjs-dist version mismatch

The PDF viewer in the browser uses `react-pdf`, which bundles its own `pdfjs-dist@5.4.296`. But the project also had a top-level `pdfjs-dist@5.6.205`. The worker was loading from the wrong version, causing all PDFs (not just converted ones) to fail. Fixed by pointing the worker to the CDN with the exact version: `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`.

### 5. Missing fonts — text rendered as square boxes (tofu)

The Gotenberg Docker image had LibreOffice but no fonts beyond the bare minimum. The PPTX used Roboto (a Google Font). LibreOffice substituted an available font that didn't have the right glyphs → boxes. Fixed by installing Liberation, DejaVu, Noto, FreeFont, and a curated set of ~30 Google Fonts (Roboto, Open Sans, Lato, Montserrat, etc.) directly from the google/fonts repo.

### 6. Chrome rejected the embedded fonts — OTS parsing error

Even with correct fonts installed, the text still showed as boxes. The browser console revealed:

```
OTS parsing error: glyf: Bytecode length is bigger than maxp.maxSizeOfInstructions
```

This is a **known LibreOffice bug**. When LibreOffice subsets fonts during PDF export, it produces TrueType font data where the `glyf` table's bytecode length exceeds the declared maximum in the `maxp` table. Native PDF readers tolerate this, but Chrome's OpenType Sanitizer (OTS) is stricter and rejects the fonts entirely.

We tried:

- PDF/A mode (`pdfa=PDF/A-2b`) — didn't help, LibreOffice still produces the same bad tables
- Dehinting source fonts at Docker build time — didn't help, LibreOffice re-generates bytecode during subsetting regardless of the input fonts

**What finally worked:** After LibreOffice converts the PPTX to PDF, we make a second call to Gotenberg's `/forms/pdfengines/convert` endpoint, which passes the PDF through **Ghostscript**. Ghostscript re-encodes the embedded fonts from scratch with valid tables that pass Chrome's OTS validation.

## The Final Architecture

```
┌─────────────────────────────────────────────────┐
│  Vercel (Next.js)                               │
│                                                 │
│  1. User uploads PPTX                           │
│  2. POST file to Gotenberg                      │
│  3. Gotenberg returns PDF (fonts broken)        │
│  4. POST PDF back to Gotenberg pdfengines       │
│  5. Ghostscript re-encodes fonts (fonts clean)  │
│  6. Count pages with pdfjs                      │
│  7. Upload preview PDF to Supabase              │
│  8. Serve to react-pdf viewer in browser        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Render (Docker)                                │
│  Gotenberg 8.30.1 + LibreOffice + Ghostscript   │
│  + Google Fonts (Roboto, Open Sans, etc.)       │
│  Basic Auth over HTTPS                          │
│  Standard plan (2GB RAM)                        │
└─────────────────────────────────────────────────┘
```

The two-pass conversion (LibreOffice → Ghostscript) adds ~5-10 seconds but produces PDFs that render correctly in every browser.
