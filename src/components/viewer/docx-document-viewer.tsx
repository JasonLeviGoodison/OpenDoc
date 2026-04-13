'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { ScaledPreview } from '@/components/viewer/scaled-preview';
import { useSecureDocumentBinary } from '@/components/viewer/use-secure-document-binary';
import { ViewerLoadingState, ViewerMessageState } from '@/components/viewer/viewer-states';
import { normalizeViewerFileType } from '@/lib/viewer';

interface DocxDocumentViewerProps {
  fileType: string;
  fileUrl: string;
  viewerToken?: string | null;
  zoom?: number;
}

export function DocxDocumentViewer({
  fileType,
  fileUrl,
  viewerToken,
  zoom = 1,
}: DocxDocumentViewerProps) {
  const normalizedFileType = normalizeViewerFileType(fileType);
  const { data, error, loading } = useSecureDocumentBinary(
    normalizedFileType === 'docx' ? fileUrl : null,
    viewerToken,
  );
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [rendered, setRendered] = useState(false);

  const loadDocument = useEffectEvent(async (buffer: ArrayBuffer) => {
    const target = bodyRef.current;

    if (!target) {
      return;
    }

    setRendered(false);
    setRendering(true);

    try {
      const { renderAsync } = await import('docx-preview');

      target.innerHTML = '';

      await renderAsync(buffer, target, target, {
        breakPages: true,
        className: 'opendoc-docx',
        ignoreFonts: false,
        useBase64URL: true,
      });

      setRendered(true);
      setParseError(null);
    } catch (documentError) {
      setRendered(false);
      setParseError(documentError instanceof Error ? documentError.message : 'Unable to parse the document.');
    } finally {
      setRendering(false);
    }
  });

  useEffect(() => {
    if (!data) {
      setRendered(false);

      if (bodyRef.current) {
        bodyRef.current.innerHTML = '';
      }

      return;
    }

    void loadDocument(data);
  }, [data]);

  if (normalizedFileType !== 'docx') {
    return (
      <ViewerMessageState
        title="Legacy Word preview unavailable"
        description="Only modern .docx files can be rendered securely in the in-app preview. Convert legacy .doc files to .docx to remove third-party viewer controls."
      />
    );
  }

  if (loading || rendering) {
    return <ViewerLoadingState label="Loading secure document preview..." />;
  }

  if (error || parseError) {
    return (
      <ViewerMessageState
        title="Unable to render this document."
        description={error || parseError || 'The secure document preview could not be loaded.'}
      />
    );
  }

  return (
    <ScaledPreview zoom={zoom} className="h-full">
      <div className="viewer-html-surface viewer-docx-surface">
        <div ref={bodyRef} className="viewer-docx-root" />
        {!rendered ? (
          <div className="px-10 py-12 text-center text-sm text-muted-foreground">
            Preparing document preview...
          </div>
        ) : null}
      </div>
    </ScaledPreview>
  );
}
