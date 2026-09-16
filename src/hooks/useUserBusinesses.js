import { useQuery } from "@tanstack/react-query";
import { localDb } from "@/lib/localDb";
import { api } from "@/api/firebaseClient";

/**
 * Fetch businesses the user can access:
 * - owned (owner_email)
 * - member of (member_emails array-contains)  ← MUST use array-contains, not ==
 * - explicitly assigned (user.business_ids / user.business_id)
 */
export function useUserBusinesses(user) {
  return useQuery({
    queryKey: ["userBusinesses", user?.email, user?.business_id, user?.business_ids],
    enabled: !!user?.email,
    queryFn: async () => {
      if (!user?.email) return [];

      const email = user.email.toLowerCase();

      // 1) Businesses the user owns
      // 2) Businesses where this user is in the member_emails array
      const allBusinesses = await localDb.getAll("businesses");
      const ownedBusinesses = allBusinesses.filter((b) => b.owner_email?.toLowerCase() === email);
      const memberBusinesses = allBusinesses.filter((b) => Array.isArray(b.member_emails) && b.member_emails.includes(email));

      // 3) Explicitly assigned via profile ids (legacy support)
      let assignedIds = Array.isArray(user.business_ids) ? [...user.business_ids] : [];
      if (user.business_id && !assignedIds.includes(user.business_id)) {
        assignedIds.push(user.business_id);
      }
      assignedIds = assignedIds.filter(Boolean);

      const seenIds = new Set([
        ...ownedBusinesses.map((b) => b.id),
        ...memberBusinesses.map((b) => b.id),
      ]);

      const missingIds = assignedIds.filter((id) => !seenIds.has(id));
      const assignedBusinesses = await Promise.all(
        missingIds.map(async (id) => {
          const rows = await api.entities.Business.filter({ id });
          return rows?.[0] || null;
        })
      );

      // Merge unique - a business owner is normally also in their own member_emails,
      // so ownedBusinesses/memberBusinesses commonly overlap; dedupe by id.
      const all = [...ownedBusinesses];
      const seen = new Set(all.map((b) => b.id));
      for (const biz of [...memberBusinesses, ...assignedBusinesses]) {
        if (biz && !seen.has(biz.id)) {
          seen.add(biz.id);
          all.push(biz);
        }
      }
      // Oldest branch first - IndexedDB key order isn't insertion order, and the
      // longest-running branch is the sensible default when nothing is selected yet.
      all.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      return all;
    },
  });
}
