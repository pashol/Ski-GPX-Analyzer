
import React from 'react';
import { createRoot } from 'react-dom/client';
import './utils/leafletLoader'; // Import Leaflet before app
import App from './App';
import { LanguageProvider } from './i18n';
import { UnitsProvider } from './contexts/UnitsContext';
import { PlatformProvider } from './platform';

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <PlatformProvider>
        <LanguageProvider>
          <UnitsProvider>
            <div className="app-safe-area">
              <App />
            </div>
          </UnitsProvider>
        </LanguageProvider>
      </PlatformProvider>
    </React.StrictMode>
  );
}
