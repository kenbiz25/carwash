import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { localDb } from '@/lib/localDb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Waves, Loader2, Mail, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
        'auth/user-not-found': 'No account with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
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
        'auth/email-already-in-use': 'Email already registered — use Sign In',
        'auth/weak-password': 'Password must be at least 6 characters',
      };
      toast.error(MAP[err.code] || err.message);
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
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue-mid to-brand-blue-light flex items-center justify-center mb-4 shadow-2xl shadow-brand-blue-mid/40">
            <Waves className="h-8 w-8 text-white" />
          </div>
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

          {/* Valid invitation — show auth form */}
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
                    <Button type="submit" disabled={authLoading} className="w-full h-11 bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light">
                      {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Sign In & Join
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
                    <Button type="submit" disabled={authLoading} className="w-full h-11 bg-gradient-to-r from-brand-blue-mid to-brand-blue-light hover:from-brand-blue-bright hover:to-brand-blue-light">
                      {authLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create Account & Join
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
