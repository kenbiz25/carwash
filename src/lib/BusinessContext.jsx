import { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { localDb } from '@/lib/localDb';
import { api } from '@/api/firebaseClient';
import { useAuth } from './AuthContext';

const BusinessContext = createContext(null);

// Scoped per-email so one account's branch selection is never read back as
// another account's default on a shared browser/profile.
const storageKey = (email) => `bgo_selected_business_id:${email || ""}`;
function loadStoredBusinessId(email) {
  if (!email) return null;
  try { return localStorage.getItem(storageKey(email)); } catch { return null; }
}
function saveStoredBusinessId(email, id) {
  if (!email) return;
  try { localStorage.setItem(storageKey(email), id); } catch { /* best-effort */ }
}

export function BusinessProvider({ children }) {
  const { user: authUser, isAuthenticated } = useAuth();
  const [selectedBusinessId, setSelectedBusinessIdRaw] = useState(null);

  // Persist every selection - otherwise a hard refresh silently drops back to
  // the default (oldest) branch with no warning, which for an owner mid-task
  // on a different branch means their next entry could land on the wrong one.
  const setSelectedBusinessId = (id) => {
    setSelectedBusinessIdRaw(id);
    saveStoredBusinessId(authUser?.email, id);
  };

  // Fetch the current Firebase user profile
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    enabled: isAuthenticated,
    retry: false,
  });

  // Fetch all businesses this user owns OR is a member of OR is explicitly
  // assigned to via a legacy user.business_id/business_ids field - this last
  // fallback exists because some invite-acceptance paths only set that field
  // without also updating the business's member_emails, and a user in that
  // state must still see their business here (this is the single resolver
  // every page uses; a gap here means a page thinks the user has no business
  // at all, not just a stale one).
  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ['userBusinesses', user?.email, user?.business_id, user?.business_ids],
    queryFn: async () => {
      if (!user?.email) return [];

      const email = user.email.toLowerCase();
      const all = await localDb.getAll('businesses');

      const owned = all.filter((b) => b.owner_email?.toLowerCase() === email);
      const member = all.filter((b) => Array.isArray(b.member_emails) && b.member_emails.includes(email));

      const seen = new Set(owned.map(b => b.id));
      const merged = [...owned];
      for (const b of member) {
        if (!seen.has(b.id)) { merged.push(b); seen.add(b.id); }
      }

      let assignedIds = Array.isArray(user.business_ids) ? [...user.business_ids] : [];
      if (user.business_id && !assignedIds.includes(user.business_id)) assignedIds.push(user.business_id);
      for (const id of assignedIds) {
        if (id && !seen.has(id)) {
          const biz = all.find((b) => b.id === id);
          if (biz) { merged.push(biz); seen.add(id); }
        }
      }

      // Oldest branch first - IndexedDB key order isn't insertion order, and the
      // longest-running branch is the sensible default when nothing is selected yet.
      merged.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      return merged;
    },
    enabled: !!user?.email,
  });

  // Auto-select on load: prefer whatever branch this user last had selected
  // (as long as they still have access to it), then their assigned primary,
  // then just the first branch.
  useEffect(() => {
    if (!selectedBusinessId && businesses.length > 0) {
      const storedId = loadStoredBusinessId(authUser?.email);
      const stored = storedId ? businesses.find(b => b.id === storedId) : null;
      const primary = user?.business_id
        ? businesses.find(b => b.id === user.business_id)
        : null;
      setSelectedBusinessIdRaw(stored?.id || primary?.id || businesses[0].id);
    }
  }, [businesses, user?.business_id, selectedBusinessId, authUser?.email]);

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || businesses[0] || null;
  const hasBusiness = businesses.length > 0;

  return (
    <BusinessContext.Provider value={{
      user,
      businesses,
      currentBusiness,
      selectedBusinessId,
      setSelectedBusinessId,
      hasBusiness,
      loadingBusinesses,
    }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
}
