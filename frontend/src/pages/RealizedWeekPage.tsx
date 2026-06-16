import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { activitiesApi, trainingPreferenceApi } from '../services/api';
import type { RealizedWeekDto, RealizedDayDto, RealizedActivityDto } from '../types/activity';
import { formatDate } from '../utils/format';

// HR zone colours (Z1..Z5+), aerobic → anaerobic.
const HR_ZONE_COLORS = ['#94a3b8', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

const DAY_KEYS = ['daySun', 'dayMon', 'dayTue', 'dayWed', 'dayThu', 'dayFri', 'daySat'] as const;

// Compute the ISO date (YYYY-MM-DD) for the start of the week containing `date`,
// given the first weekday (0 = Monday .. 6 = Sunday).
function getWeekStart(date: Date, weekStartDay: number): string {
  const d = new Date(date);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0 .. Sunday = 6
  const diff = (dayIndex - weekStartDay + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toIsoDate(d);
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export const RealizedWeekPage = () => {
  const { t: tCommon } = useTranslation('common');
  const { t: tNav } = useTranslation('nav');
  const [week, setWeek] = useState<RealizedWeekDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStartDay, setWeekStartDay] = useState(0);

  useEffect(() => {
    trainingPreferenceApi.get()
      .then(({ data }) => setWeekStartDay(data.weekStartDay ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const current = new Date();
    current.setDate(current.getDate() + weekOffset * 7);
    const weekStart = getWeekStart(current, weekStartDay);

    activitiesApi.getRealizedWeek(weekStart)
      .then(({ data }) => setWeek(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [weekOffset, weekStartDay]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-tertiary">{tCommon('loadingRealizedWeek')}</p></div>;
  }

  const zoneCount = week?.weeklyHrZoneSeconds.length ?? 0;
  const totalSeconds = week?.days.reduce((s, d) => s + d.activities.reduce((a, x) => a + x.durationSeconds, 0), 0) ?? 0;
  const totalActivities = week?.days.reduce((s, d) => s + d.activities.length, 0) ?? 0;
  const totalTss = week?.days.reduce((s, d) => s + d.activities.reduce((a, x) => a + (x.trainingStressScore ?? 0), 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">{tNav('realizedWeek')}</h1>
        {week && (
          <p className="text-secondary">{formatDate(week.weekStart)} - {formatDate(week.weekEnd)}</p>
        )}
      </header>

      {/* Week navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => setWeekOffset(w => w - 1)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          ← {tCommon('previousWeek')}
        </button>
        <button onClick={() => setWeekOffset(0)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          {tCommon('thisWeekLabel')}
        </button>
        <button onClick={() => setWeekOffset(w => w + 1)}
          className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm text-primary hover:bg-muted">
          {tCommon('nextWeekLabel')} →
        </button>
      </div>

      {/* Weekly grid */}
      {week && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          {week.days.map((day) => (
            <DayCard key={day.date} day={day} zoneCount={zoneCount} tCommon={tCommon} />
          ))}
        </div>
      )}

      {/* Weekly summary */}
      {week && (
        <div className="mt-8 rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
          <h2 className="mb-4 text-lg font-semibold text-primary">{tCommon('weekSummary')}</h2>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <SummaryCard label={tCommon('totalActivities')} value={String(totalActivities)} />
            <SummaryCard label={tCommon('totalTime')} value={formatDuration(totalSeconds)} />
            <SummaryCard label={tCommon('totalTssLabel')} value={String(Math.round(totalTss))} />
            <SummaryCard
              label={tCommon('timeInZones')}
              value={formatDuration(week.weeklyHrZoneSeconds.reduce((a, b) => a + b, 0))}
            />
          </div>

          {zoneCount > 0 ? (
            <>
              <ZoneBar zoneSeconds={week.weeklyHrZoneSeconds} />
              <ZoneLegend zoneSeconds={week.weeklyHrZoneSeconds} />
            </>
          ) : (
            <p className="text-sm text-tertiary">{tCommon('noHrZonesHint')}</p>
          )}
        </div>
      )}
    </div>
  );
};

function DayCard({ day, zoneCount, tCommon }: { day: RealizedDayDto; zoneCount: number; tCommon: (key: string) => string }) {
  const isToday = day.date === toIsoDate(new Date());
  const dayKey = DAY_KEYS[new Date(day.date + 'T00:00:00').getDay()];
  const hasZones = zoneCount > 0 && day.dailyHrZoneSeconds.some(s => s > 0);

  return (
    <div className={`rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default ${isToday ? 'ring-2 ring-accent' : ''}`}>
      <div className="mb-2">
        <div className={`text-sm font-semibold ${isToday ? 'text-accent' : 'text-secondary'}`}>{tCommon(dayKey)}</div>
        <div className="text-xs text-tertiary">{formatDate(day.date)}</div>
      </div>

      {day.activities.length === 0 ? (
        <p className="mt-3 text-center text-xs text-tertiary">{tCommon('noActivities')}</p>
      ) : (
        <div className="space-y-2">
          {day.activities.map((a) => (
            <ActivityRow key={a.id} activity={a} tCommon={tCommon} />
          ))}
          {hasZones && (
            <div className="pt-1">
              <ZoneBar zoneSeconds={day.dailyHrZoneSeconds} />
              <ZoneLegend zoneSeconds={day.dailyHrZoneSeconds} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity, tCommon }: { activity: RealizedActivityDto; tCommon: (key: string) => string }) {
  return (
    <Link to={`/activities/${activity.id}`} className="block rounded-lg bg-page p-2 transition-colors hover:bg-muted">
      <p className="truncate text-xs font-medium text-primary" title={activity.name}>{activity.name}</p>
      <p className="text-[10px] text-tertiary">
        {formatDuration(activity.durationSeconds)} · {activity.distanceKm.toFixed(1)} km
        {activity.trainingStressScore != null ? ` · ${tCommon('tssLabel')} ${Math.round(activity.trainingStressScore)}` : ''}
      </p>
    </Link>
  );
}

function ZoneBar({ zoneSeconds }: { zoneSeconds: number[] }) {
  const total = zoneSeconds.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
      {zoneSeconds.map((s, i) => (
        s > 0 ? (
          <div
            key={i}
            style={{ width: `${(s / total) * 100}%`, backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }}
            title={`Z${i + 1}: ${formatDuration(s)}`}
          />
        ) : null
      ))}
    </div>
  );
}

function ZoneLegend({ zoneSeconds, compact = false }: { zoneSeconds: number[]; compact?: boolean }) {
  if (compact) {
    // Per-day breakdown: only zones with time, stacked tightly in the narrow card.
    return (
      <div className="mt-2 space-y-0.5">
        {zoneSeconds.map((s, i) => (
          s > 0 ? (
            <div key={i} className="flex items-center justify-between text-[10px] text-secondary">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }} />
                <span className="font-medium">Z{i + 1}</span>
              </span>
              <span className="text-tertiary">{formatDuration(s)}</span>
            </div>
          ) : null
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-3">
      {zoneSeconds.map((s, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs text-secondary">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: HR_ZONE_COLORS[i] ?? '#888' }} />
          <span className="font-medium">Z{i + 1}</span>
          <span className="text-tertiary">{formatDuration(s)}</span>
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-page p-3 text-center">
      <p className="text-xl font-bold text-primary">{value}</p>
      <p className="text-xs text-tertiary">{label}</p>
    </div>
  );
}
