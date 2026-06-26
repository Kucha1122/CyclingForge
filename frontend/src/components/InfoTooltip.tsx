import { useId, useState, type FC } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface InfoTooltipProps {
  /** Tooltip body text (already translated). */
  text: string;
  /** Accessible label for the trigger button. Defaults to a generic hint. */
  label?: string;
  className?: string;
}

/**
 * Small "i" icon that reveals an explanatory tooltip on hover and on keyboard
 * focus. Used to explain jargon metrics (CTL/ATL/TSB/HRSS/IF/NP/VI…).
 */
export const InfoTooltip: FC<InfoTooltipProps> = ({ text, label, className }) => {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={`relative inline-flex items-center ${className ?? ''}`}>
      <button
        type="button"
        aria-label={label ?? 'More information'}
        aria-describedby={open ? id : undefined}
        className="inline-flex text-tertiary hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-full"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 w-56 -translate-x-1/2 rounded-lg px-3 py-2 text-xs font-normal leading-snug shadow-lg"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default, rgba(0,0,0,0.1))',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
};
