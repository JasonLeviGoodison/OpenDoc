'use client';

import { useEffect, useState } from 'react';

interface SecureDocumentBinaryState {
  data: ArrayBuffer | null;
  error: string | null;
  loading: boolean;
}

interface SecureDocumentBinarySnapshot {
  data: ArrayBuffer | null;
  error: string | null;
  requestKey: string | null;
}

export function useSecureDocumentBinary(fileUrl: string | null, viewerToken?: string | null): SecureDocumentBinaryState {
  const requestKey = fileUrl ? `${fileUrl}::${viewerToken ?? ''}` : null;
  const [snapshot, setSnapshot] = useState<SecureDocumentBinarySnapshot>({
    data: null,
    error: null,
    requestKey: null,
  });

  useEffect(() => {
    if (!fileUrl) {
      return;
    }

    const controller = new AbortController();
    const headers = viewerToken ? { 'x-opendoc-viewer-token': viewerToken } : undefined;

    void fetch(fileUrl, {
      credentials: 'same-origin',
      headers,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Secure preview request failed (${response.status}).`);
        }

        const data = await response.arrayBuffer();

        setSnapshot({
          data,
          error: null,
          requestKey,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSnapshot({
          data: null,
          error: error instanceof Error ? error.message : 'Unable to load the secure preview.',
          requestKey,
        });
      });

    return () => controller.abort();
  }, [fileUrl, requestKey, viewerToken]);

  if (!fileUrl || !requestKey) {
    return {
      data: null,
      error: null,
      loading: false,
    };
  }

  const loading = snapshot.requestKey !== requestKey;

  return {
    data: loading ? null : snapshot.data,
    error: loading ? null : snapshot.error,
    loading,
  };
}
