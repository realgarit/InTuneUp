import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { msalInstance } from './services/authConfig';

async function main(): Promise<void> {
  await msalInstance.initialize();

  // CRITICAL for redirect flow: process the auth code when Azure AD
  // redirects back to the app after login. This must complete before
  // React renders, otherwise the app renders before the account is set.
  await msalInstance.handleRedirectPromise();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void main();
