import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AppProvider } from './state/AppContext';
import { AuthProvider } from './state/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);
