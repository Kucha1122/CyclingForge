import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { stravaApi } from '../services/api';

export const StravaCallbackPage = () => {
  const { t } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (processedRef.current) return;

    if (error) {
      navigate('/dashboard');
      return;
    }

    if (code) {
      processedRef.current = true;
      const connectStrava = async () => {
        try {
          await stravaApi.connect(code);
        } catch {
          // ignore
        } finally {
          navigate('/dashboard');
        }
      };
      connectStrava();
    } else {
      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('connectingStrava')}</h2>
        <p className="mt-2 text-gray-600">{t('connectingStravaHint')}</p>
      </div>
    </div>
  );
};
