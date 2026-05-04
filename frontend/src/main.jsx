import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '../styles.css';

const defaultApiBase =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : `http://${window.location.hostname}:3000`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || defaultApiBase;
const originalFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  if (typeof input === 'string' && input.startsWith('/api')) {
    return originalFetch(`${API_BASE}${input}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init.headers
      }
    });
  }

  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
