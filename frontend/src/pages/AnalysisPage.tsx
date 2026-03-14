import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { metricsApi, type PmcSummary } from '../services/api';
import { PMCChart } from '../components/PMCChart';

export const AnalysisPage = () => {
  const { t } = useTranslation('analysis');
  const location = useLocation();
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
  }, [location.pathname, selectedTimeRange, fetchPmc]);

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl font-semibold text-gray-700">{t('loadingAnalysis')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600">{t('subtitle')}</p>
      </header>

      {pmcData ? (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <span className="text-sm font-medium text-gray-700">{t('range')}</span>
            <div className="flex gap-2">
              {(['7', '30', '42', '90', '180', '365'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTimeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            <div className={`rounded-xl p-4 shadow-sm ring-1 ${pmcData.rampRateCtlPerWeek > 7 ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-gray-200'}`}>
              <p className="text-sm font-medium text-gray-700">
                {t('rampRate')}: <span className="font-semibold">{pmcData.rampRateCtlPerWeek >= 0 ? '+' : ''}{pmcData.rampRateCtlPerWeek.toFixed(1)}</span> CTL/week
              </p>
              {pmcData.rampRateCtlPerWeek > 7 && (
                <p className="mt-1 text-xs text-amber-800">{t('rampRateWarning')}</p>
              )}
            </div>
          )}

          {/* PMC Chart */}
          <PMCChart chartId="analysis" data={pmcData.history} ftpChanges={pmcData.ftpChanges} />

          {/* Insights */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Training Load Analysis */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('trainingLoadAnalysis')}</h2>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t('fitnessCtl')}</span>
                    <span className="font-semibold text-blue-600">{pmcData.currentCTL.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.min((pmcData.currentCTL / 120) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
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
                    <span className="text-sm text-gray-600">{t('fatigueAtl')}</span>
                    <span className="font-semibold text-orange-600">{pmcData.currentATL.toFixed(1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-orange-600"
                      style={{ width: `${Math.min((pmcData.currentATL / 150) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
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
                    <span className="text-sm text-gray-600">{t('formTsb')}</span>
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
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
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
                  <p className="mt-1 text-xs text-gray-500">{pmcData.formStatus}</p>
                </div>
              </div>
            </div>

            {/* Training Recommendations */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('recommendations')}</h2>
              
              <div className="mb-6 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                <p className="text-sm font-medium text-blue-900">{t('currentStatus')}</p>
                <p className="mt-1 text-sm text-blue-800">{pmcData.recommendation}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="font-medium text-gray-900">{t('trainingBalance')}</p>
                    <p className="text-gray-600">
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
                    <p className="font-medium text-gray-900">{t('nextSteps')}</p>
                    <p className="text-gray-600">
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
                    <p className="font-medium text-gray-900">{t('performanceOutlook')}</p>
                    <p className="text-gray-600">
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
          <div className="rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 p-6 ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('understandingMetrics')}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-blue-700">{t('fitnessCtl')}</h3>
                <p className="text-sm text-gray-700">
                  {t('ctlDescription')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-orange-700">{t('fatigueAtl')}</h3>
                <p className="text-sm text-gray-700">
                  {t('atlDescription')}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-green-700">{t('formTsb')}</h3>
                <p className="text-sm text-gray-700">
                  {t('tsbDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center">
          <div className="mb-4 text-6xl">📊</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t('noAnalysisData')}</h3>
          <p className="text-gray-500">
            {t('noAnalysisDataHint')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
