import { useTranslation } from 'react-i18next';

interface ReadinessGaugeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

function getScoreColor(score: number): string {
  if (score < 20) return '#ef4444';
  if (score < 40) return '#f97316';
  if (score < 60) return '#eab308';
  if (score < 80) return '#22c55e';
  return '#10b981';
}

function getScoreLabelKey(score: number): string {
  if (score < 15) return 'readinessRest';
  if (score < 30) return 'readinessRecovery';
  if (score < 45) return 'readinessEasy';
  if (score < 60) return 'readinessModerate';
  if (score < 75) return 'readinessGood';
  return 'readinessPeak';
}

export const ReadinessGauge = ({ score, size = 'md' }: ReadinessGaugeProps) => {
  const { t } = useTranslation('todayWorkout');
  const dimensions = { sm: 80, md: 140, lg: 200 };
  const dim = dimensions[size];
  const strokeWidth = size === 'sm' ? 6 : size === 'md' ? 10 : 14;
  const radius = (dim - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, Math.max(0, score)) / 100;
  const offset = circumference * (1 - progress * 0.75);
  const color = getScoreColor(score);
  const label = t(getScoreLabelKey(score));

  const textSize = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-3xl' : 'text-5xl';
  const labelSize = size === 'sm' ? 'text-[10px]' : size === 'md' ? 'text-xs' : 'text-sm';

  return (
    <div className="relative flex flex-col items-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-[135deg]">
        <circle
          cx={dim / 2} cy={dim / 2} r={radius}
          fill="none" stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
        <circle
          cx={dim / 2} cy={dim / 2} r={radius}
          fill="none" stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold ${textSize}`} style={{ color }}>
          {Math.round(score)}
        </span>
        <span className={`font-medium text-tertiary ${labelSize}`}>{label}</span>
      </div>
    </div>
  );
};
