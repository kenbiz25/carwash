import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { localDb } from '@/lib/localDb';
import { toLoginIdentifier } from '@/lib/userAdminClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, Lock, ArrowLeft, CheckCircle2 } from '@/lib/icons';
import Logo from '@/components/common/Logo';
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
      // Staff logins created by a manager/owner/super admin are plain
      // usernames under the hood, not real emails - map one to the fixed
      // internal address Firebase Auth actually stores. Sign-up always uses
      // a real email (that's a new business owner registering).
      const cred = isSignUp
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, toLoginIdentifier(email), password);
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
        'auth/user-not-found': 'No account with that email or username - check for typos, or ask your manager for your username.',
        'auth/wrong-password': 'Incorrect password - try again, or use "Forgot password?" below.',
        'auth/invalid-credential': 'That email/username or password is wrong - double-check both, or ask your manager to reset your password.',
        'auth/email-already-in-use': 'That email is already registered - try Sign In instead of Create Account.',
        'auth/weak-password': 'Password must be at least 6 characters - add a few more and try again.',
        'auth/invalid-email': 'That doesn\'t look like a valid email address - check for typos.',
        'auth/too-many-requests': 'Too many attempts - wait a minute and try again.',
        'auth/network-request-failed': 'No internet connection - check your network and try again.',
      };
      toast.error(MAP[err.code] || err.message);
    } finally {
      setLoading(false);
      signingInRef.current = false;
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    signingInRef.current = true;
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await ensureUserProfile(cred.user);
      // Only a first-time Google sign-in should behave like sign-up (checking
      // for a pending invite) - same rule the email path applies via `isSignUp`.
      if (getAdditionalUserInfo(cred)?.isNewUser) {
        const token = await findPendingInviteToken(cred.user.email);
        if (token) {
          navigate(`/JoinBusiness?token=${token}`, { replace: true });
          return;
        }
      }
      navigate(returnUrl, { replace: true });
    } catch (err) {
      const MAP = {
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a password instead - sign in with that password, or use "Forgot password?" below.',
        'auth/network-request-failed': 'No internet connection - check your network and try again.',
        'auth/popup-blocked': 'Your browser blocked the Google sign-in popup - allow popups for this site and try again.',
      };
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(MAP[err.code] || err.message);
      }
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
    // Self-service reset only makes sense for a real email account - usernames
    // and phone numbers are set up by an admin and don't have an inbox behind
    // them (the panel shown for that case never reaches this handler at all,
    // but guard here too in case someone types one straight into this field).
    if (!email.includes('@')) {
      toast.error("That's a username or phone number, not an email - ask your manager, owner, or a super admin to reset your password.");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err) {
      const MAP = {
        'auth/user-not-found': 'No account found with this email - check for typos, or Sign Up instead.',
        'auth/invalid-email': 'That doesn\'t look like a valid email address - check for typos.',
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
          <Link to="/Landing" className="mx-auto mb-4 block w-fit shadow-2xl shadow-brand-blue-mid/40 rounded-2xl">
            <Logo size="xl" />
          </Link>
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

              {email.trim() && !email.includes('@') ? (
                // Carried over a username/phone from the sign-in field - that
                // kind of login is set up and managed by an admin, so there's
                // no inbox to send a reset link to.
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <Lock className="h-10 w-10 text-brand-blue-mid" />
                  <p className="font-medium text-slate-800 dark:text-white">Contact your admin</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                    Passwords for username and phone logins are set and reset by your
                    manager, owner, or a super admin - ask them directly to reset it for you.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setMode('signin'); }}
                    className="mt-2 text-sm text-brand-blue-mid hover:text-brand-blue-bright font-medium"
                  >
                    Back to Sign In
                  </button>
                </div>
              ) : (
                <>
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
                        variant="brand" className="w-full h-11"
                      >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {loading ? "Sending…" : "Send Reset Link"}
                      </Button>
                    </form>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Sign In / Sign Up mode ── */}
          {mode !== 'forgot' && (
            <>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-6 text-center">
                {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
              </h2>

              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full h-11 mb-4 gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                {loading ? "Signing in…" : "Continue with Google"}
              </Button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{mode === 'signup' ? 'Email' : 'Email, Username, or Phone'}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type={mode === 'signup' ? 'email' : 'text'}
                      autoCapitalize="none"
                      placeholder={mode === 'signup' ? 'you@example.com' : 'you@example.com, username, or phone'}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {mode === 'signin' && (
                    <p className="text-xs text-slate-400">
                      Staff: use the username or phone number your manager gave you.
                    </p>
                  )}
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
                        {email.trim() && !email.includes('@') ? 'Forgot password? (contact admin)' : 'Forgot password?'}
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
                  variant="brand" className="w-full h-11"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loading
                    ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                    : (mode === 'signup' ? 'Create Account' : 'Sign In')}
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
