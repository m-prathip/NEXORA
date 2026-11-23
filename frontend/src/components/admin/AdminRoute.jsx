import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/Spinner';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const DEFAULT_ALLOWED = ['ADMIN', 'SUPER_ADMIN'];

const AdminRoute = ({ children, allowedRoles = DEFAULT_ALLOWED }) => {
  const { user, isAuth, loading } = useAuth();
  const location = useLocation();
  const hasAlertedRef = useRef(false);

  const role = (user?.role || '').toUpperCase();
  const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
  const hasAccess = isAuth && normalizedAllowed.includes(role);

  useEffect(() => {
    if (!loading && isAuth && !hasAccess && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      toast.error('Access denied: Insufficient privileges for this administration view.');
    }
  }, [loading, isAuth, hasAccess]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuth) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    // If user is a Moderator trying to access full Admin, redirect to /moderator
    if (role === 'MODERATOR') {
      return <Navigate to="/moderator" replace />;
    }
    // Normal users pushed back to student dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
