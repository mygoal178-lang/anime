import React, { useState } from 'react';
import { User, Lock, Mail, Play, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  navigate: (route: string) => void;
}

export function LoginPage({ navigate }: LoginPageProps) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState<'user' | 'register'>('user');

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'user') {
        const loggedUser = await login(email, password);
        if (loggedUser?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/home');
        }
      } else if (mode === 'register') {
        const registeredUser = await register(email, name, password);
        if (registeredUser) {
          navigate('/home');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a10] shadow-2xl backdrop-blur-xl">
        {/* Header Branding */}
        <div className="bg-[#08080c] p-6 text-center border-b border-white/5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 shadow-xl mb-3">
            <Play className="h-6 w-6 fill-white text-white ml-0.5" />
          </div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">
            Ani<span className="text-rose-500">Vault</span> Account
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {mode === 'register'
              ? 'Create a free AniVault viewer account'
              : 'Sign in to sync watchlist & watch history'}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 bg-[#08080c] p-1.5 gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('user');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
              mode === 'user' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Sign In
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMessage(null);
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-black uppercase tracking-wider rounded-full transition-all ${
              mode === 'register' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Register
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-medium text-rose-300">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-medium text-emerald-300">
              {successMessage}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Your Name or Otaku handle"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:border-rose-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:border-rose-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#08080c] py-2 pl-9 pr-3 text-xs text-white placeholder-slate-600 focus:border-rose-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-rose-600 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 hover:bg-rose-700 disabled:opacity-50 transition-all mt-2"
          >
            {isSubmitting
              ? (mode === 'register' ? 'Creating Account...' : 'Signing In...')
              : mode === 'register'
              ? 'Create Free Account'
              : 'Sign In to AniVault'}
          </button>
        </form>
      </div>
    </div>
  );
}
