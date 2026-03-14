import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import i18n from '../i18n';

const NAV_ITEMS: { key: string; href: string; icon: string }[] = [
  { key: 'dashboard', href: '/dashboard', icon: '📊' },
  { key: 'todayWorkout', href: '/workout/today', icon: '🎯' },
  { key: 'weeklyPlan', href: '/workout/week', icon: '📅' },
  { key: 'fullPlan', href: '/workout/plan', icon: '📋' },
  { key: 'workoutLibrary', href: '/workouts', icon: '💪' },
  { key: 'activities', href: '/activities', icon: '🚴' },
  { key: 'sleep', href: '/sleep', icon: '🌙' },
  { key: 'analysis', href: '/analysis', icon: '📈' },
  { key: 'profile', href: '/profile', icon: '👤' },
];

export const Layout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
            <h1 className="text-xl font-bold text-white">{t('brand')}</h1>
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
                    ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
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
          <div className="border-t border-gray-200 p-4">
            {/* Language switcher */}
            <div className="mb-3 flex gap-1 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setLanguage('pl')}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  currentLng === 'pl' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label={t('polish')}
                aria-current={currentLng === 'pl' ? 'true' : undefined}
              >
                PL
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  currentLng === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label={t('english')}
                aria-current={currentLng === 'en' ? 'true' : undefined}
              >
                EN
              </button>
            </div>
            <div className="mb-3 text-sm">
              <p className="font-medium text-gray-900">{user?.email}</p>
              <p className="text-xs text-gray-500">{t('athlete')}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
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
