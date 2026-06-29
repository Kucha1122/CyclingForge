import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useTranslation } from 'react-i18next';
import { mobileApi, type MobileVersionDto } from '../services/api';

// Public URL the phone hits to fetch the APK. Same origin as the web app, /api proxied
// to the backend by nginx — so it works behind the Tailscale Funnel without hardcoding a host.
const apkUrl = `${window.location.origin}/api/mobile/download`;

export const DownloadMobileAppPage = () => {
  const { t } = useTranslation('common');
  const [version, setVersion] = useState<MobileVersionDto | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    mobileApi
      .getVersion()
      .then((res) => setVersion(res.data))
      .catch(() => setVersion(null))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-lg ring-1 ring-border-default">
        <h2 className="text-center text-2xl font-bold text-primary">{t('downloadAppTitle')}</h2>
        <p className="mt-2 text-center text-secondary">{t('downloadAppScanQr')}</p>

        <div className="mt-8 flex justify-center">
          <div className="rounded-xl bg-white p-4">
            <QRCode value={apkUrl} size={208} />
          </div>
        </div>

        <a
          href={apkUrl}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-bold text-accent-foreground transition-colors hover:opacity-90"
        >
          {t('downloadAppButton')}
        </a>

        {loaded && (
          <p className="mt-4 text-center text-sm text-secondary">
            {version
              ? t('downloadAppCurrentVersion', { version: version.version })
              : t('downloadAppNoBuild')}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-secondary">{t('downloadAppUnknownSources')}</p>
        <p className="mt-2 text-center text-xs text-secondary">{t('downloadAppAndroidOnly')}</p>
      </div>
    </div>
  );
};
