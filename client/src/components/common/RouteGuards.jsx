import { Navigate, useLocation } from "react-router-dom";
import useAuthStore from "@/stores/authStore";
import { ROLE_DASHBOARD_PATHS } from "@/lib/constants";
import { Spinner } from "@/components/ui/Elements";

/**
 * Protects routes that require authentication.
 * Redirects to /login if not authenticated.
 */
export function RequireAuth({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * Restricts access to specific roles.
 * Redirects to the user's own dashboard if role doesn't match.
 */
export function RequireRole({ roles, children }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    const redirectPath = user ? (ROLE_DASHBOARD_PATHS[user.role] || "/") : "/login";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}

/**
 * Redirects authenticated users away from auth pages (login, register).
 * Sends them to their role-specific dashboard.
 */
export function RedirectIfAuth({ children }) {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={ROLE_DASHBOARD_PATHS[user.role] || "/"} replace />;
  }

  return children;
}
