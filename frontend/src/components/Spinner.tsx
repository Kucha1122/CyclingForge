import { type FC } from 'react';

interface SpinnerProps {
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

/** Lightweight, theme-aware loading spinner. */
export const Spinner: FC<SpinnerProps> = ({ size = 24, className }) => (
  <span
    role="status"
    aria-live="polite"
    className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent text-[var(--accent)] ${className ?? ''}`}
    style={{ width: size, height: size }}
  />
);

interface PageLoaderProps {
  /** Optional text shown beneath the spinner. */
  label?: string;
}

/** Centered full-area loader used while a page's primary data is fetching. */
export const PageLoader: FC<PageLoaderProps> = ({ label }) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
    <Spinner size={32} />
    {label && <p className="text-sm font-medium text-secondary">{label}</p>}
  </div>
);
