import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import API from '../Services/api';
import PwaBanner from './PwaBanner';
import './PwaBanner.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // State to store error messages
  const { login, user } = useAuth(); // Get login function from context
  const navigate = useNavigate();
  const [showPwaBanner, setShowPwaBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (localStorage.getItem('pwaBannerDismissed') !== 'true') {
        setShowPwaBanner(true);
      }
    });
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage(''); // Clear any previous error messages

    try {
      const formData = new FormData();
      formData.append('username', email); // Use 'username' because OAuth2PasswordRequestForm expects it
      formData.append('password', password);

      const response = await API.post('/login', formData);

      const { access_token: token } = response.data; // Extract the token from the response
      console.log('Extracted token:', token);

      // The user object will be fetched and set in the AuthContext
      login(token);

      console.log('Login initiated for:', email);
    } catch (error) {
      if (error.response?.status === 401) {
        // Show an error message if the credentials are incorrect
        setErrorMessage('Incorrect email or password. Please try again.');
      } else {
        // Handle other types of errors, if any
        setErrorMessage('An error occurred. Please try again later.');
      }
      console.error('Login error:', error.response?.data || error.message);
    }
  };

  const handleInstall = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        setDeferredPrompt(null);
        setShowPwaBanner(false);
      });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('pwaBannerDismissed', 'true');
    setShowPwaBanner(false);
  };

  return (
    <>
      <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm space-y-10">
          <div>
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Sign in to CodeSoft
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative -space-y-px rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-0 z-10 rounded-md ring-1 ring-inset ring-gray-300" />
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Email address"
                  autoComplete="email"
                  className="relative block w-full rounded-t-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-100 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Password"
                  autoComplete="current-password"
                  className="relative block w-full rounded-b-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-100 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            {errorMessage && (
              <p className="text-red-500">{errorMessage}</p>
            )}

            <div className="text-right text-sm">
              <Link to="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Forgot your password?
              </Link>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Sign in
              </button>
            </div>
          </form>

        </div>
      </div>
      {showPwaBanner && <PwaBanner onInstall={handleInstall} onDismiss={handleDismiss} />}
    </>
  );
};

export default Login;
