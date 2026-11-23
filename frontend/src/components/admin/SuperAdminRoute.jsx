import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../common/Spinner';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

const SuperAdminRoute = ({ children }) => {
  const { user, isAuth, loading } = useAuth();
  const location = useLocation();
  const hasAlertedRef = useRef(false);

  const role = (user?.role || '').toUpperCase();
  const isSuperAdmin = isAuth && role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!loading && isAuth && !isSuperAdmin && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      toast.error('Access Denied: Exclusive Developer / Sovereign Owner Access Required.');
    }
  }, [loading, isAuth, isSuperAdmin]);

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuth) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!isSuperAdmin) {
    // If ordinary admin, push back to standard admin dashboard; otherwise student dashboard
    if (role === 'ADMIN') {
      return <Navigate to="/admin" replace />;
    }
    if (role === 'MODERATOR') {
      return <Navigate to="/moderator" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default SuperAdminRoute;
