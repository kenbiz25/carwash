import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { localDb } from '@/lib/localDb';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  // Tracks whose data is currently cached, so we can tell a same-tab account
  // switch (sign in as someone else without clicking Logout first) apart from
  // a normal first load or an actual logout.
  const cachedForUid = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // React Query's ['currentUser']/['userBusinesses']/etc. caches are keyed
      // by query name, not by uid — signing in as a different account without
      // a full page reload (Login.jsx navigates client-side) would otherwise
      // keep serving the previous account's cached name, role and businesses
      // until something happened to touch those exact query keys. Wipe the
      // cache on any actual uid change so the new session starts clean.
      if (firebaseUser?.uid !== cachedForUid.current) {
        queryClientInstance.clear();
        cachedForUid.current = firebaseUser?.uid || null;
      }

      if (firebaseUser) {
        try {
          const profile = (await localDb.get('users', firebaseUser.uid)) || {};
          setUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            full_name: profile.full_name || firebaseUser.displayName || '',
            avatar_url: profile.avatar_url || firebaseUser.photoURL || '',
            ...profile,
          });
          setIsAuthenticated(true);
        } catch {
          setUser({
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            email: firebaseUser.email,
          });
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    window.location.href = '/Login';
  };

  const navigateToLogin = () => {
    window.location.href = '/Login';
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      // Keep these props so existing consumers don't break
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      checkAppState: async () => {},
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
