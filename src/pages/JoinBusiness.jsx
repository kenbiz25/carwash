import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { localDb } from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mail, Lock, CheckCircle2, AlertTriangle } from '@/lib/icons';
import Logo from '@/components/common/Logo';
import { toast } from 'sonner';

export default function JoinBusiness() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const token = params.get('token');

  const [status, setStatus] = useState('loading'); // loading | found | invalid | expired | accepted
  const [invitation, setInvitation] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  // Prevents double-call when onAuthStateChanged fires at same time as auth handler
  const acceptedRef = useRef(false);

  // ── 1. Load invitation by token ──────────────────────────────────
  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    (async () => {
      try {
        const invitations = await localDb.getAll('invitations');
        const inv = invitations.find((i) => i.token === token);
        if (!inv) { setStatus('invalid'); return; }

        if (inv.status === 'accepted') { setStatus('accepted'); return; }
        if (inv.expires_date && new Date(inv.expires_date) < new Date()) {
          await localDb.put('invitations', { ...inv, status: 'expired' });
          setStatus('expired');
          return;
        }
        setInvitation(inv);
        setEmail(inv.email || '');
        setStatus('found');
      } catch (err) {
        console.error(err);
        setStatus('invalid');
      }
    })();
  }, [token]);

  // ── 2. If already signed in, accept automatically ────────────────
  useEffect(() => {
    if (status !== 'found') return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) acceptInvitation(user, invitation).then(() => {});
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, invitation]);

  // ── 3. Accept invitation (update Business + mark invitation) ─────
  const acceptInvitation = async (user, inv) => {
    if (acceptedRef.current) return;
    acceptedRef.current = true;
    try {
      // Ensure user profile exists
      const existingUser = await localDb.get('users', user.uid);
      if (!existingUser) {
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

      // Add to business members
      const biz = await localDb.get('businesses', inv.business_id);
      if (biz) {
        const members = biz.members || [];
        const alreadyMember = members.some(m => m.email === user.email);
        if (!alreadyMember) {
          await localDb.put('businesses', {
            ...biz,
            members: [...members, { email: user.email, role: inv.role }],
            member_emails: [...(biz.member_emails || []), user.email.toLowerCase()],
          });
        }
      }

      // Mark invitation accepted
      await localDb.put('invitations', { ...inv, status: 'accepted' });

      // Invalidate cached business lists so Dashboard gets fresh role data
      queryClient.invalidateQueries({ queryKey: ['userBusinesses'] });

      toast.success(`Welcome to ${inv.business_name}!`);
      navigate('/Dashboard', { replace: true });
    } catch (err) {
      acceptedRef.current = false; // allow retry on error
      toast.error('Could not join the business: ' + (err?.message || err));
    }
  };

  // ── 4. Auth handlers ─────────────────────────────────────────────
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter your email and password'); return; }
    setAuthLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await acceptInvitation(cred.user, invitation);
    } catch (err) {
      const MAP = {
        'auth/user-not-found': 'No account with this email - try Create Account instead.',
        'auth/wrong-password': 'Incorrect password - try again, or reset it from the main sign-in page.',
        'auth/invalid-credential': 'That email or password is wrong - double-check both, or try Create Account if you\'re new.',
        'auth/network-request-failed': 'No internet connection - check your network and try again.',
      };
      toast.error(MAP[err.code] || err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter your email and password'); return; }
    setAuthLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await acceptInvitation(cred.user, invitation);
    } catch (err) {
      const MAP = {
        'auth/email-already-in-use': 'Email already registered - use Sign In instead.',
        'auth/weak-password': 'Password must be at least 6 characters - add a few more and try again.',
        'auth/network-request-failed': 'No internet connection - check your network and try again.',
      };
      toast.error(MAP[err.code] || err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await acceptInvitation(cred.user, invitation);
    } catch (err) {
      const MAP = {
        'auth/account-exists-with-different-credential': 'An account already exists with this email using a password instead - use Sign In above with that password.',
        'auth/network-request-failed': 'No internet connection - check your network and try again.',
        'auth/popup-blocked': 'Your browser blocked the Google sign-in popup - allow popups for this site and try again.',
      };
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(MAP[err.code] || err.message || 'Google sign-in failed');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-navy-dark via-brand-blue to-brand-blue-mid flex items-center justify-center p-4">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-brand-blue-light/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-brand-orange/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/Landing" className="mx-auto mb-4 block w-fit shadow-2xl shadow-brand-blue-mid/40 rounded-2xl">
            <Logo size="xl" />
          </Link>
          <h1 className="text-2xl font-bold text-white">BGO Shine Hub</h1>
        </div>

        <div className="bg-white dark:bg-[#1d2228] rounded-2xl shadow-2xl p-8">

          {/* Loading */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="h-10 w-10 text-brand-blue-mid animate-spin" />
              <p className="text-slate-500">Verifying invitation…</p>
            </div>
          )}

          {/* Invalid token */}
          {(status === 'invalid' || status === 'expired') && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                {status === 'expired' ? 'Invitation Expired' : 'Invalid Invitation'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {status === 'expired'
                  ? 'This invitation link has expired. Ask your manager to send a new one.'
                  : 'This invitation link is not valid. Contact your manager for a new invite.'}
              </p>
            </div>
          )}

          {/* Already accepted */}
          {status === 'accepted' && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Already Accepted</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">This invitation has already been used.</p>
              <Button
                className="mt-2 bg-gradient-to-r from-brand-blue-mid to-brand-blue-light"
                onClick={() => navigate('/Dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Valid invitation - show auth form */}
          {status === 'found' && invitation && (
            <>
              <div className="mb-6 p-4 rounded-xl bg-brand-blue-mid/10 border border-brand-blue-mid/20">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  You've been invited to join{' '}
                  <span className="font-semibold text-brand-blue-mid dark:text-brand-blue-light">
                    {invitation.business_name}
                  </span>{' '}
                  as a{' '}
                  <span className="font-semibold capitalize">{invitation.role}</span>.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={authLoading}
                onClick={handleGoogleSignIn}
                className="w-full h-11 mb-4"
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l6.19 5.238C39.909 36.485 44 31 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                {authLoading ? "Joining…" : "Continue with Google"}
              </Button>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <Tabs defaultValue="signin">
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
                  <TabsTrigger value="signup" className="flex-1">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
                      </div>
                    </div>
                    <Button type="submit" disabled={authLoading} variant="brand" className="w-full h-11">
                      {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {authLoading ? "Joining…" : "Sign In & Join"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" placeholder="you@example.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="At least 6 characters" />
                      </div>
                    </div>
                    <Button type="submit" disabled={authLoading} variant="brand" className="w-full h-11">
                      {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {authLoading ? "Joining…" : "Create Account & Join"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
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
