import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageLoader } from '../components/Spinner';
import { metricsApi, type PmcSummary } from '../services/api';
import { PMCChart } from '../components/PMCChart';
import { PowerCurveChart } from '../components/PowerCurveChart';
import { TrainingRiskCard } from '../components/TrainingRiskCard';
import { HrvTrendChart } from '../components/HrvTrendChart';
import { useSync } from '../context/SyncContext';

export const AnalysisPage = () => {
  const { t } = useTranslation('analysis');
  const location = useLocation();
  const { syncVersion } = useSync();
  const [loading, setLoading] = useState(true);
  const [pmcData, setPmcData] = useState<PmcSummary | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7' | '30' | '42' | '90' | '180' | '365'>(() => {
    const stored = localStorage.getItem('analysisPmcHistoryDays');
    if (stored === '7' || stored === '30' || stored === '42' || stored === '90' || stored === '180' || stored === '365') {
      return stored;
    }
    return '365';
  });

  const fetchPmc = useCallback(async () => {
    try {
      const days = parseInt(selectedTimeRange);
      const pmc = await metricsApi.getPmcSummary(undefined, undefined, days);
      setPmcData(pmc.data);
    } catch {
      // Failed to fetch analysis data
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange]);

  useEffect(() => {
    setLoading(true);
    fetchPmc();
  }, [location.pathname, selectedTimeRange, syncVersion, fetchPmc]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && location.pathname === '/analysis') {
        setLoading(true);
        fetchPmc();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [location.pathname, fetchPmc]);

  useEffect(() => {
    localStorage.setItem('analysisPmcHistoryDays', selectedTimeRange);
  }, [selectedTimeRange]);

  const calculateStats = () => {
    const history = pmcData?.history ?? [];
    if (history.length === 0) return null;

    const avgCTL = history.reduce((sum, d) => sum + d.ctl, 0) / history.length;
    const avgATL = history.reduce((sum, d) => sum + d.atl, 0) / history.length;
    const avgTSB = history.reduce((sum, d) => sum + d.tsb, 0) / history.length;
    
    const maxCTL = Math.max(...history.map(d => d.ctl));
    const minTSB = Math.min(...history.map(d => d.tsb));
    const maxTSB = Math.max(...history.map(d => d.tsb));

    return { avgCTL, avgATL, avgTSB, maxCTL, minTSB, maxTSB };
  };

  const stats = calculateStats();

  if (loading) {
    return <PageLoader label={t('loadingAnalysis')} />;
  }

  return (
    <div className="min-h-screen bg-page p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-primary">{t('title')}</h1>
        <p className="text-secondary">{t('subtitle')}</p>
      </header>

      {pmcData ? (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex items-center gap-4 rounded-xl bg-surface p-4 shadow-sm ring-1 ring-border-default">
            <span className="text-sm font-medium text-secondary">{t('range')}</span>
            <div className="flex gap-2">
              {(['7', '30', '42', '90', '180', '365'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                    selectedTimeRange === range
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-secondary hover:bg-elevated'
                  }`}
                >
                  {range === '7'
                    ? t('days7')
                    : range === '30'
                    ? t('days30')
                    : range === '42'
                    ? t('days42')
                    : range === '90'
                    ? t('days90')
                    : range === '180'
                    ? t('days180')
                    : t('days365')}
                </button>
              ))}
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">{t('averageFitness')}</p>
                <p className="text-4xl font-bold">{stats.avgCTL.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">{t('peak')} {stats.maxCTL.toFixed(1)}</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">{t('averageFatigue')}</p>
                <p className="text-4xl font-bold">{stats.avgATL.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">{t('current')} {pmcData.currentATL.toFixed(1)}</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">{t('averageForm')}</p>
                <p className="text-4xl font-bold">{stats.avgTSB.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">
                  {t('rangeValue')}: {stats.minTSB.toFixed(1)} – {stats.maxTSB.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {pmcData.rampRateCtlPerWeek != null && (
            <div className={`rounded-xl p-4 shadow-sm ring-1 ${pmcData.rampRateCtlPerWeek > 7 ? 'bg-state-danger-bg ring-border-default' : 'bg-surface ring-border-default'}`}>
              <p className="text-sm font-medium text-primary">
                {t('rampRate')}: <span className="font-semibold">{pmcData.rampRateCtlPerWeek >= 0 ? '+' : ''}{pmcData.rampRateCtlPerWeek.toFixed(1)}</span> CTL/week
              </p>
              {pmcData.rampRateCtlPerWeek > 7 && (
                <p className="mt-1 text-xs text-state-danger-text">{t('rampRateWarning')}</p>
              )}
            </div>
          )}

          {/* PMC Chart */}
          <PMCChart chartId="analysis" data={pmcData.history} ftpChanges={pmcData.ftpChanges} />

          {/* Training risk panel (ACWR, ramp, monotony, low-TSB streak) */}
          <TrainingRiskCard pmc={pmcData} />

          {/* HRV trend with rolling baseline */}
          <HrvTrendChart />

          {/* Power Curve / Critical Power */}
          <PowerCurveChart />

          {/* Insights */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Training Load Analysis */}
            <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
              <h2 className="mb-4 text-xl font-semibold text-primary">{t('trainingLoadAnalysis')}</h2>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-secondary">{t('fitnessCtl')}</span>
                    <span className="font-semibold text-accent">{pmcData.currentCTL.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min((pmcData.currentCTL / 120) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-tertiary">
                    {pmcData.currentCTL > 100
                      ? t('fitnessElite')
                      : pmcData.currentCTL > 80
                      ? t('fitnessExcellent')
                      : pmcData.currentCTL > 60
                      ? t('fitnessGood')
                      : pmcData.currentCTL > 40
                      ? t('fitnessModerate')
                      : t('fitnessBuilding')}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-secondary">{t('fatigueAtl')}</span>
                    <span className="font-semibold text-accent">{pmcData.currentATL.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-orange-600"
                      style={{ width: `${Math.min((pmcData.currentATL / 150) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-tertiary">
                    {pmcData.currentATL > 120
                      ? t('fatigueVeryHigh')
                      : pmcData.currentATL > 80
                      ? t('fatigueHigh')
                      : pmcData.currentATL > 50
                      ? t('fatigueModerate')
                      : t('fatigueLow')}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-secondary">{t('formTsb')}</span>
                    <span
                      className={`font-semibold ${
                        pmcData.currentTSB < -35
                          ? 'text-red-600'
                          : pmcData.currentTSB < -10
                          ? 'text-green-600'
                          : pmcData.currentTSB < 5
                          ? 'text-slate-600'
                          : pmcData.currentTSB < 25
                          ? 'text-blue-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {pmcData.currentTSB.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        pmcData.currentTSB < -35
                          ? 'bg-red-600'
                          : pmcData.currentTSB < -10
                          ? 'bg-green-600'
                          : pmcData.currentTSB < 5
                          ? 'bg-slate-500'
                          : pmcData.currentTSB < 25
                          ? 'bg-blue-500'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(Math.abs(pmcData.currentTSB / 35) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-tertiary">{pmcData.formStatus}</p>
                </div>
              </div>
            </div>

            {/* Training Recommendations */}
            <div className="rounded-xl bg-surface p-6 shadow-sm ring-1 ring-border-default">
              <h2 className="mb-4 text-xl font-semibold text-primary">{t('recommendations')}</h2>
              
              <div className="mb-6 rounded-lg bg-state-active-bg p-4 ring-1 ring-border-default">
                <p className="text-sm font-medium text-state-active-text">{t('currentStatus')}</p>
                <p className="mt-1 text-sm text-secondary">{pmcData.recommendation}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="font-medium text-primary">{t('trainingBalance')}</p>
                    <p className="text-secondary">
                      {pmcData.currentTSB < -35
                        ? t('balanceOvertraining')
                        : pmcData.currentTSB < -10
                        ? t('balanceOptimal')
                        : pmcData.currentTSB < 5
                        ? t('balanceTransition')
                        : pmcData.currentTSB < 25
                        ? t('balanceFresh')
                        : t('balanceVeryFresh')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p className="font-medium text-primary">{t('nextSteps')}</p>
                    <p className="text-secondary">
                      {pmcData.currentCTL < 50
                        ? t('nextStepsBase')
                        : pmcData.currentCTL < 80
                        ? t('nextStepsGood')
                        : t('nextStepsExcellent')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="font-medium text-primary">{t('performanceOutlook')}</p>
                    <p className="text-secondary">
                      {pmcData.currentTSB > 5 && pmcData.currentCTL > 70
                        ? t('outlookPeak')
                        : pmcData.currentTSB < -35
                        ? t('outlookRecovery')
                        : t('outlookBuilding')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Understanding Metrics */}
          <div className="rounded-xl bg-muted p-6 ring-1 ring-border-default">
            <h2 className="mb-4 text-xl font-semibold text-primary">{t('understandingMetrics')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-accent">{t('fitnessCtl')}</h3>
                <p className="text-sm text-secondary">
                  {t('ctlDescription')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-accent">{t('fatigueAtl')}</h3>
                <p className="text-sm text-secondary">
                  {t('atlDescription')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-accent">{t('formTsb')}</h3>
                <p className="text-sm text-secondary">
                  {t('tsbDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-surface p-12 text-center ring-1 ring-border-default">
          <div className="mb-4 text-6xl">📊</div>
          <h3 className="mb-2 text-lg font-medium text-primary">{t('noAnalysisData')}</h3>
          <p className="text-tertiary">
            {t('noAnalysisDataHint')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
