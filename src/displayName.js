// Central place for "what name do we show for this person" logic.
// Admins identify by their title (e.g. "Principal", "HOD Electrical
// Engineering") wherever a name would normally appear — students show
// their full_name as before, since they don't have titles.
export function getDisplayName(profile, fallback = 'PolyNet Student') {
  if (!profile) return fallback
  if (profile.is_admin && profile.admin_title) return profile.admin_title
  return profile.full_name || fallback
}