
import React from 'react';
import { createRoot } from 'react-dom/client';
import './utils/leafletLoader'; // Import Leaflet before app
import App from './App';
import { LanguageProvider } from './i18n';
import { UnitsProvider } from './contexts/UnitsContext';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <LanguageProvider>
        <UnitsProvider>
          <App />
        </UnitsProvider>
      </LanguageProvider>
    </React.StrictMode>
  );
}
