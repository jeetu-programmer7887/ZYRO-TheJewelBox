// Shared "you're now logged in" step for every login path (password,
// Google, email verification, admin code). Navigating first and then
// updating the user avoids the guest-only route bouncing the customer to
// their account page, and avoids a full page reload.
export const getRedirectTarget = (location, fallback = '/') => {
  const state = location?.state || {};
  const from = state.from;
  const fromPath = from && typeof from === 'object'
    ? `${from.pathname || ''}${from.search || ''}`
    : null;
  const target = state.redirectTo || fromPath || fallback;
  // Never send people back to an auth page after logging in
  return /^\/(login|signup|verify-email|forgot-password|reset-password)/.test(target) ? fallback : target;
};

export const completeLogin = ({ role, data, setUser, navigate, destination }) => {
  try { localStorage.setItem('role', role); } catch { /* ignore */ }
  navigate(destination, { replace: true });
  setUser({
    ...data,
    username: data?.username || (role === 'admin' ? 'ADMIN PANEL' : ''),
    email: data?.email,
    isLoggedIn: true,
  });
};
