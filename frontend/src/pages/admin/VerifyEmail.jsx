import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI, verificationAPI } from '../../services/api';
import AuthShell from '../../components/admin/AuthShell';
import OtpInput from '../../components/common/OtpInput';
import { FiMail, FiCheckCircle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

// Email-verification step after signup. Email is passed via router state
// (or ?email=) so a refresh keeps context. Supports single-use link token (?token=...)
const VerifyEmail = () => {
  const { verifyEmail, completeSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const email = location.state?.email || params.get('email') || '';
  const token = params.get('token');

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);
  const tokenCheckedRef = useRef(false);

  // Auto-verify if single-use link token is present in URL
  useEffect(() => {
    if (token && !tokenCheckedRef.current) {
      tokenCheckedRef.current = true;
      setTokenVerifying(true);
      verificationAPI.verifyLink(token)
        .then((res) => {
          toast.success(res.data?.message || 'Email verified successfully!');
          if (res.data?.token) {
            completeSession(res.data);
          }
          const user = res.data?.user;
          if (user?.dashboardHash) {
            navigate(`/${user.username}-${user.dashboardHash}/profile`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Verification link expired or invalid');
        })
        .finally(() => {
          setTokenVerifying(false);
        });
    }
  }, [token, completeSession, navigate]);

  useEffect(() => {
    if (!email && !token) navigate('/auth/signup', { replace: true });
  }, [email, token, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    timer.current = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Enter the 6-digit code');
    setLoading(true);
    try {
      const res = await verifyEmail(email, code);
      toast.success('Email verified — welcome!');
      const { user: loggedInUser } = res;
      if (loggedInUser?.dashboardHash) {
        navigate(`/${loggedInUser.username}-${loggedInUser.dashboardHash}/profile`, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    try {
      // Send both via verification link and OTP
      await verificationAPI.resend(email).catch(() => {});
      await authAPI.resendOtp({ email, purpose: 'verify' });
      toast.success('A new verification email and code are on their way');
      setCooldown(60);
    } catch (err) {
      const wait = err.response?.data?.retryAfter;
      if (wait) setCooldown(wait);
      toast.error(err.response?.data?.message || 'Could not resend code');
    }
  };

  if (tokenVerifying) {
    return (
      <AuthShell
        icon={<FiLoader className="animate-spin text-primary-600" size={32} />}
        title="Verifying your account…"
        subtitle="Please wait while we validate your secure verification link."
      >
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Activating your NEXORA builder profile...
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={<FiMail size={28} />}
      title="Verify your email"
      subtitle={<>We sent a 6-digit code and secure link to <span className="font-medium text-gray-700 dark:text-gray-300">{email || 'your email'}</span></>}
      footer={<Link to="/auth/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="space-y-6">
        <OtpInput value={code} onChange={setCode} />
        <button type="submit" disabled={loading}
          className="btn-primary w-full justify-center py-3 disabled:opacity-60">
          {loading ? 'Verifying…' : 'Verify & continue'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
        Didn't get it?{' '}
        <button onClick={resend} disabled={cooldown > 0}
          className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50 disabled:no-underline">
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link & code'}
        </button>
      </p>
    </AuthShell>
  );
};

export default VerifyEmail;
