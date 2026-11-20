import { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import type { PageRoute } from './LandingPage.tsx';

export function LoginPage({ onNavigate }: { onNavigate: (r: PageRoute) => void }) {
  const { loginWithCredentials, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginWithCredentials(email, password);
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    try {
      await loginWithGoogle();
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setBusy(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Failed');
    if (data.resetToken) {
      setResetToken(data.resetToken);
      setNotice(`Reset token issued: ${data.resetToken}`);
      setMode('reset');
    } else {
      setNotice(data.message);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error || 'Reset failed');
    setNotice('Password updated. You can now sign in.');
    setMode('login');
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => onNavigate('landing')}
            className="font-display text-lg font-bold text-white"
          >
            HIDEVERSE
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
          >
            Create Account
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-white">
          {mode === 'login' ? 'Sign In' : mode === 'forgot' ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Enter the arena with Google Sign-In or your Hideverse credentials.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200">
            {notice}
          </div>
        )}

        {mode === 'login' && (
          <>
            <button
              onClick={handleGoogle}
              disabled={busy}
              className="mt-5 w-full py-2.5 px-4 rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-semibold text-sm transition-colors"
            >
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
              <div className="flex-1 h-px bg-white/10" />
              <span>or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="player@hideverse.gg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors"
              >
                {busy ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Generate Reset Token
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full text-xs text-slate-400 hover:text-white"
            >
              Back to Sign In
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reset Token</label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm"
            >
              Update Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function RegisterPage({ onNavigate }: { onNavigate: (r: PageRoute) => void }) {
  const { registerAccount, loginWithGoogle } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await registerAccount({ username, email, password, confirmPassword, photoUrl });
      onNavigate('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => onNavigate('landing')} className="font-display text-lg font-bold text-white">
            HIDEVERSE
          </button>
          <button onClick={() => onNavigate('login')} className="text-xs font-semibold text-cyan-400 hover:text-cyan-300">
            Already Registered?
          </button>
        </div>

        <h1 className="font-display text-2xl font-bold text-white">Create Player Account</h1>
        <p className="mt-1 text-xs text-slate-400">
          Save stats, unlock cosmetics, add friends, and host 3D Hide &amp; Seek rooms.
        </p>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-200">
            {error}
          </div>
        )}

        <button
          onClick={async () => {
            setBusy(true);
            try {
              await loginWithGoogle();
              onNavigate('dashboard');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Google Sign-In failed');
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="mt-5 w-full py-2.5 px-4 rounded-lg bg-white text-slate-950 hover:bg-slate-100 font-semibold text-sm"
        >
          Sign Up with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div className="flex-1 h-px bg-white/10" />
          <span>or register with email</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Username</label>
            <input
              required
              minLength={2}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="ShadowRunner"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="you@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Profile Picture URL (optional)</label>
            <input
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              placeholder="https://..."
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors"
          >
            {busy ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
