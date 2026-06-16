import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { metricsApi, type PmcSummary, type DailyTssPoint } from '../services/api';

interface Props {
  pmc: PmcSummary;
}

type Severity = 'ok' | 'caution' | 'danger';

interface Signal {
  key: string;
  label: string;
  value: string;
  hint: string;
  severity: Severity;
}

const SEVERITY_STYLES: Record<Severity, string> = {
  ok: 'bg-state-success-bg text-state-success-text',
  caution: 'bg-state-active-bg text-state-active-text',
  danger: 'bg-state-danger-bg text-state-danger-text',
};

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

function std(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export const TrainingRiskCard = ({ pmc }: Props) => {
  const { t } = useTranslation('analysis');
  const [dailyTss, setDailyTss] = useState<DailyTssPoint[]>([]);

  useEffect(() => {
    metricsApi.getDailyTss(7)
      .then((res) => setDailyTss(res.data))
      .catch(() => setDailyTss([]));
  }, []);

  const signals = useMemo<Signal[]>(() => {
    const result: Signal[] = [];

    // ACWR = ATL / CTL (acute:chronic workload ratio).
    if (pmc.currentCTL > 0) {
      const acwr = pmc.currentATL / pmc.currentCTL;
      let sev: Severity = 'ok';
      if (acwr > 1.5 || acwr < 0.8) sev = 'danger';
      else if (acwr > 1.3) sev = 'caution';
      result.push({
        key: 'acwr',
        label: t('riskAcwr'),
        value: acwr.toFixed(2),
        hint: acwr > 1.5 ? t('riskAcwrHigh') : acwr < 0.8 ? t('riskAcwrLow') : t('riskAcwrOk'),
        severity: sev,
      });
    }

    // Ramp rate (CTL/week).
    if (pmc.rampRateCtlPerWeek != null) {
      const rr = pmc.rampRateCtlPerWeek;
      const sev: Severity = rr > 7 ? 'danger' : rr > 5 ? 'caution' : 'ok';
      result.push({
        key: 'ramp',
        label: t('riskRampRate'),
        value: `${rr >= 0 ? '+' : ''}${rr.toFixed(1)}`,
        hint: rr > 7 ? t('riskRampRateHigh') : t('riskRampRateOk'),
        severity: sev,
      });
    }

    // Foster monotony & strain over the last 7 days of TSS (zero days included).
    const loads = dailyTss.map((d) => d.tss);
    if (loads.length >= 3) {
      const sd = std(loads);
      const monotony = sd > 0 ? mean(loads) / sd : 0;
      const weeklyLoad = loads.reduce((s, x) => s + x, 0);
      const strain = weeklyLoad * monotony;
      const monoSev: Severity = monotony > 2 ? 'danger' : monotony > 1.5 ? 'caution' : 'ok';
      result.push({
        key: 'monotony',
        label: t('riskMonotony'),
        value: monotony.toFixed(2),
        hint: monotony > 2 ? t('riskMonotonyHigh') : t('riskMonotonyOk'),
        severity: monoSev,
      });
      result.push({
        key: 'strain',
        label: t('riskStrain'),
        value: Math.round(strain).toString(),
        hint: t('riskStrainHint'),
        severity: strain > 2 * weeklyLoad ? 'caution' : 'ok',
      });
    }

    // Trailing streak of days with TSB < -35 (deep fatigue).
    const history = pmc.history ?? [];
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].tsb < -35) streak++;
      else break;
    }
    if (history.length > 0) {
      const sev: Severity = streak >= 5 ? 'danger' : streak >= 2 ? 'caution' : 'ok';
      result.push({
        key: 'lowTsb',
        label: t('riskLowTsbStreak'),
        value: t('riskDaysValue', { count: streak }),
        hint: streak >= 2 ? t('riskLowTsbHigh') : t('riskLowTsbOk'),
        severity: sev,
      });
    }

    return result;
  }, [pmc, dailyTss, t]);

  const overall: Severity = signals.some((s) => s.severity === 'danger')
    ? 'danger'
    : signals.some((s) => s.severity === 'caution')
      ? 'caution'
      : 'ok';

  if (signals.length === 0) return null;

  return (
    <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-primary">{t('riskTitle')}</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${SEVERITY_STYLES[overall]}`}>
          {overall === 'danger' ? t('riskOverallDanger') : overall === 'caution' ? t('riskOverallCaution') : t('riskOverallOk')}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {signals.map((s) => (
          <div key={s.key} className="rounded-lg bg-page p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary">{s.label}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_STYLES[s.severity]}`}>{s.value}</span>
            </div>
            <p className="mt-1 text-xs text-tertiary">{s.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
