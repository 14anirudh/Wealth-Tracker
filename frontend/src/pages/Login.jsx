import { useState } from 'react';
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestedMode = params.get('mode');
    const tokenFromQuery = params.get('token');

    if (requestedMode === 'reset') {
      setMode('reset');
      setError('');
      setNotice('');
      if (tokenFromQuery) {
        setResetToken(tokenFromQuery);
      }
    }
  }, [location.search]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      if (mode === 'forgot') {
        if (!email) {
          setError('Email is required');
          return;
        }

        const response = await authAPI.forgotPassword({ email });
        setNotice(response.data?.message || 'If an account exists, reset instructions have been sent.');

        setMode('login');
        return;
      }

      if (mode === 'reset') {
        if (!resetToken || !password) {
          setError('Reset token and new password are required');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        const response = await authAPI.resetPassword({
          token: resetToken,
          newPassword: password,
        });

        setNotice(response.data?.message || 'Password reset successful. Please sign in.');
        setPassword('');
        setConfirmPassword('');
        setResetToken('');
        setMode('login');
        return;
      }

      if (!email || !password) {
        setError('Email and password are required');
        return;
      }

      const payload = { email, password };
      const apiCall = mode === 'login' ? authAPI.login : authAPI.register;
      const response = await apiCall(payload);
      const { token, user } = response.data;

      if (onLogin) {
        onLogin(token, user);
      }

      navigate('/dashboard');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Unable to authenticate. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/80 dark:bg-white/5 border border-dark/10 shadow-sm p-8">
        <h1 className="text-2xl font-bold text-dark mb-6 text-center">
          {mode === 'login'
            ? 'Sign in to Vision'
            : mode === 'register'
            ? 'Create your Vision account'
            : mode === 'forgot'
            ? 'Forgot password'
            : 'Reset password'}
        </h1>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
            {notice}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full border border-dark/20 bg-transparent px-3 py-2 focus:outline-none focus:border-dark"
              autoComplete="email"
            />
          </div>
          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-dark mb-1">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border border-dark/20 bg-transparent px-3 py-2 focus:outline-none focus:border-dark"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          )}
          {mode === 'reset' && (
            <>
              {!resetToken && (
                <div>
                  <label className="block text-sm font-medium text-dark mb-1">
                    Reset token
                  </label>
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    className="w-full border border-dark/20 bg-transparent px-3 py-2 focus:outline-none focus:border-dark"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-dark mb-1">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full border border-dark/20 bg-transparent px-3 py-2 focus:outline-none focus:border-dark"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#f2f2f2] text-[#161717] dark:bg-[#272727] dark:text-[#f1f1f1]  py-2 font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {submitting
              ? mode === 'login'
                ? 'Signing in...'
                : mode === 'register'
                ? 'Creating account...'
                : mode === 'forgot'
                ? 'Sending reset token...'
                : 'Resetting password...'
              : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
              ? 'Create account'
              : mode === 'forgot'
              ? 'Submit'
              : 'Reset password'}
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          {mode === 'login' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMode('forgot');
                  setError('');
                  setNotice('');
                  setPassword('');
                }}
                className="block w-full text-dark underline"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setNotice('');
                }}
                className="block w-full text-dark underline"
              >
                Create a new account
              </button>
            </div>
          )}
          {mode === 'register' && (
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setNotice('');
              }}
              className="text-dark underline"
            >
              Already have an account? Sign in
            </button>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <div className="space-y-2">
              {mode === 'reset' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setError('');
                    setNotice('');
                  }}
                  className="block w-full text-dark underline"
                >
                  Need a new reset token?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setNotice('');
                }}
                className="block w-full text-dark underline"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

