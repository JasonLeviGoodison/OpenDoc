'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { ScaledPreview } from '@/components/viewer/scaled-preview';
import { useSecureDocumentBinary } from '@/components/viewer/use-secure-document-binary';
import { ViewerLoadingState, ViewerMessageState } from '@/components/viewer/viewer-states';
import { normalizeViewerFileType } from '@/lib/viewer';

interface PresentationDocumentViewerProps {
  fileType: string;
  fileUrl: string;
  viewerToken?: string | null;
  zoom?: number;
}

export function PresentationDocumentViewer({
  fileType,
  fileUrl,
  viewerToken,
  zoom = 1,
}: PresentationDocumentViewerProps) {
  const normalizedFileType = normalizeViewerFileType(fileType);
  const { data, error, loading } = useSecureDocumentBinary(
    normalizedFileType === 'pptx' ? fileUrl : null,
    viewerToken,
  );
  const [parsed, setParsed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [slides, setSlides] = useState<string[]>([]);

  const loadSlides = useEffectEvent(async (buffer: ArrayBuffer) => {
    setParsed(false);
    setRendering(true);

    try {
      const { pptxToHtml } = await import('@jvmr/pptx-to-html');
      const nextSlides = await pptxToHtml(buffer);

      setSlides(nextSlides);
      setParseError(null);
    } catch (presentationError) {
      setSlides([]);
      setParseError(
        presentationError instanceof Error ? presentationError.message : 'Unable to parse the presentation.',
      );
    } finally {
      setParsed(true);
      setRendering(false);
    }
  });

  useEffect(() => {
    if (!data) {
      setParsed(false);
      setSlides([]);
      return;
    }

    void loadSlides(data);
  }, [data]);

  if (normalizedFileType !== 'pptx') {
    return (
      <ViewerMessageState
        title="Legacy PowerPoint preview unavailable"
        description="Only modern .pptx decks can be rendered securely in the in-app preview. Convert legacy .ppt files to .pptx to remove third-party viewer controls."
      />
    );
  }

  if (loading || rendering || (data && !parsed)) {
    return <ViewerLoadingState label="Loading secure slide preview..." />;
  }

  if (error || parseError) {
    return (
      <ViewerMessageState
        title="Unable to render this presentation."
        description={error || parseError || 'The secure slide preview could not be loaded.'}
      />
    );
  }

  if (slides.length === 0) {
    return (
      <ViewerMessageState
        title="Presentation preview unavailable"
        description="This deck did not produce any renderable slides in the in-browser preview."
      />
    );
  }

  return (
    <ScaledPreview zoom={zoom} className="h-full">
      <div className="flex flex-col gap-8">
        {slides.map((slideHtml, index) => (
          <div key={index} className="w-fit">
            <div className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Slide {index + 1}
            </div>
            <div className="overflow-hidden rounded-[24px] border border-border bg-[#111317] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div
                className="viewer-presentation-slide"
                dangerouslySetInnerHTML={{
                  __html: slideHtml,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </ScaledPreview>
  );
}
