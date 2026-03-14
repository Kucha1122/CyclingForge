import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const HowRecommendationsWork = () => {
  const { t } = useTranslation('todayWorkout');
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{t('howRecommended')}</span>
        <span className="text-gray-400">{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200 p-4 text-sm text-gray-600">
          <p className="mb-3">
            {t('howRecommendedIntro')}
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>{t('howRecommendedToday')}</li>
            <li>{t('howRecommendedGoal')}</li>
            <li>{t('howRecommendedDuration')}</li>
            <li>{t('howRecommendedFullPlan')}</li>
          </ul>
        </div>
      )}
    </div>
  );
};
