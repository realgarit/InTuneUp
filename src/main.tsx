import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { msalInstance } from './services/authConfig';

async function main(): Promise<void> {
  // Initialize is still required for MSAL v3+
  await msalInstance.initialize();

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