import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/Spinner';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const ADMIN_ROLES = ['MODERATOR', 'ADMIN', 'SUPER_ADMIN'];

const AdminRoute = ({ children }) => {
  const { user, isAuth, loading } = useAuth();
  const location = useLocation();
  const hasAlertedRef = useRef(false);

  const role = (user?.role || '').toUpperCase();
  const hasAdminAccess = isAuth && ADMIN_ROLES.includes(role);

  useEffect(() => {
    if (!loading && isAuth && !hasAdminAccess && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      toast.error('Access denied: Staff / Administrator privileges required.');
    }
  }, [loading, isAuth, hasAdminAccess]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuth) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
