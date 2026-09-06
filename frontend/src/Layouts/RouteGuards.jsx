import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ShopContext } from '../config/ShopContext';

// Shown for the brief window before the initial "am I logged in?" check
// (ShopContext's checkAuth) has resolved, so guards never redirect based
// on a guess.
const AuthLoading = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-white">
    <div className="w-8 h-8 border-2 border-(--color-green) border-t-(--color-gold) rounded-full animate-spin" />
  </div>
);

const getHomeForRole = (role) => (role === 'admin' ? '/admin/dashboard' : '/userAccount');

/**
 * Blocks logged-in users from auth pages (login, signup, etc).
 * e.g. a logged-in user typing /login into the URL bar is bounced home.
 */
export const GuestRoute = () => {
  const { user, authChecked } = useContext(ShopContext);

  if (!authChecked) return <AuthLoading />;

  if (user.isLoggedIn) {
    const role = localStorage.getItem('role');
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return <Outlet />;
};

/**
 * Requires a logged-in "user" role. Admins are redirected to the admin
 * panel instead of seeing the user account UI they have no data for.
 */
export const ProtectedRoute = () => {
  const { user, authChecked } = useContext(ShopContext);
  const location = useLocation();

  if (!authChecked) return <AuthLoading />;

  if (!user.isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (localStorage.getItem('role') === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
};

/**
 * Requires a logged-in "admin" role. Regular users are sent to their
 * own account area instead of the admin panel.
 */
export const AdminRoute = () => {
  const { user, authChecked } = useContext(ShopContext);
  const location = useLocation();

  if (!authChecked) return <AuthLoading />;

  if (!user.isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (localStorage.getItem('role') !== 'admin') {
    return <Navigate to="/userAccount" replace />;
  }

  return <Outlet />;
};
