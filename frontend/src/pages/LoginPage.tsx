import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { LoginRequest, AuthResultDto } from '../types/auth';

export const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginRequest>();
  const { login } = useAuth();
  const navigate = useNavigate();

  const onSubmit = async (data: LoginRequest) => {
    try {
      const response = await api.post<AuthResultDto>('/users/login', data);
      login(response.data.token, response.data);
      navigate('/dashboard');
    } catch {
      alert('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="text-center text-2xl font-bold text-blue-gray-900">
          Login
        </h2>
        <p className="mt-2 text-center text-gray-600">
          Enter your details to login.
        </p>
        <form className="mt-8 mb-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="name@mail.com"
                {...register("email", { required: true })}
              />
              {errors.email && <span className="text-sm text-red-500">Email is required</span>}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="********"
                {...register("password", { required: true })}
              />
              {errors.password && <span className="text-sm text-red-500">Password is required</span>}
            </div>
          </div>
          <button
            className="mt-6 w-full rounded-lg bg-black py-3 font-bold text-white transition-colors hover:bg-gray-800"
            type="submit"
          >
            Login
          </button>
          <p className="mt-4 text-center text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-blue-500 transition-colors hover:text-blue-700">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
