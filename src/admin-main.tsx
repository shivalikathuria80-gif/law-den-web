import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminApp } from './pages/AdminApp';
import { AuthProvider } from './auth';
import { StoreProvider } from './store';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <StoreProvider>
        <AdminApp />
      </StoreProvider>
    </AuthProvider>
  </StrictMode>,
);
