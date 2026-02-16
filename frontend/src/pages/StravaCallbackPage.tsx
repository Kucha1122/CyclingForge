import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { stravaApi } from '../services/api';

export const StravaCallbackPage = () => {
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
        <h2 className="text-2xl font-bold text-gray-900">Connecting to Strava...</h2>
        <p className="mt-2 text-gray-600">Please wait while we complete the authorization.</p>
      </div>
    </div>
  );
};
