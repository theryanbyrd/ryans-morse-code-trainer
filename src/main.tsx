import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css'
import { pulse } from './lib/analytics';
import { installErrorLogging } from './lib/errorLog';
import App from './App.tsx';
import { AppProvider } from './state/AppContext';
import { AuthProvider } from './state/AuthContext';

// Before render, so a crash during the first paint is still reported.
installErrorLogging();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </StrictMode>,
);

pulse();
