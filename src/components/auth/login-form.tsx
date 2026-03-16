'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginWithEmailFlow } from '@/firebase/auth/client-flow';
import { Lock, Mail, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  role: 'admin' | 'staff';
}

function getErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    default:
      return `Login failed: ${code || 'Unknown error'}`;
  }
}

export function LoginForm({ role }: LoginFormProps) {
  const [email, setEmail] = useState(role === 'admin' ? 'admin@salon.com' : 'hari@salon.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await loginWithEmailFlow(email, password);
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/staff/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err?.code || '';
      setError(getErrorMessage(code) + (err?.message ? ` (${err.message})` : ''));
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';
  const accentColor = isAdmin ? 'emerald' : 'blue';

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card */}
      <div className="bg-zinc-900/80 p-8 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-2 ${isAdmin ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
            <Lock className={`w-6 h-6 ${isAdmin ? 'text-emerald-400' : 'text-blue-400'}`} />
          </div>
          <h1 className="text-2xl font-bold text-white capitalize">{role} Login</h1>
          <p className="text-zinc-400 text-sm">
            {isAdmin ? 'Sign in to manage your salon' : 'Sign in to view your schedule'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-zinc-300">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder:text-zinc-600 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-zinc-300">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-white placeholder:text-zinc-600 text-sm outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg font-semibold text-white text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 ${
              isAdmin
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
