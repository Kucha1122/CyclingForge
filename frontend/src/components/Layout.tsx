import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import i18n from '../i18n';

const NAV_ITEMS: { key: string; href: string; icon: string }[] = [
  { key: 'dashboard', href: '/dashboard', icon: '📊' },
  { key: 'todayWorkout', href: '/workout/today', icon: '🎯' },
  { key: 'realizedWeek', href: '/workout/week', icon: '✅' },
  { key: 'fullPlan', href: '/workout/plan', icon: '📋' },
  { key: 'workoutLibrary', href: '/workouts', icon: '💪' },
  { key: 'activities', href: '/activities', icon: '🚴' },
  { key: 'sleep', href: '/sleep', icon: '🌙' },
  { key: 'analysis', href: '/analysis', icon: '📈' },
  { key: 'profile', href: '/profile', icon: '👤' },
];

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  );
}

export const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { t, i18n: i18nHook } = useTranslation('nav');
  const tCommon = useTranslation('common').t;
  const currentLng = (i18nHook.language ?? i18n.language)?.split('-')[0] ?? 'pl';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const setLanguage = (lng: 'pl' | 'en') => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex h-screen bg-page">
      {/* Sidebar */}
      <div className="w-64 bg-surface shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo/Brand — header background follows the theme (paper on light, ink
              on dark), mirroring the brand "Logo · Light / Dark" panels. */}
          <div
            className="flex h-16 items-center justify-center border-b border-border-default"
            style={{ background: theme === 'dark' ? '#0C0E16' : '#F2F3F8' }}
          >
            <Logo variant="auto" markSize={34} tagline />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.key}
                  to={item.href}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                    ${
                      isActive
                        ? 'bg-state-active-bg text-state-active-text'
                        : 'text-secondary hover:bg-muted hover:text-primary'
                    }
                  `}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border-default p-4">
            {/* Theme toggle */}
            <div className="mb-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-muted px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                aria-label={theme === 'dark' ? tCommon('themeLight') : tCommon('themeDark')}
                aria-pressed={theme === 'dark'}
              >
                {theme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
                <span>{theme === 'dark' ? tCommon('themeLight') : tCommon('themeDark')}</span>
              </button>
            </div>
            {/* Language switcher */}
            <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setLanguage('pl')}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  currentLng === 'pl' ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-primary'
                }`}
                aria-label={t('polish')}
                aria-current={currentLng === 'pl' ? 'true' : undefined}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  currentLng === 'en' ? 'bg-surface text-primary shadow-sm' : 'text-tertiary hover:text-primary'
                }`}
                aria-label={t('english')}
                aria-current={currentLng === 'en' ? 'true' : undefined}
              >
                EN
              </button>
            </div>
            <div className="mb-3 text-sm">
              <p className="font-medium text-primary">{user?.email}</p>
              <p className="text-xs text-tertiary">{t('athlete')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-state-danger-bg px-3 py-2 text-sm font-medium text-state-danger-text transition-colors hover:bg-state-danger-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {tCommon('logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Main content - key forces remount on language change so all t() and formatDate use new locale */}
      <div className="flex-1 overflow-auto">
        <Outlet key={currentLng} />
      </div>
    </div>
  );
};
