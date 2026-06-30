import { useTheme } from '../context/ThemeContext';
import { LogoMark } from './LogoMark';

const INK = '#0C0E16';
const PAPER = '#F2F3F8';
const ACCENT = '#2C3BC4';
const MUTED = '#7c7f8c';
const MUTED_DARK = '#6e7180';

type Variant = 'auto' | 'light' | 'dark';

interface LogoProps {
  /** 'dark' = on dark surface (paper wordmark/ring); 'light' = on light surface;
   *  'auto' (default) follows the active theme. */
  variant?: Variant;
  /** Mark height in px. Wordmark scales relative to it. */
  markSize?: number;
  /** Show the "TRAINING · ANALYSIS · POWER" tagline. */
  tagline?: boolean;
  className?: string;
}

/** CyclingForge horizontal lockup: brand mark + wordmark (Space Grotesk). */
export function Logo({ variant = 'auto', markSize = 40, tagline = false, className }: LogoProps) {
  const { theme } = useTheme();
  const onDark = variant === 'dark' || (variant === 'auto' && theme === 'dark');

  const ring = onDark ? PAPER : INK;
  const text = onDark ? PAPER : INK;
  const muted = onDark ? MUTED_DARK : MUTED;

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <LogoMark size={markSize} ring={ring} arc={ACCENT} spark={ACCENT} />
      <div className="flex flex-col gap-1">
        <span
          className="font-display leading-none"
          style={{ fontSize: markSize * 0.5, letterSpacing: '-0.025em', color: text }}
        >
          <span style={{ fontWeight: 500 }}>CYCLING</span>
          <span style={{ fontWeight: 700 }}>FORGE</span>
        </span>
        {tagline && (
          <span
            className="font-brand-mono uppercase whitespace-nowrap"
            style={{ fontSize: markSize * 0.155, letterSpacing: '0.22em', color: muted }}
          >
            TRAINING · ANALYSIS · POWER
          </span>
        )}
      </div>
    </div>
  );
}
