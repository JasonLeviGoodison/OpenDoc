'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfDocumentViewerProps {
  currentPage: number;
  fileUrl: string;
  onPageChange: (pageNumber: number) => void;
  onPageCountChange?: (pageCount: number) => void;
  zoom?: number;
}

function getVisibleRatio(container: HTMLElement, element: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const visibleHeight =
    Math.min(containerRect.bottom, elementRect.bottom) - Math.max(containerRect.top, elementRect.top);

  return Math.max(0, visibleHeight) / Math.max(elementRect.height, 1);
}

export function PdfDocumentViewer({
  currentPage,
  fileUrl,
  onPageChange,
  onPageCountChange,
  zoom = 1,
}: PdfDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const pageVisibilityRef = useRef(new Map<number, number>());
  const scrollReleaseTimeoutRef = useRef<number | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(820);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const updatePageWidth = () => {
      setPageWidth(Math.max(280, Math.min(920, Math.floor(container.clientWidth - 64))));
    };

    updatePageWidth();

    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!numPages) {
      return;
    }

    const container = containerRef.current;
    const targetPage = pageRefs.current.get(currentPage);

    if (!container || !targetPage) {
      return;
    }

    const currentRatio = getVisibleRatio(container, targetPage);

    if (currentRatio >= 0.6) {
      return;
    }

    targetPage.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    if (scrollReleaseTimeoutRef.current) {
      window.clearTimeout(scrollReleaseTimeoutRef.current);
    }

    scrollReleaseTimeoutRef.current = window.setTimeout(() => {
      scrollReleaseTimeoutRef.current = null;
    }, 250);

    return () => {
      if (scrollReleaseTimeoutRef.current) {
        window.clearTimeout(scrollReleaseTimeoutRef.current);
        scrollReleaseTimeoutRef.current = null;
      }
    };
  }, [currentPage, numPages]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || numPages < 1) {
      return;
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset.pageNumber);

          if (!Number.isInteger(pageNumber) || pageNumber < 1) {
            continue;
          }

          pageVisibilityRef.current.set(pageNumber, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let nextVisiblePage = currentPage;
        let nextVisibleRatio = pageVisibilityRef.current.get(currentPage) ?? 0;

        for (const [pageNumber, ratio] of pageVisibilityRef.current.entries()) {
          if (ratio > nextVisibleRatio) {
            nextVisiblePage = pageNumber;
            nextVisibleRatio = ratio;
          }
        }

        if (nextVisiblePage !== currentPage && nextVisibleRatio > 0) {
          onPageChange(nextVisiblePage);
        }
      },
      {
        root: container,
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    for (const element of pageRefs.current.values()) {
      intersectionObserver.observe(element);
    }

    return () => intersectionObserver.disconnect();
  }, [currentPage, numPages, onPageChange]);

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

          if (currentPage > loadedPages) {
            onPageChange(loadedPages);
          }
        }}
      >
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center gap-6">
          {loadError ? (
            <div className="flex min-h-[420px] w-full items-center justify-center rounded-2xl border border-danger/30 bg-card px-8 py-12 text-center">
              <div className="max-w-md space-y-2">
                <p className="text-base font-semibold text-foreground">Unable to render this PDF.</p>
                <p className="text-sm text-muted-foreground">{loadError}</p>
              </div>
            </div>
          ) : null}

          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;

            return (
              <div
                key={pageNumber}
                ref={(node) => {
                  if (node) {
                    pageRefs.current.set(pageNumber, node);
                  } else {
                    pageRefs.current.delete(pageNumber);
                    pageVisibilityRef.current.delete(pageNumber);
                  }
                }}
                data-page-number={pageNumber}
                className="w-full"
              >
                <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Page {pageNumber}
                </div>
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                  <Page
                    loading={
                      <div className="flex h-[480px] items-center justify-center bg-white text-sm text-slate-500">
                        Rendering page {pageNumber}...
                      </div>
                    }
                    pageNumber={pageNumber}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    width={Math.max(280, Math.round(pageWidth * zoom))}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Document>
    </div>
  );
}
