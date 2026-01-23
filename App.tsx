
import React, { useState, useEffect } from 'react';
import Dashboard from './views/Dashboard';
import MobileScanner from './views/MobileScanner';
import { AppRoute } from './types';

const App: React.FC = () => {
  // Inicializa a rota imediatamente com base no hash para evitar "flashes" da dashboard no mobile
  const [route, setRoute] = useState<AppRoute>(() => {
    const hash = window.location.hash;
    return hash.startsWith('#/scan') ? AppRoute.SCANNER : AppRoute.DASHBOARD;
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/scan')) {
        setRoute(AppRoute.SCANNER);
      } else {
        setRoute(AppRoute.DASHBOARD);
      }
    };

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
