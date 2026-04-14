'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(820);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updatePageWidth = () => {
      setPageWidth(Math.max(280, Math.min(920, Math.floor(container.clientWidth - 144))));
    };

    updatePageWidth();

    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const clampedCurrentPage = numPages > 0 ? Math.min(Math.max(currentPage, 1), numPages) : 1;
  const canGoToPreviousPage = clampedCurrentPage > 1;
  const canGoToNextPage = numPages > 0 && clampedCurrentPage < numPages;

  return (
    <div ref={containerRef} className="h-full overflow-auto px-6 py-8">
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
          setLoadError(error.message);
          setNumPages(0);
        }}
        onLoadSuccess={({ numPages: loadedPages }: { numPages: number }) => {
          setLoadError(null);
          setNumPages(loadedPages);
          onPageCountChange?.(loadedPages);

          if (currentPage < 1) {
            onPageChange(1);
            return;
          }

          if (currentPage > loadedPages) {
            onPageChange(loadedPages);
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
          <div className="relative mx-auto flex min-h-full w-full max-w-[1080px] items-center justify-center">
            {numPages > 1 ? (
              <button
                type="button"
                aria-label="Previous page"
                disabled={!canGoToPreviousPage}
                onClick={() => onPageChange(clampedCurrentPage - 1)}
                className="absolute left-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
            ) : null}

            <div className="flex w-full items-center justify-center px-14">
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <Page
                  key={`${fileUrl}:${clampedCurrentPage}:${Math.round(pageWidth * zoom)}`}
                  loading={
                    <div className="flex h-[480px] items-center justify-center bg-white text-sm text-slate-500">
                      Rendering page {clampedCurrentPage}...
                    </div>
                  }
                  pageNumber={clampedCurrentPage}
                  renderAnnotationLayer={false}
                  renderTextLayer={false}
                  width={Math.max(280, Math.round(pageWidth * zoom))}
                />
              </div>
            </div>

            {numPages > 1 ? (
              <button
                type="button"
                aria-label="Next page"
                disabled={!canGoToNextPage}
                onClick={() => onPageChange(clampedCurrentPage + 1)}
                className="absolute right-0 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-30"
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
