import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { setupAuthFetchInterceptor } from './utils/authFetch';
setupAuthFetchInterceptor();
createRoot(document.getElementById('root')).render(<StrictMode>
    <App />
  </StrictMode>);
