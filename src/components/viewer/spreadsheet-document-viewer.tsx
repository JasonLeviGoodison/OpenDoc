'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { cn } from '@/lib/utils';

import { ScaledPreview } from '@/components/viewer/scaled-preview';
import { useSecureDocumentBinary } from '@/components/viewer/use-secure-document-binary';
import { ViewerLoadingState, ViewerMessageState } from '@/components/viewer/viewer-states';

interface WorkbookSheetPreview {
  html: string;
  name: string;
}

interface SpreadsheetDocumentViewerProps {
  fileUrl: string;
  viewerToken?: string | null;
  zoom?: number;
}

function extractSheetBodyHtml(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return parsed.body.innerHTML || html;
}

export function SpreadsheetDocumentViewer({
  fileUrl,
  viewerToken,
  zoom = 1,
}: SpreadsheetDocumentViewerProps) {
  const { data, error, loading } = useSecureDocumentBinary(fileUrl, viewerToken);
  const [activeSheetName, setActiveSheetName] = useState<string | null>(null);
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [renderedSheets, setRenderedSheets] = useState<WorkbookSheetPreview[]>([]);
  const [rendering, setRendering] = useState(false);

  const loadWorkbook = useEffectEvent(async (buffer: ArrayBuffer) => {
    setParsed(false);
    setRendering(true);

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(new Uint8Array(buffer), {
        cellStyles: true,
        type: 'array',
      });

      const nextSheets = workbook.SheetNames.map((name) => ({
        html: extractSheetBodyHtml(XLSX.utils.sheet_to_html(workbook.Sheets[name])),
        name,
      }));

      setRenderedSheets(nextSheets);
      setActiveSheetName((currentSheetName) => {
        if (currentSheetName && nextSheets.some((sheet) => sheet.name === currentSheetName)) {
          return currentSheetName;
        }

        return nextSheets[0]?.name ?? null;
      });
      setParseError(null);
    } catch (workbookError) {
      setRenderedSheets([]);
      setActiveSheetName(null);
      setParseError(workbookError instanceof Error ? workbookError.message : 'Unable to parse the workbook.');
    } finally {
      setParsed(true);
      setRendering(false);
    }
  });

  useEffect(() => {
    if (!data) {
      setParsed(false);
      setRenderedSheets([]);
      setActiveSheetName(null);
      return;
    }

    void loadWorkbook(data);
  }, [data]);

  if (loading || rendering || (data && !parsed)) {
    return <ViewerLoadingState label="Loading secure spreadsheet preview..." />;
  }

  if (error || parseError) {
    return (
      <ViewerMessageState
        title="Unable to render this spreadsheet."
        description={error || parseError || 'The secure workbook preview could not be loaded.'}
      />
    );
  }

  if (renderedSheets.length === 0) {
    return (
      <ViewerMessageState
        title="Spreadsheet preview unavailable"
        description="This workbook did not produce any visible sheets in the in-browser preview."
      />
    );
  }

  const activeSheet =
    renderedSheets.find((sheet) => sheet.name === activeSheetName) ?? renderedSheets[0];

  return (
    <div className="flex h-full flex-col">
      {renderedSheets.length > 1 ? (
        <div className="border-b border-border bg-card/80 px-6 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {renderedSheets.map((sheet) => (
              <button
                key={sheet.name}
                onClick={() => setActiveSheetName(sheet.name)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors',
                  activeSheet.name === sheet.name
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground',
                )}
              >
                {sheet.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ScaledPreview zoom={zoom} className="flex-1">
        <div className="viewer-html-surface viewer-sheet-surface">
          <div
            className="viewer-sheet-root"
            dangerouslySetInnerHTML={{
              __html: activeSheet.html,
            }}
          />
        </div>
      </ScaledPreview>
    </div>
  );
}
