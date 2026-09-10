import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { localDb } from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, Waves, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// mode: 'signin' | 'signup' | 'forgot'
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('signin');
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const returnUrl = new URLSearchParams(window.location.search).get('returnUrl') || '/Dashboard';
  // Prevents onAuthStateChanged from double-navigating while handleEmailAuth is running
  const signingInRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !signingInRef.current) navigate(returnUrl, { replace: true });
    });
    return unsub;
  }, [navigate, returnUrl]);

  const findPendingInviteToken = async (email) => {
    const invitations = await localDb.getAll('invitations');
    const pending = invitations.find((inv) => inv.email === email && inv.status === 'pending');
    return pending?.token || null;
  };

  const ensureUserProfile = async (user) => {
    const existing = await localDb.get('users', user.uid);
    if (!existing) {
      await localDb.put('users', {
        id: user.uid,
        uid: user.uid,
        email: user.email,
        full_name: user.displayName || user.email?.split('@')[0] || '',
        avatar_url: user.photoURL || '',
        role: 'user',
        created_date: new Date().toISOString(),
      });
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter your email and password');
      return;
    }
    setLoading(true);
    signingInRef.current = true;
    try {
      const isSignUp = mode === 'signup';
      const cred = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      await ensureUserProfile(cred.user);
      if (isSignUp) {
        const token = await findPendingInviteToken(cred.user.email);
        if (token) {
          navigate(`/JoinBusiness?token=${token}`, { replace: true });
          return;
        }
      }
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const MAP = {
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/email-already-in-use': 'Email is already registered',
        'auth/weak-password': 'Password must be at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
      };
      toast.error(MAP[err.code] || err.message);
    } finally {
      setLoading(false);
      signingInRef.current = false;
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Enter your email address first');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      const MAP = {
        'auth/user-not-found': 'No account found with this email',
        'auth/invalid-email': 'Invalid email address',
      };
      toast.error(MAP[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-dark via-brand-blue to-brand-blue-mid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative water-wave circles */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-blue-light/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue-mid to-brand-blue-light flex items-center justify-center mb-4 shadow-2xl shadow-brand-blue-mid/40">
            <Waves className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BGO Shine Hub</h1>
          <p className="text-brand-blue-pale mt-1 text-sm">Car Wash Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1d2228] rounded-2xl shadow-2xl p-8">

          {/* ── Forgot Password mode ── */}
          {mode === 'forgot' && (
            <>
              <button
                type="button"
                onClick={() => { setMode('signin'); setResetSent(false); }}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-blue-mid mb-4 -mt-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </button>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-1">Reset Password</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Enter your email and we'll send you a reset link.
              </p>

              {resetSent ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="font-medium text-slate-800 dark:text-white">Reset email sent!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Check your inbox for the password reset link.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); setResetSent(false); setEmail(''); }}
                    className="mt-2 text-sm text-brand-blue-mid hover:text-brand-blue-bright font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              )}
            </>
          )}

          {/* ── Sign In / Sign Up mode ── */}
          {mode !== 'forgot' && (
            <>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 text-center">
                {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-brand-blue-mid hover:text-brand-blue-bright"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {mode === 'signup' ? 'Create Account' : 'Sign In'}
                </Button>
              </form>

              <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
                  className="text-brand-blue-mid hover:text-brand-blue-bright font-medium"
                >
                  {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </>
          )}
        </div>

        <p className="text-center text-brand-blue-pale/60 text-xs mt-6">
          © {new Date().getFullYear()} BGO Shine Hub · Kenya
        </p>
      </div>
    </div>
  );
}
