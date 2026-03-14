import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { garminApi } from '../services/api';

export const GarminCallbackPage = () => {
  const { t } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const processedRef = useRef(false);

  useEffect(() => {
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');

    if (processedRef.current) return;

    if (!oauthToken || !oauthVerifier) {
      navigate('/profile');
      return;
    }

    processedRef.current = true;

    const connectGarmin = async () => {
      try {
        await garminApi.authorize(oauthToken, oauthVerifier);
      } catch {
        // ignore
      } finally {
        navigate('/profile');
      }
    };
    connectGarmin();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">{t('connectingGarmin')}</h2>
        <p className="mt-2 text-gray-600">{t('connectingStravaHint')}</p>
      </div>
    </div>
  );
};
