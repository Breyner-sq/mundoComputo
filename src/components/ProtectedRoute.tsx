import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type AppRole = 'administrador' | 'tecnico' | 'ventas' | 'inventario';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: AppRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !role) {
    // If the user exists but doesn't have a role yet, it's likely they're
    // in the middle of the 2FA flow. Redirect to the 2FA verification page
    // instead of root to avoid RoleRedirect sending them back to /auth.
    if (user && !role) {
      return <Navigate to="/verify-2fa" replace />;
    }

    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
