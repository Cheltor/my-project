import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

API.interceptors.request.use(
  (config) => {
    const tcsrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrfToken'))
      ?.split('=')[1];
    if (tcsrfToken) {
      config.headers['X-CSRF-Token'] = tcsrfToken;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default API;