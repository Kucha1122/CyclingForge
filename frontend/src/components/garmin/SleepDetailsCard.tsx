import { useTranslation } from 'react-i18next';
import type { SleepDataDto, HrvDataDto } from '../../types/garmin';
import { SleepHypnogram } from './SleepHypnogram';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

// Naive datetime string (no 'Z') → parsed as local wall-clock time by JS.
function formatLocalTime(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr); // JS treats no-Z string as local time
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scoreBg(score: number): string {
  if (score >= 80) return 'bg-emerald-500/10 text-emerald-500';
  if (score >= 60) return 'bg-amber-500/10 text-amber-500';
  return 'bg-rose-500/10 text-rose-500';
}

interface Props {
  sleep: SleepDataDto;
  hrv?: HrvDataDto | null;
}

export const SleepDetailsCard = ({ sleep, hrv }: Props) => {
  const { t } = useTranslation('sleep');
  const total = sleep.totalSleepSeconds || 1;

  const stages = [
    { labelKey: 'deep' as const, seconds: sleep.deepSleepSeconds, color: 'bg-indigo-600' },
    { labelKey: 'rem' as const, seconds: sleep.remSleepSeconds, color: 'bg-violet-500' },
    { labelKey: 'light' as const, seconds: sleep.lightSleepSeconds, color: 'bg-sky-400' },
    { labelKey: 'awake' as const, seconds: sleep.awakeSeconds, color: 'bg-amber-400' },
  ];

  const hasHypnogram = sleep.sleepLevels && sleep.sleepLevels.length > 0;
  const hasHrv = hrv && (hrv.lastNightAvgMs != null || hrv.lastNight5MinHighMs != null);

  return (
    <div className="rounded-2xl bg-surface shadow-sm ring-1 ring-border-default overflow-hidden">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <p className="text-xs text-tertiary">{sleep.date}</p>
          <p className="mt-0.5 text-lg font-bold text-primary">{formatDuration(sleep.totalSleepSeconds)}</p>
          <p className="text-xs text-tertiary">
            {formatLocalTime(sleep.sleepStartTime)} – {formatLocalTime(sleep.sleepEndTime)}
          </p>
        </div>
        {sleep.sleepScore != null && (
          <span className={`rounded-full px-3 py-1 text-sm font-bold ${scoreBg(sleep.sleepScore)}`}>
            {sleep.sleepScore}
          </span>
        )}
      </div>

      {/* ── Hypnogram timeline ──────────────────────────────── */}
      {hasHypnogram ? (
        <div className="px-5 pb-3">
          <SleepHypnogram levels={sleep.sleepLevels} />
          {/* Stage colour legend */}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-tertiary">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-indigo-600" />{t('deep')}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-violet-500" />{t('rem')}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-sky-400" />{t('light')}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />{t('awake')}</span>
          </div>
        </div>
      ) : (
        /* Fallback proportion bar */
        <div className="px-5 pb-3 flex h-3 overflow-hidden rounded-full">
          {stages.map((s) => (
            <div key={s.labelKey} className={s.color} style={{ width: `${(s.seconds / total) * 100}%` }} />
          ))}
        </div>
      )}

      <div className="border-t border-border-default" />

      {/* ── Stage durations ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 px-5 py-3 text-xs">
        {stages.map((s) => (
          <div key={s.labelKey} className="text-center">
            <div className={`mx-auto mb-1 h-2 w-2 rounded-full ${s.color}`} />
            <p className="text-tertiary">{t(s.labelKey)}</p>
            <p className="font-semibold text-primary">{formatDuration(s.seconds)}</p>
          </div>
        ))}
      </div>

      {/* ── HRV ─────────────────────────────────────────────── */}
      {hasHrv && (
        <>
          <div className="border-t border-border-default" />
          <div className="px-5 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-tertiary">{t('hrv')}</p>
            <div className="flex gap-4 text-xs">
              {hrv!.lastNightAvgMs != null && (
                <div>
                  <p className="text-tertiary">{t('hrvAvg')}</p>
                  <p className="text-xl font-bold text-emerald-500">{hrv!.lastNightAvgMs} <span className="text-xs font-normal text-tertiary">ms</span></p>
                </div>
              )}
              {hrv!.lastNight5MinHighMs != null && (
                <div>
                  <p className="text-tertiary">{t('hrv5MinHigh')}</p>
                  <p className="text-xl font-bold text-primary">{hrv!.lastNight5MinHighMs} <span className="text-xs font-normal text-tertiary">ms</span></p>
                </div>
              )}
              {hrv!.status && (
                <div className="ml-auto text-right">
                  <p className="text-tertiary">{t('hrvStatus')}</p>
                  <p className="text-sm font-semibold capitalize text-primary">{hrv!.status.toLowerCase()}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Vitals ──────────────────────────────────────────── */}
      {(sleep.averageSpO2 != null || sleep.averageRespirationRate != null) && (
        <>
          <div className="border-t border-border-default" />
          <div className="flex gap-6 px-5 py-3 text-xs">
            {sleep.averageSpO2 != null && (
              <div>
                <p className="text-tertiary">SpO2</p>
                <p className="text-lg font-bold text-sky-400">{sleep.averageSpO2.toFixed(1)}<span className="text-xs font-normal text-tertiary">%</span></p>
              </div>
            )}
            {sleep.averageRespirationRate != null && (
              <div>
                <p className="text-tertiary">{t('respiration')}</p>
                <p className="text-lg font-bold text-primary">{sleep.averageRespirationRate.toFixed(1)}<span className="text-xs font-normal text-tertiary"> br/min</span></p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
