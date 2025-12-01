import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import MobileScanner from './views/MobileScanner';
import { AppRoute } from './types';

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/scan')) {
        setRoute(AppRoute.SCANNER);
      } else {
        setRoute(AppRoute.DASHBOARD);
      }
    };

    // Initial check
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      {route === AppRoute.DASHBOARD && <Dashboard />}
      {route === AppRoute.SCANNER && <MobileScanner />}
    </>
  );
};

export default App;