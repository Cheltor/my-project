import React, { useMemo, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import API from '../Services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const missingToken = !token;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setErrorMessage('');
    setStatusMessage('');

    if (!token) {
      setErrorMessage('Reset token is missing. Use the link from your email.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords must match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Choose a password that is at least 8 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      await API.post('/password/reset', { token, password });
      setStatusMessage('Your password has been updated. You can sign in with your new password.');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        navigate('/login');
      }, 2500);

    } catch (error) {
      const detail = error.response?.data?.detail;
      if (detail) {
        setErrorMessage(detail);
      } else {
        setErrorMessage('We were unable to reset your password. Please request a new link.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Set a new password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Strong passwords use at least 8 characters with a mix of letters, numbers, or symbols.
          </p>
        </div>
        {missingToken && (
          <p className="text-center text-sm text-red-600">
            This reset link is missing or has expired. Request a new link from the forgot password page.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm rounded-lg">
          <div>
            <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900">
              New password
            </label>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium leading-6 text-gray-900">
              Confirm password
            </label>
            <div className="mt-2">
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || missingToken}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {submitting ? 'Resetting password...' : missingToken ? 'Reset link invalid' : 'Reset password'}
          </button>

          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Return to sign in
            </Link>
          </div>

          {errorMessage && (
            <p className="text-center text-sm text-red-600">{errorMessage}</p>
          )}
          {statusMessage && (
            <p className="text-center text-sm text-green-600">{statusMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
