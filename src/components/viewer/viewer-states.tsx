'use client';

interface ViewerMessageStateProps {
  description: string;
  title: string;
}

export function ViewerLoadingState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex min-h-[420px] w-[min(760px,100%)] items-center justify-center rounded-2xl border border-border bg-card px-8 py-12 text-center">
        <div className="space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-accent" />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ViewerMessageState({ description, title }: ViewerMessageStateProps) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex min-h-[420px] w-[min(760px,100%)] items-center justify-center rounded-2xl border border-border bg-card px-8 py-12 text-center">
        <div className="max-w-md space-y-3">
          <p className="text-base font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}
