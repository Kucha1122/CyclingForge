import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { recommendationsApi } from '../../services/api';

interface Props {
  recommendationId: string;
  onSubmitted: (feedback: { rpe: number; legsFeel: string; sessionQuality: string; note: string }) => void;
  onClose: () => void;
}

const LEGS_OPTIONS = ['Fresh', 'Normal', 'Heavy'] as const;
const QUALITY_OPTIONS = ['Great', 'Ok', 'Poor'] as const;

export const SessionFeedbackForm = ({ recommendationId, onSubmitted, onClose }: Props) => {
  const { t } = useTranslation('todayWorkout');
  const [rpe, setRpe] = useState(5);
  const [legsFeel, setLegsFeel] = useState<string>('Normal');
  const [sessionQuality, setSessionQuality] = useState<string>('Ok');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await recommendationsApi.submitFeedback(recommendationId, { rpe, legsFeel, sessionQuality, note });
      onSubmitted({ rpe, legsFeel, sessionQuality, note });
    } catch {
      // ignore — keep modal open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-surface p-6 shadow-lg ring-1 ring-border-default">
        <h2 className="mb-1 text-lg font-bold text-primary">{t('feedbackTitle')}</h2>
        <p className="mb-4 text-sm text-tertiary">{t('feedbackSubtitle')}</p>

        {/* RPE slider (CR10) */}
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="rpe" className="text-sm font-medium text-secondary">{t('feedbackRpe')}</label>
            <span className="text-sm font-bold text-accent">{rpe}/10</span>
          </div>
          <input
            id="rpe"
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full accent-[var(--color-accent)]"
          />
          <p className="mt-1 text-xs text-tertiary">{t(`feedbackRpe${rpe}` as const, { defaultValue: '' })}</p>
        </div>

        {/* Legs */}
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-secondary">{t('feedbackLegs')}</p>
          <div className="flex gap-2">
            {LEGS_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLegsFeel(opt)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  legsFeel === opt
                    ? 'border-accent bg-state-active-bg text-state-active-text'
                    : 'border-border-default text-secondary hover:bg-muted'
                }`}
              >
                {t(`feedbackLegs${opt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div className="mb-4">
          <p className="mb-1 text-sm font-medium text-secondary">{t('feedbackQuality')}</p>
          <div className="flex gap-2">
            {QUALITY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setSessionQuality(opt)}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                  sessionQuality === opt
                    ? 'border-accent bg-state-active-bg text-state-active-text'
                    : 'border-border-default text-secondary hover:bg-muted'
                }`}
              >
                {t(`feedbackQuality${opt}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label htmlFor="note" className="mb-1 block text-sm font-medium text-secondary">{t('feedbackNote')}</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            className="w-full rounded-lg border border-border-default bg-page p-2 text-sm text-primary"
            placeholder={t('feedbackNotePlaceholder')}
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border-default px-4 py-2 text-sm text-secondary hover:bg-muted"
          >
            {t('feedbackSkip')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? t('feedbackSaving') : t('feedbackSubmit')}
          </button>
        </div>
      </div>
    </div>
  );
};
