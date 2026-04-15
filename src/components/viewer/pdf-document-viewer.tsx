'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

import { cn } from '@/lib/utils';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

if (typeof window !== 'undefined') {
  console.log('[PdfViewer] pdfjs.version:', pdfjs.version);
  console.log('[PdfViewer] workerSrc:', pdfjs.GlobalWorkerOptions.workerSrc);

  const origFetch = window.fetch;
  const patchedFetch: typeof window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    if (url.includes('pdf.worker')) {
      console.log('[PdfViewer] Worker fetch:', url);
      const resp = await origFetch(input, init);
      console.log('[PdfViewer] Worker fetch status:', resp.status, resp.headers.get('content-type'));
      return resp;
    }
    return origFetch(input, init);
  };
  window.fetch = patchedFetch;
}

interface PdfDocumentViewerProps {
  currentPage: number;
  fileUrl: string;
  onPageChange: (pageNumber: number) => void;
  onPageCountChange?: (pageCount: number) => void;
  zoom?: number;
}

export function PdfDocumentViewer({
  currentPage,
  fileUrl,
  onPageChange,
  onPageCountChange,
  zoom = 1,
}: PdfDocumentViewerProps) {
  const pageViewportRef = useRef<HTMLDivElement | null>(null);
  const [loadedFileUrl, setLoadedFileUrl] = useState<string | null>(null);
  const [documentLandscape, setDocumentLandscape] = useState<boolean | null>(null);
  const [documentNumPages, setDocumentNumPages] = useState(0);
  const [documentLoadError, setDocumentLoadError] = useState<string | null>(null);
  const [pageWidth, setPageWidth] = useState(820);
  const numPages = loadedFileUrl === fileUrl ? documentNumPages : 0;
  const loadError = loadedFileUrl === fileUrl ? documentLoadError : null;
  const isLandscapeDocument = loadedFileUrl === fileUrl ? documentLandscape : null;

  useEffect(() => {
    const pageViewport = pageViewportRef.current;

    if (!pageViewport) {
      return;
    }

    const updatePageWidth = () => {
      const availableWidth = Math.floor(pageViewport.clientWidth);

      if (availableWidth <= 0) {
        return;
      }

      const nextWidth = isLandscapeDocument
        ? availableWidth
        : Math.min(920, availableWidth);

      setPageWidth(Math.max(Math.min(availableWidth, 280), nextWidth));
    };

    updatePageWidth();

    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(pageViewport);

    return () => observer.disconnect();
  }, [fileUrl, isLandscapeDocument, numPages]);

  const clampedCurrentPage = numPages > 0 ? Math.min(Math.max(currentPage, 1), numPages) : 1;
  const canGoToPreviousPage = clampedCurrentPage > 1;
  const canGoToNextPage = numPages > 0 && clampedCurrentPage < numPages;

  return (
    <div className="h-full overflow-auto px-4 py-6 sm:px-6 sm:py-8">
      <Document
        file={fileUrl}
        loading={
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-card px-8 py-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
              <p className="text-sm text-muted-foreground">Loading secure PDF preview...</p>
            </div>
          </div>
        }
        onLoadError={(error) => {
          console.error('[PdfViewer] Document load error:', error);
          setLoadedFileUrl(fileUrl);
          setDocumentLandscape(null);
          setDocumentLoadError(error.message);
          setDocumentNumPages(0);
        }}
        onLoadSuccess={(pdf: { numPages: number }) => {
          console.log('[PdfViewer] Document loaded:', pdf.numPages, 'pages');
          console.log('[PdfViewer] PDF fingerprint:', (pdf as Record<string, unknown>).fingerprints);
          setLoadedFileUrl(fileUrl);
          setDocumentLandscape(null);
          setDocumentLoadError(null);
          setDocumentNumPages(pdf.numPages);
          onPageCountChange?.(pdf.numPages);

          if (currentPage < 1) {
            onPageChange(1);
            return;
          }

          if (currentPage > pdf.numPages) {
            onPageChange(pdf.numPages);
          }
        }}
      >
        {loadError ? (
          <div className="mx-auto flex min-h-[420px] w-full max-w-[980px] items-center justify-center rounded-2xl border border-danger/30 bg-card px-8 py-12 text-center">
            <div className="max-w-md space-y-2">
              <p className="text-base font-semibold text-foreground">Unable to render this PDF.</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'mx-auto grid min-h-full w-full items-center',
              numPages > 1 ? 'grid-cols-[auto_minmax(0,1fr)_auto] gap-2 sm:gap-4' : 'grid-cols-[minmax(0,1fr)]',
              isLandscapeDocument ? 'max-w-none' : 'max-w-[1080px]',
            )}
          >
            {numPages > 1 ? (
              <button
                type="button"
                aria-label="Previous page"
                disabled={!canGoToPreviousPage}
                onClick={() => onPageChange(clampedCurrentPage - 1)}
                className="z-10 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-border bg-card/90 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}

            <div
              className={cn(
                'flex min-w-0 items-center justify-center',
                numPages > 1 ? (isLandscapeDocument ? 'px-0' : 'px-1 sm:px-2') : '',
              )}
            >
              <div ref={pageViewportRef} className="flex w-full min-w-0 items-center justify-center">
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                  <Page
                    key={`${fileUrl}:${clampedCurrentPage}:${Math.round(pageWidth * zoom)}`}
                    loading={
                      <div className="flex h-[480px] items-center justify-center bg-white text-sm text-slate-500">
                        Rendering page {clampedCurrentPage}...
                      </div>
                    }
                    onLoadSuccess={(page: { originalHeight: number; originalWidth: number }) => {
                      if (clampedCurrentPage === 1) {
                        setDocumentLandscape(page.originalWidth > page.originalHeight);
                      }
                    }}
                    onRenderError={(error) =>
                      console.error('[PdfViewer] Page render error:', clampedCurrentPage, error)
                    }
                    onRenderSuccess={() =>
                      console.log(
                        '[PdfViewer] Page rendered successfully:',
                        clampedCurrentPage,
                        'width:',
                        Math.round(pageWidth * zoom),
                      )
                    }
                    pageNumber={clampedCurrentPage}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    width={Math.round(pageWidth * zoom)}
                  />
                </div>
              </div>
            </div>

            {numPages > 1 ? (
              <button
                type="button"
                aria-label="Next page"
                disabled={!canGoToNextPage}
                onClick={() => onPageChange(clampedCurrentPage + 1)}
                className="z-10 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-border bg-card/90 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11"
              >
                <ChevronRight size={20} />
              </button>
            ) : null}
          </div>
        )}
      </Document>
    </div>
  );
}
