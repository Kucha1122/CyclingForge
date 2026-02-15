import React, { useEffect, useState } from 'react';
import { metricsApi, type PmcSummary } from '../services/api';
import { PMCChart } from '../components/PMCChart';

export const AnalysisPage = () => {
  const [loading, setLoading] = useState(true);
  const [pmcData, setPmcData] = useState<PmcSummary | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'30' | '90' | '180'>('90');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pmc = await metricsApi.getPmcSummary();
        setPmcData(pmc.data);
      } catch {
        // Failed to fetch analysis data
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getFilteredHistory = () => {
    if (!pmcData?.history) return [];
    
    const days = parseInt(selectedTimeRange);
    return pmcData.history.slice(-days);
  };

  const calculateStats = () => {
    const history = getFilteredHistory();
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
        <p className="text-xl font-semibold text-gray-700">Loading analysis...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Advanced Analysis</h1>
        <p className="text-gray-600">Deep insights into your training performance</p>
      </header>

      {pmcData ? (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <span className="text-sm font-medium text-gray-700">Time Range:</span>
            <div className="flex gap-2">
              {(['30', '90', '180'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedTimeRange(range)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedTimeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range} days
                </button>
              ))}
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">Average Fitness (CTL)</p>
                <p className="text-4xl font-bold">{stats.avgCTL.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">Peak: {stats.maxCTL.toFixed(1)}</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">Average Fatigue (ATL)</p>
                <p className="text-4xl font-bold">{stats.avgATL.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">Current: {pmcData.currentATL.toFixed(1)}</p>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
                <p className="mb-1 text-sm opacity-90">Average Form (TSB)</p>
                <p className="text-4xl font-bold">{stats.avgTSB.toFixed(1)}</p>
                <p className="mt-2 text-sm opacity-75">
                  Range: {stats.minTSB.toFixed(1)} to {stats.maxTSB.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {/* PMC Chart */}
          <PMCChart data={getFilteredHistory()} />

          {/* Insights */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Training Load Analysis */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Training Load Analysis</h2>
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fitness (CTL)</span>
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
                      ? 'Elite fitness level'
                      : pmcData.currentCTL > 80
                      ? 'Excellent fitness'
                      : pmcData.currentCTL > 60
                      ? 'Good fitness'
                      : pmcData.currentCTL > 40
                      ? 'Moderate fitness'
                      : 'Building base fitness'}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Fatigue (ATL)</span>
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
                      ? 'Very high acute load'
                      : pmcData.currentATL > 80
                      ? 'High recent training load'
                      : pmcData.currentATL > 50
                      ? 'Moderate load'
                      : 'Low recent load'}
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Form (TSB)</span>
                    <span
                      className={`font-semibold ${
                        pmcData.currentTSB < -20
                          ? 'text-red-600'
                          : pmcData.currentTSB < 0
                          ? 'text-orange-600'
                          : pmcData.currentTSB < 15
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}
                    >
                      {pmcData.currentTSB.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className={`h-full rounded-full ${
                        pmcData.currentTSB < -20
                          ? 'bg-red-600'
                          : pmcData.currentTSB < 0
                          ? 'bg-orange-600'
                          : pmcData.currentTSB < 15
                          ? 'bg-green-600'
                          : 'bg-purple-600'
                      }`}
                      style={{ width: `${Math.min(Math.abs(pmcData.currentTSB / 30) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{pmcData.formStatus}</p>
                </div>
              </div>
            </div>

            {/* Training Recommendations */}
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">Recommendations</h2>
              
              <div className="mb-6 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-200">
                <p className="text-sm font-medium text-blue-900">Current Status</p>
                <p className="mt-1 text-sm text-blue-800">{pmcData.recommendation}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <span className="text-lg">📊</span>
                  <div>
                    <p className="font-medium text-gray-900">Training Balance</p>
                    <p className="text-gray-600">
                      {pmcData.currentTSB < -20
                        ? 'High fatigue detected. Consider reducing training load or adding recovery days.'
                        : pmcData.currentTSB < 0
                        ? 'Good training stimulus. Your body is adapting to the load.'
                        : pmcData.currentTSB < 15
                        ? 'Optimal freshness for high-quality training or racing.'
                        : 'Very fresh. Consider increasing training load to maintain fitness.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-lg">🎯</span>
                  <div>
                    <p className="font-medium text-gray-900">Next Steps</p>
                    <p className="text-gray-600">
                      {pmcData.currentCTL < 50
                        ? 'Focus on building base fitness with consistent training volume.'
                        : pmcData.currentCTL < 80
                        ? 'Good fitness base. Add intensity workouts to improve performance.'
                        : 'Excellent fitness. Balance high-intensity work with adequate recovery.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="font-medium text-gray-900">Performance Outlook</p>
                    <p className="text-gray-600">
                      {pmcData.currentTSB > 5 && pmcData.currentCTL > 70
                        ? 'Peak form! Great time for a goal event or hard effort.'
                        : pmcData.currentTSB < -20
                        ? 'Recovery needed. Focus on easy aerobic training.'
                        : 'Building towards peak form. Keep training consistently.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Understanding Metrics */}
          <div className="rounded-xl bg-gradient-to-br from-gray-50 to-blue-50 p-6 ring-1 ring-gray-200">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Understanding Your Metrics</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <h3 className="mb-2 font-semibold text-blue-700">Fitness (CTL)</h3>
                <p className="text-sm text-gray-700">
                  Chronic Training Load represents your long-term fitness (42-day average). Higher CTL means better endurance capacity.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-orange-700">Fatigue (ATL)</h3>
                <p className="text-sm text-gray-700">
                  Acute Training Load measures recent training stress (7-day average). High ATL indicates you need recovery.
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-green-700">Form (TSB)</h3>
                <p className="text-sm text-gray-700">
                  Training Stress Balance (CTL - ATL) indicates your readiness. Positive = fresh, negative = fatigued.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl bg-white p-12 text-center">
          <div className="mb-4 text-6xl">📊</div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Analysis Data Available</h3>
          <p className="text-gray-500">
            Start logging activities with power data to see your performance analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPage;
