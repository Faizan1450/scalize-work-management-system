import React, { useState, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import axios from 'axios';

export function Login() {
  const { login, authUser } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const userIdId = useId();
  const passwordId = useId();

  // If already authenticated, skip to role select
  if (authUser) {
    navigate('/', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(userId.trim(), password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Login failed. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-black text-xl tracking-tight">SW</span>
          </div>
          <h1 className="text-2xl font-bold text-white">SWMS</h1>
          <p className="text-slate-400 text-sm mt-1">SCALive Work Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={userIdId} className="block text-xs font-medium text-slate-300 mb-1.5">
                User ID
              </label>
              <input
                id={userIdId}
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. udit.sharma"
                autoComplete="username"
                className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
              >
                {error}
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading || !userId.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors mt-2"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          No account? Contact the system owner to get access.
        </p>
      </div>
    </div>
  );
}
