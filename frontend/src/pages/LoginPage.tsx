import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { LoginRequest, AuthResultDto } from '../types/auth';

export const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');

  const onSubmit = async (data: LoginRequest) => {
    const rememberMe = data.rememberMe ?? true;
    try {
      const response = await api.post<AuthResultDto>('/users/login', { ...data, rememberMe });
      login(response.data, rememberMe);
      navigate('/dashboard');
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-lg ring-1 ring-border-default">
        <h2 className="text-center text-2xl font-bold text-primary">
          {t('login')}
        </h2>
        <p className="mt-2 text-center text-secondary">
          {t('enterDetailsLogin')}
        </p>
        <form className="mt-8 mb-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary">{t('email')}</label>
              <input
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('placeholderEmail')}
                {...register("email", { required: true })}
              />
              {errors.email && <span className="text-sm text-state-danger-text">{t('emailRequired')}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary">{t('password')}</label>
              <input
                type="password"
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('placeholderPassword')}
                {...register("password", { required: true })}
              />
              {errors.password && <span className="text-sm text-state-danger-text">{t('passwordRequired')}</span>}
            </div>
            <label className="flex items-center gap-2 text-sm text-primary">
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-border-default text-accent focus:ring-accent"
                {...register("rememberMe")}
              />
              {t('rememberMe')}
            </label>
          </div>
          <button
            className="mt-6 w-full rounded-lg bg-accent py-3 font-bold text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            type="submit"
          >
            {t('login')}
          </button>
          <p className="mt-4 text-center text-secondary">
            {t('dontHaveAccount')}{" "}
            <Link to="/register" className="font-medium text-accent transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded">
              {t('signUp')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
