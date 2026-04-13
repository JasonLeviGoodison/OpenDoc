'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

interface PreviewSize {
  height: number;
  width: number;
}

interface ScaledPreviewProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  zoom?: number;
}

export function ScaledPreview({
  children,
  className,
  contentClassName,
  zoom = 1,
}: ScaledPreviewProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<PreviewSize>({ height: 0, width: 0 });

  useEffect(() => {
    const node = contentRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      setSize({
        height: node.scrollHeight,
        width: node.scrollWidth,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const scaledWidth = size.width > 0 ? size.width * zoom : undefined;
  const scaledHeight = size.height > 0 ? size.height * zoom : undefined;

  return (
    <div className={cn('h-full overflow-auto px-6 py-8', className)}>
      <div
        className="mx-auto"
        style={{
          minHeight: scaledHeight,
          width: scaledWidth,
        }}
      >
        <div
          ref={contentRef}
          className={cn('origin-top-left', contentClassName)}
          style={{
            transform: `scale(${zoom})`,
            width: 'fit-content',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
