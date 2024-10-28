import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL, // Adjust your backend URL
});

console.log("API Base URL:", process.env.REACT_APP_API_URL);


API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;