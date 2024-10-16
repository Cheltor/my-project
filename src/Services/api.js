import axios from 'axios';

const API = axios.create({
  baseURL: 'https://civicode-2eae16143963.herokuapp.com', // Adjust your backend URL
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;