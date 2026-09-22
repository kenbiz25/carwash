// Whether this user can perform manager-and-above-only actions on this
// business (pause/delete a wash, override a check-in price, etc.) - the
// owner, a member with an "owner"/"manager" role, an admin email, or a
// super-admin/admin account. Previously duplicated separately in
// WashDetails.jsx and Washes.jsx - kept here so a third copy (check-in price
// adjustment) isn't needed.
export function canManageBusiness(user, business) {
  const email = user?.email?.toLowerCase();
  if (!email) return false;
  const memberRole = business?.members?.find((m) => m.email?.toLowerCase() === email)?.role;
  return (
    business?.owner_email?.toLowerCase() === email ||
    ["owner", "manager"].includes(memberRole) ||
    business?.admin_emails?.some((e) => e?.toLowerCase() === email) ||
    user?.role === "admin"
  );
}
