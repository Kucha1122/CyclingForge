import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import type { RegisterRequest } from '../types/auth';

type RegisterForm = RegisterRequest & { confirmPassword: string };

export const RegisterPage = () => {
  const { register, handleSubmit, getValues, formState: { errors } } = useForm<RegisterForm>();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data: RegisterForm) => {
    setSubmitting(true);
    try {
      const { confirmPassword: _confirmPassword, ...payload } = data;
      await api.post('/users/register', payload);
      navigate('/login');
    } catch {
      // surfaced by the global axios interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page">
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-lg ring-1 ring-border-default">
        <h2 className="text-center text-2xl font-bold text-primary">
          {t('signUp')}
        </h2>
        <p className="mt-2 text-center text-secondary">
          {t('enterDetailsRegister')}
        </p>
        <form className="mt-8 mb-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary">{t('firstName')}</label>
              <input
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('placeholderFirstName')}
                {...register("firstName", { required: true })}
              />
              {errors.firstName && <span className="text-sm text-state-danger-text">{t('firstNameRequired')}</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary">{t('lastName')}</label>
              <input
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('placeholderLastName')}
                {...register("lastName", { required: true })}
              />
              {errors.lastName && <span className="text-sm text-state-danger-text">{t('lastNameRequired')}</span>}
            </div>
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-primary">{t('confirmPassword')}</label>
              <input
                type="password"
                className="rounded-lg border border-border-default bg-surface px-4 py-2 text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder={t('placeholderPassword')}
                {...register("confirmPassword", {
                  required: t('confirmPasswordRequired'),
                  validate: (value) => value === getValues('password') || t('passwordsDoNotMatch'),
                })}
              />
              {errors.confirmPassword && <span className="text-sm text-state-danger-text">{errors.confirmPassword.message}</span>}
            </div>
          </div>
          <button
            className="mt-6 w-full rounded-lg bg-accent py-3 font-bold text-accent-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting}
          >
            {submitting ? t('signingUp') : t('signUp')}
          </button>
          <p className="mt-4 text-center text-secondary">
            {t('alreadyHaveAccount')}{" "}
            <Link to="/login" className="font-medium text-accent transition-colors hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded">
              {t('signIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
