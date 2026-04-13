export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response
    .json()
    .catch(() => ({})) as { error?: string };

  if (!response.ok) {
    throw new ApiClientError(payload.error ?? 'Request failed.', response.status);
  }

  return payload as T;
}
