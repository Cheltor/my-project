import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../Services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setStatusMessage('');

    try {
      await API.post('/password/forgot', { email });
      setStatusMessage('If an account exists for that email address, a reset link is on the way.');
      setEmail('');
    } catch (error) {
      // Avoid leaking account existence; show same message even on failure
      setStatusMessage('If an account exists for that email address, a reset link is on the way.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md space-y-10">
        <div className="text-center">
          <h2 className="text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Forgot your password?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the email you use for CodeSoft and we&apos;ll send you a reset link.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 shadow-sm rounded-lg">
          <div>
            <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900">
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {submitting ? 'Sending reset link...' : 'Email me a reset link'}
          </button>

          <div className="text-center text-sm">
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
              Back to sign in
            </Link>
          </div>

          {statusMessage && (
            <p className="text-center text-sm text-green-600">{statusMessage}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;

